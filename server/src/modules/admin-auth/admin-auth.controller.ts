import { Controller, Post, Get, Body, Logger, UseGuards, Query, Param, Delete, Put, Req } from '@nestjs/common'
import { Request } from 'express'
import { AdminAuthService } from './admin-auth.service'
import { AdminGuard } from '@/common/guards/admin.guard'

@Controller('admin/auth')
export class AdminAuthController {
  private readonly logger = new Logger(AdminAuthController.name)

  constructor(private readonly adminAuthService: AdminAuthService) {}

  /**
   * 发送登录验证码
   */
  @Post('send-code')
  async sendCode(@Body() body: { phone: string }) {
    const { phone } = body

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return { code: 400, msg: '请输入正确的手机号', data: null }
    }

    return this.adminAuthService.sendLoginCode(phone)
  }

  /**
   * 管理员登录
   */
  @Post('login')
  async login(@Body() body: { phone: string; code: string }) {
    const { phone, code } = body

    if (!phone || !code) {
      return { code: 400, msg: '请输入手机号和验证码', data: null }
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return { code: 400, msg: '手机号格式不正确', data: null }
    }

    if (code.length !== 6) {
      return { code: 400, msg: '验证码为6位数字', data: null }
    }

    return this.adminAuthService.login(phone, code)
  }

  /**
   * 获取管理员信息
   */
  @Get('profile')
  @UseGuards(AdminGuard)
  async getProfile(@Req() req: Request) {
    const admin = (req as any).admin
    if (!admin) {
      return { code: 401, msg: '未授权', data: null }
    }
    return this.adminAuthService.getProfile(admin.id)
  }

  /**
   * 初始化总管理员（首次部署时调用）
   */
  @Post('initialize-super-admin')
  async initializeSuperAdmin() {
    await this.adminAuthService.initializeSuperAdmin()
    return { code: 200, msg: '初始化完成', data: null }
  }

  /**
   * 获取管理员列表（仅超级管理员）
   */
  @Get('admins')
  @UseGuards(AdminGuard)
  async getAdminList(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string
  ) {
    const admin = (req as any).admin
    if (admin.role !== 'super_admin') {
      return { code: 403, msg: '仅超级管理员可查看管理员列表', data: null }
    }
    return this.adminAuthService.getAdminList({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 10,
      search
    })
  }

  /**
   * 添加管理员（仅超级管理员）
   */
  @Post('admins')
  @UseGuards(AdminGuard)
  async addAdmin(
    @Req() req: Request,
    @Body() body: { phone: string; name: string; role: string }
  ) {
    const admin = (req as any).admin
    if (admin.role !== 'super_admin') {
      return { code: 403, msg: '仅超级管理员可添加管理员', data: null }
    }
    const { phone, name, role } = body
    if (!phone || !name || !role) {
      return { code: 400, msg: '请填写完整信息', data: null }
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return { code: 400, msg: '手机号格式不正确', data: null }
    }
    return this.adminAuthService.addAdmin({ phone, name, role })
  }

  /**
   * 删除管理员（仅超级管理员）
   */
  @Delete('admins/:id')
  @UseGuards(AdminGuard)
  async deleteAdmin(
    @Param('id') id: string,
    @Req() req: Request
  ) {
    const admin = (req as any).admin
    if (admin.role !== 'super_admin') {
      return { code: 403, msg: '仅超级管理员可删除管理员', data: null }
    }
    return this.adminAuthService.deleteAdmin(id, admin.id)
  }

  /**
   * 修改管理员角色（仅超级管理员）
   */
  @Put('admins/:id/role')
  @UseGuards(AdminGuard)
  async updateAdminRole(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() body: { role: string }
  ) {
    const admin = (req as any).admin
    if (admin.role !== 'super_admin') {
      return { code: 403, msg: '仅超级管理员可修改角色', data: null }
    }
    if (!body.role) {
      return { code: 400, msg: '请指定角色', data: null }
    }
    return this.adminAuthService.updateAdminRole(id, body.role)
  }
}
