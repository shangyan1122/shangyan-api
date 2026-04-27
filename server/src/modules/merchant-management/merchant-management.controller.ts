import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { AdminGuard } from '@/common/guards/admin.guard'
import { MerchantManagementService } from './merchant-management.service'

@Controller('admin/merchants')
@UseGuards(AdminGuard)
export class MerchantManagementController {
  constructor(private readonly merchantManagementService: MerchantManagementService) {}

  /**
   * 获取商户列表（分页）
   */
  @Get()
  async getMerchantList(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    return this.merchantManagementService.getMerchantList({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      status,
      search
    })
  }

  /**
   * 获取商户详情
   */
  @Get(':id')
  async getMerchantDetail(@Param('id') id: string) {
    return this.merchantManagementService.getMerchantDetail(id)
  }

  /**
   * 审核商户
   */
  @Put(':id/audit')
  async auditMerchant(
    @Param('id') id: string,
    @Body() body: { status: 'approved' | 'rejected'; remark?: string }
  ) {
    return this.merchantManagementService.auditMerchant(id, body)
  }

  /**
   * 修改商户状态
   */
  @Put(':id/status')
  async updateMerchantStatus(
    @Param('id') id: string,
    @Body() body: { status: 'active' | 'suspended'; reason?: string }
  ) {
    return this.merchantManagementService.updateMerchantStatus(id, body)
  }

  /**
   * 商户结算
   */
  @Post(':id/settlement')
  async createSettlement(
    @Param('id') id: string,
    @Body() body: { amount: number; remark?: string }
  ) {
    return this.merchantManagementService.createSettlement(id, body)
  }

  /**
   * 获取商户结算记录
   */
  @Get(':id/settlements')
  async getMerchantSettlements(
    @Param('id') id: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20'
  ) {
    return this.merchantManagementService.getMerchantSettlements(id, {
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    })
  }

  /**
   * 获取商户统计概览
   */
  @Get('stats/overview')
  async getMerchantStats() {
    return this.merchantManagementService.getMerchantStats()
  }

  /**
   * 获取商户排行榜
   */
  @Get('stats/ranking')
  async getMerchantRanking(@Query('limit') limit: string = '10') {
    return this.merchantManagementService.getMerchantRanking(parseInt(limit))
  }
}
