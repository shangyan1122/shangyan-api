import { Injectable, Logger } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'
import * as bcrypt from 'bcrypt'
import * as jwt from 'jsonwebtoken'
import { SmsService } from '@/services/sms.service'

// 模拟验证码存储（生产环境应使用Redis）
const verificationCodes = new Map<string, { code: string; expireTime: number; count: number }>()

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name)
  private readonly jwtSecret = process.env.JWT_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production')
    }
    // 开发环境使用默认值，但会发出警告
    console.warn('⚠️ 使用默认 JWT Secret，请设置 JWT_SECRET 环境变量')
    return 'shangyan-admin-secret-key-2024-dev-only'
  })()
  private readonly codeExpireMinutes = 5
  private readonly maxSendCount = 5  // 每小时最多发送次数

  constructor(private readonly smsService: SmsService) {}

  /**
   * 发送登录验证码
   */
  async sendLoginCode(phone: string): Promise<{ code: number; msg: string; data: null }> {
    this.logger.log(`发送登录验证码: phone=${phone}`)

    // 验证手机号格式
    if (!this.smsService.isValidPhone(phone)) {
      return { code: 400, msg: '手机号格式不正确', data: null }
    }

    // 检查发送频率限制
    const stored = verificationCodes.get(phone)
    if (stored && stored.count >= this.maxSendCount) {
      const remainingTime = Math.ceil((stored.expireTime - Date.now()) / 1000 / 60)
      return { code: 429, msg: `发送次数过多，请${remainingTime}分钟后再试`, data: null }
    }

    // 生成6位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expireTime = Date.now() + this.codeExpireMinutes * 60 * 1000

    // 存储验证码
    verificationCodes.set(phone, {
      code,
      expireTime,
      count: (stored?.count || 0) + 1
    })

    // 调用短信服务发送验证码
    const result = await this.smsService.sendVerificationCode(phone, code)

    if (result.success) {
      this.logger.log(`验证码已发送: phone=${phone}, code=${code}`)
      return {
        code: 200,
        msg: result.msg,
        data: null
      }
    } else {
      this.logger.error(`验证码发送失败: ${result.msg}`)
      // 发送失败，清除计数
      if (stored) {
        verificationCodes.set(phone, { ...stored, count: stored.count - 1 })
      }
      return {
        code: 500,
        msg: result.msg,
        data: null
      }
    }
  }

  /**
   * 管理员登录
   */
  async login(phone: string, code: string): Promise<{ code: number; msg: string; data: { token: string; user: any } | null }> {
    this.logger.log(`管理员登录: phone=${phone}`)

    // 验证验证码
    const storedCode = verificationCodes.get(phone)
    if (!storedCode) {
      return { code: 400, msg: '请先获取验证码', data: null }
    }

    if (Date.now() > storedCode.expireTime) {
      verificationCodes.delete(phone)
      return { code: 400, msg: '验证码已过期，请重新获取', data: null }
    }

    if (storedCode.code !== code) {
      return { code: 400, msg: '验证码错误', data: null }
    }

    // 验证码验证通过，删除已使用的验证码
    verificationCodes.delete(phone)

    // 查询管理员
    const client = getSupabaseClient()
    const { data: admin, error } = await client
      .from('admins')
      .select('*')
      .eq('phone', phone)
      .single()

    if (error || !admin) {
      // 管理员不存在，拒绝登录（不再自动注册）
      this.logger.warn(`管理员不存在: phone=${phone}`)
      return { code: 403, msg: '该手机号未注册为管理员，请联系总管理员添加', data: null }
    }

    // 生成Token
    const token = this.generateToken(admin)

    this.logger.log(`管理员登录成功: phone=${phone}, id=${admin.id}`)
    return {
      code: 200,
      msg: '登录成功',
      data: {
        token,
        user: {
          id: admin.id,
          phone: admin.phone,
          name: admin.name,
          role: admin.role
        }
      }
    }
  }

  /**
   * 获取管理员信息
   */
  async getProfile(adminId: string): Promise<{ code: number; msg: string; data: any }> {
    const client = getSupabaseClient()
    const { data: admin, error } = await client
      .from('admins')
      .select('id, phone, name, role, created_at')
      .eq('id', adminId)
      .single()

    if (error || !admin) {
      return { code: 404, msg: '管理员不存在', data: null }
    }

    return { code: 200, msg: 'success', data: admin }
  }

  /**
   * 生成JWT Token
   */
  private generateToken(admin: any): string {
    return jwt.sign(
      {
        id: admin.id,
        phone: admin.phone,
        role: admin.role
      },
      this.jwtSecret,
      { expiresIn: '7d' }
    )
  }

  /**
   * 验证Token
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret)
    } catch {
      return null
    }
  }

  /**
   * 初始化总管理员
   * 如果 admins 表中没有超级管理员，自动创建
   */
  async initializeSuperAdmin(): Promise<void> {
    const client = getSupabaseClient()

    // 检查是否已有超级管理员
    const { data: existing } = await client
      .from('admins')
      .select('id')
      .eq('role', 'super_admin')
      .limit(1)

    if (existing && existing.length > 0) {
      return
    }

    // 创建总管理员 19503511949
    const superPhone = '19503511949'
    const { data: existingAdmin } = await client
      .from('admins')
      .select('id')
      .eq('phone', superPhone)
      .single()

    if (existingAdmin) {
      // 如果手机号已存在但不是超级管理员，升级角色
      await client
        .from('admins')
        .update({
          role: 'super_admin',
          permissions: ['*'],
          name: '总管理员'
        })
        .eq('id', existingAdmin.id)
      this.logger.log('已将现有管理员升级为超级管理员')
      return
    }

    // 创建新的超级管理员
    const { error } = await client
      .from('admins')
      .insert({
        phone: superPhone,
        name: '总管理员',
        role: 'super_admin',
        permissions: ['*'],
        created_at: new Date().toISOString()
      })

    if (error) {
      this.logger.error(`初始化总管理员失败: ${error.message}`)
    } else {
      this.logger.log('总管理员初始化成功: 19503511949')
    }
  }

  /**
   * 获取管理员列表
   */
  async getAdminList(params: {
    page?: number
    pageSize?: number
    search?: string
  }): Promise<{ code: number; msg: string; data: { list: any[]; total: number } }> {
    const { page = 1, pageSize = 10, search } = params
    const client = getSupabaseClient()

    let query = client
      .from('admins')
      .select('id, phone, name, role, permissions, created_at', { count: 'exact' })

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to).order('created_at', { ascending: false })

    const { data: admins, error, count } = await query

    if (error) {
      this.logger.error(`获取管理员列表失败: ${error.message}`)
      return { code: 500, msg: '查询失败', data: { list: [], total: 0 } }
    }

    const roleMap: Record<string, string> = {
      super_admin: '超级管理员',
      admin: '普通管理员',
      customer_service: '客服人员',
      finance: '财务人员'
    }

    const list = (admins || []).map(admin => ({
      id: admin.id,
      phone: admin.phone,
      name: admin.name,
      role: admin.role,
      roleName: roleMap[admin.role] || admin.role,
      permissions: admin.permissions || [],
      createdAt: admin.created_at
    }))

    return { code: 200, msg: 'success', data: { list, total: count || 0 } }
  }

  /**
   * 添加管理员（仅超级管理员可操作）
   */
  async addAdmin(params: {
    phone: string
    name: string
    role: string
  }): Promise<{ code: number; msg: string; data: any }> {
    const { phone, name, role } = params
    const client = getSupabaseClient()

    // 检查手机号是否已存在
    const { data: existing } = await client
      .from('admins')
      .select('id')
      .eq('phone', phone)
      .single()

    if (existing) {
      return { code: 400, msg: '该手机号已是管理员', data: null }
    }

    // 获取角色对应的权限
    const rolePermissionsMap: Record<string, string[]> = {
      super_admin: ['*'],
      admin: ['banquet:read', 'banquet:write', 'user:read', 'order:read', 'order:write', 'product:read', 'finance:read'],
      customer_service: ['banquet:read', 'user:read', 'order:read'],
      finance: ['order:read', 'finance:read', 'finance:write']
    }

    const { data: created, error } = await client
      .from('admins')
      .insert({
        phone,
        name,
        role,
        permissions: rolePermissionsMap[role] || [],
        created_at: new Date().toISOString()
      })
      .select('id, phone, name, role, created_at')
      .single()

    if (error) {
      this.logger.error(`添加管理员失败: ${error.message}`)
      return { code: 500, msg: '添加失败', data: null }
    }

    this.logger.log(`添加管理员成功: phone=${phone}, role=${role}`)
    return { code: 200, msg: '添加成功', data: created }
  }

  /**
   * 删除管理员（仅超级管理员可操作，不能删除自己）
   */
  async deleteAdmin(adminId: string, operatorId: string): Promise<{ code: number; msg: string; data: null }> {
    if (adminId === operatorId) {
      return { code: 400, msg: '不能删除自己', data: null }
    }

    const client = getSupabaseClient()

    // 检查目标是否是超级管理员
    const { data: target } = await client
      .from('admins')
      .select('role')
      .eq('id', adminId)
      .single()

    if (target?.role === 'super_admin') {
      // 检查是否还有其他超级管理员
      const { data: superAdmins } = await client
        .from('admins')
        .select('id')
        .eq('role', 'super_admin')

      if (!superAdmins || superAdmins.length <= 1) {
        return { code: 400, msg: '至少需要保留一个超级管理员', data: null }
      }
    }

    const { error } = await client
      .from('admins')
      .delete()
      .eq('id', adminId)

    if (error) {
      this.logger.error(`删除管理员失败: ${error.message}`)
      return { code: 500, msg: '删除失败', data: null }
    }

    this.logger.log(`删除管理员成功: id=${adminId}`)
    return { code: 200, msg: '删除成功', data: null }
  }

  /**
   * 修改管理员角色（仅超级管理员可操作）
   */
  async updateAdminRole(adminId: string, role: string): Promise<{ code: number; msg: string; data: null }> {
    const rolePermissionsMap: Record<string, string[]> = {
      super_admin: ['*'],
      admin: ['banquet:read', 'banquet:write', 'user:read', 'order:read', 'order:write', 'product:read', 'finance:read'],
      customer_service: ['banquet:read', 'user:read', 'order:read'],
      finance: ['order:read', 'finance:read', 'finance:write']
    }

    const client = getSupabaseClient()
    const { error } = await client
      .from('admins')
      .update({
        role,
        permissions: rolePermissionsMap[role] || []
      })
      .eq('id', adminId)

    if (error) {
      this.logger.error(`修改管理员角色失败: ${error.message}`)
      return { code: 500, msg: '修改失败', data: null }
    }

    this.logger.log(`修改管理员角色成功: id=${adminId}, role=${role}`)
    return { code: 200, msg: '修改成功', data: null }
  }
}
