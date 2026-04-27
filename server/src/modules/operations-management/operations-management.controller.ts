import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { AdminGuard } from '@/common/guards/admin.guard'
import { OperationsManagementService } from './operations-management.service'

@Controller('admin/operations')
@UseGuards(AdminGuard)
export class OperationsManagementController {
  constructor(private readonly operationsManagementService: OperationsManagementService) {}

  /**
   * 获取活动列表（分页）
   */
  @Get('activities')
  async getActivityList(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('status') status?: string,
    @Query('type') type?: string
  ) {
    return this.operationsManagementService.getActivityList({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      status,
      type
    })
  }

  /**
   * 创建活动
   */
  @Post('activities')
  async createActivity(@Body() body: any) {
    return this.operationsManagementService.createActivity(body)
  }

  /**
   * 更新活动
   */
  @Put('activities/:id')
  async updateActivity(@Param('id') id: string, @Body() body: any) {
    return this.operationsManagementService.updateActivity(id, body)
  }

  /**
   * 删除活动
   */
  @Delete('activities/:id')
  async deleteActivity(@Param('id') id: string) {
    return this.operationsManagementService.deleteActivity(id)
  }

  /**
   * 获取优惠券列表（分页）
   */
  @Get('coupons')
  async getCouponList(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('status') status?: string,
    @Query('type') type?: string
  ) {
    return this.operationsManagementService.getCouponList({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      status,
      type
    })
  }

  /**
   * 创建优惠券
   */
  @Post('coupons')
  async createCoupon(@Body() body: any) {
    return this.operationsManagementService.createCoupon(body)
  }

  /**
   * 更新优惠券
   */
  @Put('coupons/:id')
  async updateCoupon(@Param('id') id: string, @Body() body: any) {
    return this.operationsManagementService.updateCoupon(id, body)
  }

  /**
   * 删除优惠券
   */
  @Delete('coupons/:id')
  async deleteCoupon(@Param('id') id: string) {
    return this.operationsManagementService.deleteCoupon(id)
  }

  /**
   * 获取通知公告列表（分页）
   */
  @Get('announcements')
  async getAnnouncementList(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('type') type?: string
  ) {
    return this.operationsManagementService.getAnnouncementList({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      type
    })
  }

  /**
   * 创建通知公告
   */
  @Post('announcements')
  async createAnnouncement(@Body() body: any) {
    return this.operationsManagementService.createAnnouncement(body)
  }

  /**
   * 更新通知公告
   */
  @Put('announcements/:id')
  async updateAnnouncement(@Param('id') id: string, @Body() body: any) {
    return this.operationsManagementService.updateAnnouncement(id, body)
  }

  /**
   * 删除通知公告
   */
  @Delete('announcements/:id')
  async deleteAnnouncement(@Param('id') id: string) {
    return this.operationsManagementService.deleteAnnouncement(id)
  }

  /**
   * 获取运营统计概览
   */
  @Get('stats/overview')
  async getOperationsStats() {
    return this.operationsManagementService.getOperationsStats()
  }

  /**
   * 获取活动数据统计
   */
  @Get('stats/activity-data')
  async getActivityStats(@Query('activityId') activityId: string) {
    return this.operationsManagementService.getActivityStats(activityId)
  }
}
