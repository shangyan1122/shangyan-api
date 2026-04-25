import { Controller, Get, Post, Body, Param, Query, Logger, UseGuards } from '@nestjs/common';
import { AdminOrderService } from './admin-order.service';
import { AdminAuthGuard } from '@/common/guards/admin-auth.guard';

@Controller('admin/orders')
@UseGuards(AdminAuthGuard)
export class AdminOrderController {
  private readonly logger = new Logger(AdminOrderController.name);

  constructor(private readonly adminOrderService: AdminOrderService) {}

  /**
   * 获取订单列表
   */
  @Get()
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
      endDate,
    });
  }

  /**
   * 获取订单详情
   */
  @Get(':id')
  async getOrderDetail(@Param('id') id: string) {
    return this.adminOrderService.getOrderDetail(id);
  }

  /**
   * 订单发货
   */
  @Post(':id/ship')
  async shipOrder(@Param('id') id: string) {
    this.logger.log(`发货请求: orderId=${id}`);
    return this.adminOrderService.shipOrder(id);
  }

  /**
   * 确认完成订单
   */
  @Post(':id/complete')
  async completeOrder(@Param('id') id: string) {
    this.logger.log(`完成订单请求: orderId=${id}`);
    return this.adminOrderService.completeOrder(id);
  }

  /**
   * 退款
   */
  @Post(':id/refund')
  async refundOrder(@Param('id') id: string) {
    this.logger.log(`退款请求: orderId=${id}`);
    return this.adminOrderService.refundOrder(id);
  }
}
