import { Controller, Get, Post, Body, Param, Query, Logger, UseGuards } from '@nestjs/common'
import { AdminOrderService } from './admin-order.service'
import { AdminGuard } from '@/common/guards/admin.guard'
import { RequirePermissions } from '@/common/guards/permission.guard'

@Controller('admin/orders')
@UseGuards(AdminGuard)
export class AdminOrderController {
  private readonly logger = new Logger(AdminOrderController.name)

  constructor(private readonly adminOrderService: AdminOrderService) {}

  /**
   * 获取订单列表
   */
  @Get()
  @RequirePermissions('order:read')
  async getOrders(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.adminOrderService.getOrders({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 10,
      status,
      search,
      startDate,
      endDate
    })
  }

  /**
   * 获取订单详情
   */
  @Get(':id')
  @RequirePermissions('order:read')
  async getOrderDetail(@Param('id') id: string) {
    return this.adminOrderService.getOrderDetail(id)
  }

  /**
   * 订单发货
   */
  @Post(':id/ship')
  async shipOrder(@Param('id') id: string) {
    this.logger.log(`发货请求: orderId=${id}`)
    return this.adminOrderService.shipOrder(id)
  }

  /**
   * 确认完成订单
   */
  @Post(':id/complete')
  async completeOrder(@Param('id') id: string) {
    this.logger.log(`完成订单请求: orderId=${id}`)
    return this.adminOrderService.completeOrder(id)
  }

  /**
   * 退款
   */
  @Post(':id/refund')
  async refundOrder(@Param('id') id: string) {
    this.logger.log(`退款请求: orderId=${id}`)
    return this.adminOrderService.refundOrder(id)
  }

  /**
   * 批量发货
   */
  @Post('batch/ship')
  @RequirePermissions('order:write')
  async batchShipOrders(@Body() body: { orderIds: string[] }) {
    this.logger.log(`批量发货请求: ${body.orderIds.length} 个订单`)
    return this.adminOrderService.batchShipOrders(body.orderIds)
  }

  /**
   * 批量取消订单
   */
  @Post('batch/cancel')
  @RequirePermissions('order:write')
  async batchCancelOrders(@Body() body: { orderIds: string[]; reason?: string }) {
    this.logger.log(`批量取消订单请求: ${body.orderIds.length} 个订单`)
    return this.adminOrderService.batchCancelOrders(body.orderIds, body.reason)
  }

  /**
   * 批量导出订单
   */
  @Post('batch/export')
  @RequirePermissions('order:export')
  async batchExportOrders(@Body() body: { orderIds: string[] }) {
    this.logger.log(`批量导出订单请求: ${body.orderIds.length} 个订单`)
    return this.adminOrderService.batchExportOrders(body.orderIds)
  }
}
