import { Injectable, Logger } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'

// 权限定义
export const PERMISSIONS = {
  // 宴会管理
  BANQUET_READ: 'banquet:read',
  BANQUET_WRITE: 'banquet:write',

  // 用户管理
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',

  // 订单管理
  ORDER_READ: 'order:read',
  ORDER_WRITE: 'order:write',

  // 商品管理
  PRODUCT_READ: 'product:read',
  PRODUCT_WRITE: 'product:write',

  // 财务管理
  FINANCE_READ: 'finance:read',
  FINANCE_WRITE: 'finance:write',

  // 数据统计
  STATS_READ: 'stats:read',

  // 系统设置
  SYSTEM_WRITE: 'system:write',

  // 超级权限
  SUPER_ADMIN: '*'
} as const

// 角色定义
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  CUSTOMER_SERVICE: 'customer_service',
  FINANCE: 'finance'
} as const

interface Role {
  id: string
  name: string
  code: string
  description: string
  permissions: string[]
}

interface Permission {
  id: string
  name: string
  code: string
  module: string
  description: string
}

/**
 * 权限管理服务
 */
@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name)
  private client = getSupabaseClient()

  /**
   * 获取所有角色
   */
  async getRoles(): Promise<Role[]> {
    const { data, error } = await this.client
      .from('admin_roles')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      this.logger.error(`获取角色列表失败: ${error.message}`)
      return []
    }

    return data || []
  }

  /**
   * 获取角色详情
   */
  async getRoleByCode(code: string): Promise<Role | null> {
    const { data, error } = await this.client
      .from('admin_roles')
      .select('*')
      .eq('code', code)
      .single()

    if (error) {
      this.logger.error(`获取角色失败: ${error.message}`)
      return null
    }

    return data
  }

  /**
   * 获取所有权限
   */
  async getPermissions(): Promise<Permission[]> {
    const { data, error } = await this.client
      .from('admin_permissions')
      .select('*')
      .order('module', { ascending: true })

    if (error) {
      this.logger.error(`获取权限列表失败: ${error.message}`)
      return []
    }

    return data || []
  }

  /**
   * 获取角色的权限
   */
  async getRolePermissions(roleId: string): Promise<string[]> {
    // 1. 获取角色的权限ID列表
    const { data: rolePermissions, error } = await this.client
      .from('admin_role_permissions')
      .select('permission_id')
      .eq('role_id', roleId)

    if (error) {
      this.logger.error(`获取角色权限失败: ${error.message}`)
      return []
    }

    if (!rolePermissions || rolePermissions.length === 0) {
      return []
    }

    // 2. 获取权限的详细信息
    const permissionIds = rolePermissions.map(item => item.permission_id)
    const { data: permissions, error: permError } = await this.client
      .from('admin_permissions')
      .select('code')
      .in('id', permissionIds)

    if (permError) {
      this.logger.error(`获取权限代码失败: ${permError.message}`)
      return []
    }

    return permissions?.map(item => item.code).filter(Boolean) || []
  }

  /**
   * 检查用户是否有指定权限
   */
  async hasPermission(adminId: string, permission: string): Promise<boolean> {
    // 1. 获取用户信息
    const { data: admin, error } = await this.client
      .from('admins')
      .select('role, permissions')
      .eq('id', adminId)
      .single()

    if (error || !admin) {
      return false
    }

    // 2. 超级管理员拥有所有权限
    if (admin.permissions?.includes(PERMISSIONS.SUPER_ADMIN)) {
      return true
    }

    // 3. 检查用户是否有指定权限
    return admin.permissions?.includes(permission) || false
  }

  /**
   * 获取用户的所有权限
   */
  async getUserPermissions(adminId: string): Promise<string[]> {
    const { data: admin, error } = await this.client
      .from('admins')
      .select('role, permissions')
      .eq('id', adminId)
      .single()

    if (error || !admin) {
      return []
    }

    return admin.permissions || []
  }

  /**
   * 分配角色给用户
   */
  async assignRole(adminId: string, roleCode: string): Promise<boolean> {
    // 1. 获取角色
    const role = await this.getRoleByCode(roleCode)
    if (!role) {
      this.logger.error(`角色不存在: ${roleCode}`)
      return false
    }

    // 2. 更新用户角色
    const { error } = await this.client
      .from('admins')
      .update({
        role: roleCode,
        permissions: role.permissions
      })
      .eq('id', adminId)

    if (error) {
      this.logger.error(`分配角色失败: ${error.message}`)
      return false
    }

    this.logger.log(`用户 ${adminId} 分配角色 ${roleCode} 成功`)
    return true
  }

  /**
   * 创建角色
   */
  async createRole(roleData: {
    name: string
    code: string
    description: string
    permissions: string[]
  }): Promise<boolean> {
    const { error } = await this.client
      .from('admin_roles')
      .insert(roleData)

    if (error) {
      this.logger.error(`创建角色失败: ${error.message}`)
      return false
    }

    this.logger.log(`创建角色 ${roleData.code} 成功`)
    return true
  }

  /**
   * 更新角色
   */
  async updateRole(roleId: string, roleData: {
    name?: string
    description?: string
    permissions?: string[]
  }): Promise<boolean> {
    const { error } = await this.client
      .from('admin_roles')
      .update(roleData)
      .eq('id', roleId)

    if (error) {
      this.logger.error(`更新角色失败: ${error.message}`)
      return false
    }

    this.logger.log(`更新角色 ${roleId} 成功`)
    return true
  }

  /**
   * 删除角色
   */
  async deleteRole(roleId: string): Promise<boolean> {
    const { error } = await this.client
      .from('admin_roles')
      .delete()
      .eq('id', roleId)

    if (error) {
      this.logger.error(`删除角色失败: ${error.message}`)
      return false
    }

    this.logger.log(`删除角色 ${roleId} 成功`)
    return true
  }
}
