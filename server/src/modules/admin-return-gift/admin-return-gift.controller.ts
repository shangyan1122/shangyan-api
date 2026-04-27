import { Controller, Get, Post, Put, Delete, Query, Param, Body, Logger, UseGuards } from '@nestjs/common'
import { AdminReturnGiftService } from './admin-return-gift.service'
import { AdminGuard } from '@/common/guards/admin.guard'
import { RequirePermissions } from '@/common/guards/permission.guard'

/**
 * 回礼管理控制器
 */
@Controller('admin/return-gifts')
@UseGuards(AdminGuard)
export class AdminReturnGiftController {
  private readonly logger = new Logger(AdminReturnGiftController.name)

  constructor(private readonly adminReturnGiftService: AdminReturnGiftService) {}

  /**
   * 获取回礼发放记录列表
   */
  @Get()
  @RequirePermissions('return-gift:read')
  async getReturnGifts(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('banquetId') banquetId?: string,
    @Query('status') status?: string,
    @Query('giftType') giftType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.adminReturnGiftService.getReturnGifts({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
      banquetId,
      status,
      giftType,
      startDate,
      endDate
    })
  }

  /**
   * 获取回礼发放详情
   */
  @Get(':id')
  @RequirePermissions('return-gift:read')
  async getReturnGiftDetail(@Param('id') id: string) {
    return this.adminReturnGiftService.getReturnGiftDetail(id)
  }

  /**
   * 获取兑换码列表
   */
  @Get('codes/list')
  @RequirePermissions('return-gift:read')
  async getClaimCodes(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('banquetId') banquetId?: string
  ) {
    return this.adminReturnGiftService.getClaimCodes({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
      status,
      banquetId
    })
  }

  /**
   * 创建兑换码
   */
  @Post('codes')
  @RequirePermissions('return-gift:write')
  async createClaimCode(@Body() body: {
    banquetId: string
    guestId: string
    giftId: string
    giftType: 'red_packet' | 'mall_product' | 'custom_voucher'
    amount?: number
    quantity?: number
    expiryDate?: string
  }) {
    this.logger.log(`创建兑换码: banquetId=${body.banquetId}, guestId=${body.guestId}`)
    return this.adminReturnGiftService.createClaimCode(body)
  }

  /**
   * 批量创建兑换码
   */
  @Post('codes/batch')
  @RequirePermissions('return-gift:write')
  async batchCreateClaimCodes(@Body() body: {
    banquetId: string
    giftId: string
    giftType: 'red_packet' | 'mall_product' | 'custom_voucher'
    guestIds: string[]
    amount?: number
    quantity?: number
    expiryDate?: string
  }) {
    this.logger.log(`批量创建兑换码: count=${body.guestIds.length}`)
    return this.adminReturnGiftService.batchCreateClaimCodes(body)
  }

  /**
   * 废除兑换码
   */
  @Put('codes/:codeId/revoke')
  @RequirePermissions('return-gift:write')
  async revokeClaimCode(@Param('codeId') codeId: string) {
    this.logger.log(`废除兑换码: codeId=${codeId}`)
    return this.adminReturnGiftService.revokeClaimCode(codeId)
  }

  /**
   * 获取回礼统计
   */
  @Get('stats/overview')
  @RequirePermissions('return-gift:read')
  async getReturnGiftStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.adminReturnGiftService.getReturnGiftStats({ startDate, endDate })
  }

  /**
   * 获取兑换码统计
   */
  @Get('codes/stats')
  @RequirePermissions('return-gift:read')
  async getClaimCodeStats() {
    return this.adminReturnGiftService.getClaimCodeStats()
  }

  /**
   * 手动发放回礼
   */
  @Post('manual-send')
  @RequirePermissions('return-gift:write')
  async manualSendGift(@Body() body: {
    guestId: string
    banquetId: string
    giftType: 'red_packet' | 'mall_product' | 'custom_voucher'
    amount?: number
    productId?: string
    voucherId?: string
    remark?: string
  }) {
    this.logger.log(`手动发放回礼: guestId=${body.guestId}, type=${body.giftType}`)
    return this.adminReturnGiftService.manualSendGift(body)
  }
}
