import { Controller, Get, Query, Logger, UseGuards, Res } from '@nestjs/common'
import { Response } from 'express'
import { AdminPaidFeaturesService } from './admin-paid-features.service'
import { AdminGuard } from '@/common/guards/admin.guard'
import { RequirePermissions } from '@/common/guards/permission.guard'

@Controller('admin/paid-features-orders')
@UseGuards(AdminGuard)
export class AdminPaidFeaturesController {
  private readonly logger = new Logger(AdminPaidFeaturesController.name)

  constructor(private readonly adminPaidFeaturesService: AdminPaidFeaturesService) {}

  /**
   * 获取付费功能订单列表
   */
  @Get()
  @RequirePermissions('paid_features:read')
  async getPaidFeaturesOrders(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('featureType') featureType?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.adminPaidFeaturesService.getPaidFeaturesOrders({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 10,
      featureType,
      status,
      startDate,
      endDate
    })
  }

  /**
   * 获取付费功能统计
   */
  @Get('stats')
  @RequirePermissions('paid_features:read')
  async getPaidFeaturesStats() {
    return this.adminPaidFeaturesService.getPaidFeaturesStats()
  }

  /**
   * 导出付费功能订单
   */
  @Get('export')
  @RequirePermissions('paid_features:export')
  async exportPaidFeaturesOrders(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('featureType') featureType?: string,
    @Res() res?: Response
  ) {
    try {
      const result = await this.adminPaidFeaturesService.exportPaidFeaturesOrders({
        startDate,
        endDate,
        featureType
      })

      if (res) {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        res.setHeader('Content-Disposition', `attachment; filename=paid_features_orders_${Date.now()}.xlsx`)
        res.send(result)
      }

      return result
    } catch (error: any) {
      this.logger.error(`导出付费功能订单失败: ${error.message}`)
      return { code: 500, msg: '导出失败', data: null }
    }
  }
}
