import { Controller, Post, Get, Body, Logger, UseGuards, Request } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthGuard } from '@/common/guards/admin-auth.guard';

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
  @UseGuards(AdminAuthGuard)
  async getProfile(@Request() req: any) {
    return this.adminAuthService.getProfile(req.admin.id);
  }
}
