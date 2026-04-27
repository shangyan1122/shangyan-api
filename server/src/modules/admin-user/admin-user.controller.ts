import { Controller, Get, Post, Param, Query, Body, Logger, UseGuards } from '@nestjs/common'
import { AdminUserService } from './admin-user.service'
import { AdminGuard } from '@/common/guards/admin.guard'
import { RequirePermissions } from '@/common/guards/permission.guard'

@Controller('admin/users')
@UseGuards(AdminGuard)
export class AdminUserController {
  private readonly logger = new Logger(AdminUserController.name)

  constructor(private readonly adminUserService: AdminUserService) {}

  /**
   * 获取用户列表
   */
  @Get()
  @RequirePermissions('user:read')
  async getUsers(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('isVip') isVip?: string,
    @Query('search') search?: string
  ) {
    return this.adminUserService.getUsers({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 10,
      isVip: isVip === 'true' ? true : isVip === 'false' ? false : undefined,
      search
    })
  }

  /**
   * 获取用户详情
   */
  @Get(':id')
  @RequirePermissions('user:read')
  async getUserDetail(@Param('id') id: string) {
    return this.adminUserService.getUserDetail(id)
  }

  /**
   * 设置VIP状态
   */
  @Post(':id/vip')
  @RequirePermissions('user:write')
  async setVipStatus(
    @Param('id') id: string,
    @Body() body: { isVip: boolean; expireDays?: number }
  ) {
    this.logger.log(`设置VIP: userId=${id}, isVip=${body.isVip}`)
    return this.adminUserService.setVipStatus(id, body.isVip, body.expireDays)
  }
}
