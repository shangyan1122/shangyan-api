import { Controller, Get, Post, Param, Query, Body, Logger } from '@nestjs/common';
import { AdminUserService } from './admin-user.service';

@Controller('admin/users')
export class AdminUserController {
  private readonly logger = new Logger(AdminUserController.name);

  constructor(private readonly adminUserService: AdminUserService) {}

  /**
   * 获取用户列表
   */
  @Get()
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
      search,
    });
  }

  /**
   * 获取用户详情
   */
  @Get(':id')
  async getUserDetail(@Param('id') id: string) {
    return this.adminUserService.getUserDetail(id);
  }

  /**
   * 设置VIP状态
   */
  @Post(':id/vip')
  async setVipStatus(
    @Param('id') id: string,
    @Body() body: { isVip: boolean; expireDays?: number }
  ) {
    this.logger.log(`设置VIP: userId=${id}, isVip=${body.isVip}`);
    return this.adminUserService.setVipStatus(id, body.isVip, body.expireDays);
  }
}
