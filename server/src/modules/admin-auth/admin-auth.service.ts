import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { TencentSmsService } from '@/common/services/tencent-sms.service';
import * as jwt from 'jsonwebtoken';

// 验证码存储（生产环境应使用Redis）
interface VerificationCode {
  code: string;
  expireTime: number;
  attempts: number; // 验证尝试次数
}
const verificationCodes = new Map<string, VerificationCode>();

// 授权管理员手机号（从环境变量读取）
const ALLOWED_ADMIN_PHONES = new Set<string>();

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);
  private readonly jwtSecret: string;
  private readonly codeExpireMinutes = 5;
  private readonly maxCodeAttempts = 5; // 验证码最多尝试5次
  private readonly codeCleanInterval = 60000; // 1分钟清理过期验证码

  constructor(
    private configService: ConfigService,
    private smsService: TencentSmsService
  ) {
    // 从环境变量读取配置
    this.jwtSecret =
      this.configService.get<string>('JWT_SECRET') || 'shangyan-admin-secret-key-2024';

    // 读取授权手机号列表
    const allowedPhones = this.configService.get<string>('ADMIN_ALLOWED_PHONES') || '';
    if (allowedPhones) {
      allowedPhones.split(',').forEach((phone) => {
        const trimmed = phone.trim();
        if (trimmed) {
          ALLOWED_ADMIN_PHONES.add(trimmed);
        }
      });
    }

    // 如果没有配置授权手机号，允许所有手机号登录（开发模式）
    if (ALLOWED_ADMIN_PHONES.size === 0) {
      this.logger.warn('⚠️ 未配置 ADMIN_ALLOWED_PHONES，允许所有手机号登录（开发模式）');
    } else {
      this.logger.log(`✅ 已加载 ${ALLOWED_ADMIN_PHONES.size} 个授权管理员手机号`);
    }

    // 启动定时清理过期验证码
    this.startCodeCleanup();
  }

  /**
   * 定时清理过期验证码
   */
  private startCodeCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [phone, data] of verificationCodes.entries()) {
        if (now > data.expireTime) {
          verificationCodes.delete(phone);
        }
      }
    }, this.codeCleanInterval);
  }

  /**
   * 检查手机号是否授权
   */
  private isPhoneAuthorized(phone: string): boolean {
    // 如果没有配置授权列表，允许所有手机号
    if (ALLOWED_ADMIN_PHONES.size === 0) {
      return true;
    }
    return ALLOWED_ADMIN_PHONES.has(phone);
  }

  /**
   * 获取授权手机号列表
   */
  getAuthorizedPhones(): string[] {
    return Array.from(ALLOWED_ADMIN_PHONES);
  }

  /**
   * 发送登录验证码
   */
  async sendLoginCode(phone: string): Promise<{ code: number; msg: string; data: null }> {
    this.logger.log(`发送登录验证码请求: phone=${phone}`);

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return { code: 400, msg: '请输入正确的手机号', data: null };
    }

    // 检查是否授权
    if (!this.isPhoneAuthorized(phone)) {
      this.logger.warn(`未授权手机号尝试登录: phone=${phone}`);
      return { code: 403, msg: '该手机号未授权登录管理后台', data: null };
    }

    // 检查发送频率
    const existingCode = verificationCodes.get(phone);
    if (existingCode && Date.now() - existingCode.expireTime < -60000) {
      const remainingSeconds = Math.ceil((60000 - (Date.now() - existingCode.expireTime)) / 1000);
      if (remainingSeconds > 0) {
        return { code: 429, msg: `请${remainingSeconds}秒后再试`, data: null };
      }
    }

    // 生成6位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expireTime = Date.now() + this.codeExpireMinutes * 60 * 1000;

    // 存储验证码
    verificationCodes.set(phone, { code, expireTime, attempts: 0 });

    // 发送短信
    const smsResult = await this.smsService.sendLoginCode(phone, code);

    if (!smsResult.success) {
      this.logger.error(`发送验证码失败: ${smsResult.error}`);
      // 即使短信发送失败，也返回成功（防止暴力猜测手机号是否存在）
      // 实际业务中可根据需求调整
      return { code: 200, msg: '验证码已发送', data: null };
    }

    this.logger.log(`验证码已发送: phone=${phone}, code=${code}`);
    return { code: 200, msg: '验证码已发送', data: null };
  }

  /**
   * 管理员登录
   */
  async login(
    phone: string,
    code: string
  ): Promise<{ code: number; msg: string; data: { token: string; user: any } | null }> {
    this.logger.log(`管理员登录: phone=${phone}`);

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return { code: 400, msg: '手机号格式不正确', data: null };
    }

    // 验证验证码格式
    if (!/^\d{6}$/.test(code)) {
      return { code: 400, msg: '验证码为6位数字', data: null };
    }

    // 检查是否授权
    if (!this.isPhoneAuthorized(phone)) {
      this.logger.warn(`未授权手机号尝试登录: phone=${phone}`);
      return { code: 403, msg: '该手机号未授权登录管理后台', data: null };
    }

    // 获取存储的验证码
    const storedCode = verificationCodes.get(phone);

    if (!storedCode) {
      return { code: 400, msg: '请先获取验证码', data: null };
    }

    // 检查验证码是否过期
    if (Date.now() > storedCode.expireTime) {
      verificationCodes.delete(phone);
      return { code: 400, msg: '验证码已过期，请重新获取', data: null };
    }

    // 检查验证尝试次数
    storedCode.attempts++;
    if (storedCode.attempts > this.maxCodeAttempts) {
      verificationCodes.delete(phone);
      return { code: 400, msg: '验证次数过多，请重新获取验证码', data: null };
    }

    // 验证验证码
    if (storedCode.code !== code) {
      const remainingAttempts = this.maxCodeAttempts - storedCode.attempts;
      this.logger.warn(`验证码错误: phone=${phone}, 剩余尝试次数=${remainingAttempts}`);
      return {
        code: 400,
        msg:
          remainingAttempts > 0
            ? `验证码错误，剩余${remainingAttempts}次机会`
            : '验证次数过多，请重新获取验证码',
        data: null,
      };
    }

    // 验证码验证通过，删除已使用的验证码
    verificationCodes.delete(phone);

    // 查询或创建管理员
    const admin = await this.findOrCreateAdmin(phone);

    if (!admin) {
      return { code: 500, msg: '登录失败', data: null };
    }

    // 生成Token
    const token = this.generateToken(admin);

    this.logger.log(`管理员登录成功: phone=${phone}, id=${admin.id}`);
    return {
      code: 200,
      msg: '登录成功',
      data: {
        token,
        user: {
          id: admin.id,
          phone: admin.phone,
          name: admin.name,
          role: admin.role,
        },
      },
    };
  }

  /**
   * 查询或创建管理员
   */
  private async findOrCreateAdmin(phone: string) {
    const client = getSupabaseClient();

    // 查询管理员
    const { data: admin, error } = await client
      .from('admins')
      .select('*')
      .eq('phone', phone)
      .single();

    if (!error && admin) {
      return admin;
    }

    // 创建新管理员
    const newAdmin = {
      phone,
      name: `管理员${phone.slice(-4)}`,
      role: 'admin',
      status: 'active',
      created_at: new Date().toISOString(),
    };

    const { data: created, error: createError } = await client
      .from('admins')
      .insert(newAdmin)
      .select()
      .single();

    if (createError) {
      this.logger.error(`创建管理员失败: ${createError.message}`);
      return null;
    }

    return created;
  }

  /**
   * 获取管理员信息
   */
  async getProfile(adminId: string): Promise<{ code: number; msg: string; data: any }> {
    const client = getSupabaseClient();
    const { data: admin, error } = await client
      .from('admins')
      .select('id, phone, name, role, status, created_at')
      .eq('id', adminId)
      .single();

    if (error || !admin) {
      return { code: 404, msg: '管理员不存在', data: null };
    }

    return { code: 200, msg: 'success', data: admin };
  }

  /**
   * 获取管理员列表（仅超级管理员）
   */
  async getAdminList(): Promise<{ code: number; msg: string; data: any[] }> {
    const client = getSupabaseClient();
    const { data: admins, error } = await client
      .from('admins')
      .select('id, phone, name, role, status, created_at, last_login_at')
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('查询管理员列表失败:', error);
      return { code: 500, msg: '查询失败', data: [] };
    }

    return { code: 200, msg: 'success', data: admins || [] };
  }

  /**
   * 更新管理员信息
   */
  async updateAdmin(
    adminId: string,
    updates: { name?: string; role?: string; status?: string }
  ): Promise<{ code: number; msg: string }> {
    const client = getSupabaseClient();
    const { error } = await client
      .from('admins')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', adminId);

    if (error) {
      this.logger.error(`更新管理员失败: ${error.message}`);
      return { code: 500, msg: '更新失败' };
    }

    return { code: 200, msg: '更新成功' };
  }

  /**
   * 生成JWT Token
   */
  private generateToken(admin: any): string {
    return jwt.sign(
      {
        id: admin.id,
        phone: admin.phone,
        role: admin.role,
      },
      this.jwtSecret,
      { expiresIn: '7d' }
    );
  }

  /**
   * 验证Token
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch {
      return null;
    }
  }

  /**
   * 刷新Token
   */
  async refreshToken(
    token: string
  ): Promise<{ code: number; msg: string; data: { token: string } | null }> {
    const decoded = this.verifyToken(token);
    if (!decoded) {
      return { code: 401, msg: 'Token无效', data: null };
    }

    // 查询管理员
    const client = getSupabaseClient();
    const { data: admin, error } = await client
      .from('admins')
      .select('*')
      .eq('id', decoded.id)
      .single();

    if (error || !admin) {
      return { code: 401, msg: '管理员不存在', data: null };
    }

    // 生成新Token
    const newToken = this.generateToken(admin);
    return { code: 200, msg: '刷新成功', data: { token: newToken } };
  }
}
