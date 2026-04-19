import { Controller, Post, Get, Body, Headers, Logger } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';

@Controller('admin/auth')
export class AdminAuthController {
  private readonly logger = new Logger(AdminAuthController.name);

  constructor(private readonly adminAuthService: AdminAuthService) {}

  /**
   * 发送登录验证码
   */
  @Post('send-code')
  async sendCode(@Body() body: { phone: string }) {
    const { phone } = body;

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return { code: 400, msg: '请输入正确的手机号', data: null };
    }

    return this.adminAuthService.sendLoginCode(phone);
  }

  /**
   * 管理员登录
   */
  @Post('login')
  async login(@Body() body: { phone: string; code: string }) {
    const { phone, code } = body;

    if (!phone || !code) {
      return { code: 400, msg: '请输入手机号和验证码', data: null };
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return { code: 400, msg: '手机号格式不正确', data: null };
    }

    if (code.length !== 6) {
      return { code: 400, msg: '验证码为6位数字', data: null };
    }

    return this.adminAuthService.login(phone, code);
  }

  /**
   * 获取管理员信息
   */
  @Get('profile')
  async getProfile(@Headers('authorization') auth: string) {
    if (!auth || !auth.startsWith('Bearer ')) {
      return { code: 401, msg: '未授权', data: null };
    }

    const token = auth.substring(7);
    const decoded = this.adminAuthService.verifyToken(token);

    if (!decoded) {
      return { code: 401, msg: 'Token无效', data: null };
    }

    return this.adminAuthService.getProfile(decoded.id);
  }
}
