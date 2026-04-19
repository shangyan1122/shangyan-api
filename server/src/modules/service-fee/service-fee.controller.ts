import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ServiceFeeService } from './service-fee.service';
import { ShoppingVoucherService } from './shopping-voucher.service';

@Controller('service-fee')
export class ServiceFeeController {
  constructor(
    private readonly serviceFeeService: ServiceFeeService,
    private readonly voucherService: ShoppingVoucherService
  ) {}

  /**
   * 统计宴会手续费（内部调用）
   */
  @Post('calculate/:banquetId')
  async calculateServiceFee(@Param('banquetId') banquetId: string) {
    const statistics = await this.serviceFeeService.calculateBanquetServiceFee(banquetId);
    return {
      code: 200,
      msg: '统计成功',
      data: statistics,
    };
  }

  /**
   * 宴会结束时发放购物券（内部调用）
   */
  @Post('issue-voucher/:banquetId')
  async issueVoucher(@Param('banquetId') banquetId: string) {
    const voucher = await this.voucherService.issueVoucherOnBanquetEnd(banquetId);
    return {
      code: 200,
      msg: voucher ? '购物券发放成功' : '无需发放购物券',
      data: voucher,
    };
  }

  /**
   * 获取用户购物券余额
   */
  @Get('voucher/balance')
  async getVoucherBalance(@Query('openid') openid: string) {
    const balance = await this.voucherService.getUserVoucherBalance(openid);
    return {
      code: 200,
      msg: '获取成功',
      data: { balance },
    };
  }

  /**
   * 获取用户购物券列表
   */
  @Get('voucher/list')
  async getVoucherList(@Query('openid') openid: string) {
    const vouchers = await this.voucherService.getUserVouchers(openid);
    return {
      code: 200,
      msg: '获取成功',
      data: vouchers,
    };
  }

  /**
   * 使用购物券
   */
  @Post('voucher/use')
  async useVoucher(@Body() body: { openid: string; amount: number; orderId?: string }) {
    const result = await this.voucherService.useVoucher(body.openid, body.amount, body.orderId);
    return {
      code: result.success ? 200 : 400,
      msg: result.success ? '使用成功' : '购物券余额不足',
      data: result,
    };
  }

  /**
   * 手动发放购物券（管理员）
   */
  @Post('voucher/issue')
  async issueVoucherManually(
    @Body() body: { openid: string; amount: number; description: string }
  ) {
    const voucher = await this.voucherService.issueVoucherManually(
      body.openid,
      body.amount,
      body.description
    );
    return {
      code: voucher ? 200 : 500,
      msg: voucher ? '发放成功' : '发放失败',
      data: voucher,
    };
  }
}
