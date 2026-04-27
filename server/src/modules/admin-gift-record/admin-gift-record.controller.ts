import { Controller, Get, Post, Put, Delete, Query, Param, Body, Logger, UseGuards } from '@nestjs/common'
import { AdminGiftRecordService } from './admin-gift-record.service'
import { AdminGuard } from '@/common/guards/admin.guard'
import { RequirePermissions } from '@/common/guards/permission.guard'

/**
 * 礼账管理控制器
 */
@Controller('admin/gift-records')
@UseGuards(AdminGuard)
export class AdminGiftRecordController {
  private readonly logger = new Logger(AdminGiftRecordController.name)

  constructor(private readonly adminGiftRecordService: AdminGiftRecordService) {}

  /**
   * 获取礼账列表
   */
  @Get()
  @RequirePermissions('gift:read')
  async getGiftRecords(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('banquetId') banquetId?: string,
    @Query('status') status?: string,
    @Query('isSupplement') isSupplement?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string,
    @Query('keyword') keyword?: string
  ) {
    return this.adminGiftRecordService.getGiftRecords({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
      banquetId,
      status,
      isSupplement: isSupplement === 'true' ? true : isSupplement === 'false' ? false : undefined,
      startDate,
      endDate,
      minAmount: minAmount ? parseInt(minAmount) : undefined,
      maxAmount: maxAmount ? parseInt(maxAmount) : undefined,
      keyword
    })
  }

  /**
   * 获取礼账详情
   */
  @Get(':id')
  @RequirePermissions('gift:read')
  async getGiftRecordDetail(@Param('id') id: string) {
    return this.adminGiftRecordService.getGiftRecordDetail(id)
  }

  /**
   * 审核补录礼账
   */
  @Put(':id/audit')
  @RequirePermissions('gift:audit')
  async auditGiftRecord(
    @Param('id') id: string,
    @Body() body: { approved: boolean; remark?: string }
  ) {
    this.logger.log(`审核礼账: id=${id}, approved=${body.approved}`)
    return this.adminGiftRecordService.auditGiftRecord(id, body.approved, body.remark)
  }

  /**
   * 标记异常礼账
   */
  @Put(':id/mark-abnormal')
  @RequirePermissions('gift:write')
  async markAsAbnormal(
    @Param('id') id: string,
    @Body() body: { reason: string }
  ) {
    this.logger.log(`标记异常礼账: id=${id}, reason=${body.reason}`)
    return this.adminGiftRecordService.markAsAbnormal(id, body.reason)
  }

  /**
   * 解除异常标记
   */
  @Put(':id/unmark-abnormal')
  @RequirePermissions('gift:write')
  async unmarkAsAbnormal(@Param('id') id: string) {
    this.logger.log(`解除异常标记: id=${id}`)
    return this.adminGiftRecordService.unmarkAsAbnormal(id)
  }

  /**
   * 获取礼账统计
   */
  @Get('stats/overview')
  @RequirePermissions('gift:read')
  async getGiftStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.adminGiftRecordService.getGiftStats({ startDate, endDate })
  }

  /**
   * 批量删除礼账
   */
  @Delete('batch')
  @RequirePermissions('gift:write')
  async batchDeleteGiftRecords(@Body() body: { ids: string[] }) {
    this.logger.log(`批量删除礼账: count=${body.ids.length}`)
    return this.adminGiftRecordService.batchDeleteGiftRecords(body.ids)
  }
}
