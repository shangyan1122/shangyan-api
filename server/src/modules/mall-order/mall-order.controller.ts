import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { MallOrderService, CreateOrderDto } from './mall-order.service';

/**
 * 商城订单控制器
 */
@Controller('mall-orders')
export class MallOrderController {
  private readonly logger = new Logger(MallOrderController.name);

  constructor(private readonly orderService: MallOrderService) {}

  /**
   * 创建订单
   */
  @Post('create')
  async createOrder(@Body() body: CreateOrderDto) {
    this.logger.log(`创建订单: user=${body.userOpenid}, items=${body.items.length}`);

    try {
      const order = await this.orderService.createOrder(body);
      return { code: 200, msg: 'success', data: order };
    } catch (error: any) {
      this.logger.error(`创建订单失败: ${error.message}`);
      return { code: 500, msg: error.message || '创建订单失败', data: null };
    }
  }

  /**
   * 获取用户订单列表
   */
  @Get('list')
  async getUserOrders(
    @Query('openid') openid: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    this.logger.log(`获取订单列表: openid=${openid}, status=${status}`);

    try {
      const result = await this.orderService.getUserOrders(
        openid,
        status,
        parseInt(page || '1'),
        parseInt(pageSize || '10')
      );
      return { code: 200, msg: 'success', data: result };
    } catch (error: any) {
      this.logger.error(`获取订单列表失败: ${error.message}`);
      return { code: 500, msg: '获取订单列表失败', data: { orders: [], total: 0 } };
    }
  }

  /**
   * 获取订单详情
   */
  @Get(':id')
  async getOrderById(@Param('id') id: string) {
    this.logger.log(`获取订单详情: ${id}`);

    try {
      const order = await this.orderService.getOrderById(id);
      if (!order) {
        return { code: 404, msg: '订单不存在', data: null };
      }
      return { code: 200, msg: 'success', data: order };
    } catch (error: any) {
      this.logger.error(`获取订单详情失败: ${error.message}`);
      return { code: 500, msg: '获取订单详情失败', data: null };
    }
  }

  /**
   * 支付成功回调
   */
  @Post('payment-success')
  async handlePaymentSuccess(@Body() body: { orderNo: string; transactionId: string }) {
    this.logger.log(`支付成功回调: orderNo=${body.orderNo}`);

    try {
      const success = await this.orderService.handlePaymentSuccess(
        body.orderNo,
        body.transactionId
      );
      return { code: 200, msg: success ? 'success' : 'failed', data: { success } };
    } catch (error: any) {
      this.logger.error(`处理支付回调失败: ${error.message}`);
      return { code: 500, msg: error.message, data: { success: false } };
    }
  }

  /**
   * 发货（管理员操作）
   */
  @Post('ship')
  async shipOrder(
    @Body() body: { orderId: string; company: string; code: string; trackingNo: string }
  ) {
    this.logger.log(`订单发货: orderId=${body.orderId}`);

    try {
      const success = await this.orderService.shipOrder(body.orderId, {
        company: body.company,
        code: body.code,
        trackingNo: body.trackingNo,
      });
      return { code: 200, msg: 'success', data: { success } };
    } catch (error: any) {
      this.logger.error(`发货失败: ${error.message}`);
      return { code: 500, msg: error.message, data: { success: false } };
    }
  }

  /**
   * 确认收货
   */
  @Post('confirm-receive')
  async confirmReceive(@Body() body: { orderId: string }) {
    this.logger.log(`确认收货: orderId=${body.orderId}`);

    try {
      const success = await this.orderService.confirmReceive(body.orderId);
      return { code: 200, msg: 'success', data: { success } };
    } catch (error: any) {
      this.logger.error(`确认收货失败: ${error.message}`);
      return { code: 500, msg: error.message, data: { success: false } };
    }
  }

  /**
   * 取消订单
   */
  @Post('cancel')
  async cancelOrder(@Body() body: { orderId: string; reason?: string }) {
    this.logger.log(`取消订单: orderId=${body.orderId}`);

    try {
      const success = await this.orderService.cancelOrder(body.orderId, body.reason);
      return { code: 200, msg: 'success', data: { success } };
    } catch (error: any) {
      this.logger.error(`取消订单失败: ${error.message}`);
      return { code: 500, msg: error.message, data: { success: false } };
    }
  }

  /**
   * 获取订单统计（管理员用）
   */
  @Get('admin/stats')
  async getAdminStats() {
    try {
      const pendingShipCount = await this.orderService.getPendingShipCount();
      return {
        code: 200,
        msg: 'success',
        data: { pendingShipCount },
      };
    } catch (error: any) {
      return { code: 500, msg: '获取统计失败', data: null };
    }
  }

  /**
   * 获取所有订单（管理员用）
   */
  @Get('admin/list')
  async getAllOrders(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    try {
      const result = await this.orderService.getAllOrders(
        status,
        parseInt(page || '1'),
        parseInt(pageSize || '20')
      );
      return { code: 200, msg: 'success', data: result };
    } catch (error: any) {
      return { code: 500, msg: '获取订单列表失败', data: { orders: [], total: 0 } };
    }
  }
}
