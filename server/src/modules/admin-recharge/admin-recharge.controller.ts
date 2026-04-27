import { Controller, Get, Query, Logger, UseGuards, Res } from '@nestjs/common'
import { Response } from 'express'
import { AdminRechargeService } from './admin-recharge.service'
import { AdminGuard } from '@/common/guards/admin.guard'
import { RequirePermissions } from '@/common/guards/permission.guard'

@Controller('admin/recharge-orders')
@UseGuards(AdminGuard)
export class AdminRechargeController {
  private readonly logger = new Logger(AdminRechargeController.name)

  constructor(private readonly adminRechargeService: AdminRechargeService) {}

  /**
   * 获取充值订单列表
   */
  @Get()
  @RequirePermissions('recharge:read')
  async getRechargeOrders(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.adminRechargeService.getRechargeOrders({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 10,
      status,
      search,
      startDate,
      endDate
    })
  }

  /**
   * 获取充值订单详情
   */
  @Get('stats')
  @RequirePermissions('recharge:read')
  async getRechargeStats() {
    return this.adminRechargeService.getRechargeStats()
  }

  /**
   * 导出充值订单
   */
  @Get('export')
  @RequirePermissions('recharge:export')
  async exportRechargeOrders(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Res() res?: Response
  ) {
    try {
      const result = await this.adminRechargeService.exportRechargeOrders({
        startDate,
        endDate,
        status
      })

      if (res) {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        res.setHeader('Content-Disposition', `attachment; filename=recharge_orders_${Date.now()}.xlsx`)
        res.send(result)
      }

      return result
    } catch (error: any) {
      this.logger.error(`导出充值订单失败: ${error.message}`)
      return { code: 500, msg: '导出失败', data: null }
    }
  }
}
