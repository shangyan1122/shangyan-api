import { Controller, Get, Post, Body, Query, Logger } from '@nestjs/common';
import { PaidFeaturesService } from './paid-features.service';

@Controller('paid-features')
export class PaidFeaturesController {
  private readonly logger = new Logger(PaidFeaturesController.name);

  constructor(private readonly paidFeaturesService: PaidFeaturesService) {}

  /**
   * 获取用户付费功能状态
   */
  @Get('status')
  async getPaidFeaturesStatus(@Query('openid') openid: string) {
    this.logger.log(`获取付费功能状态: ${openid}`);

    try {
      const status = await this.paidFeaturesService.getPaidFeaturesStatus(openid);
      return {
        code: 200,
        msg: 'success',
        data: status,
      };
    } catch (error) {
      this.logger.error('获取付费功能状态失败:', error);
      return {
        code: 500,
        msg: '获取状态失败',
        data: null,
      };
    }
  }

  /**
   * 获取宴会付费功能状态
   */
  @Get('banquet-status')
  async getBanquetPaidFeatures(@Query('banquetId') banquetId: string) {
    this.logger.log(`获取宴会付费功能状态: ${banquetId}`);

    try {
      const status = await this.paidFeaturesService.getBanquetPaidFeatures(banquetId);
      return {
        code: 200,
        msg: 'success',
        data: status,
      };
    } catch (error) {
      this.logger.error('获取宴会付费功能状态失败:', error);
      return {
        code: 500,
        msg: '获取状态失败',
        data: null,
      };
    }
  }

  /**
   * 创建支付订单
   */
  @Post('pay')
  async createPayment(
    @Body()
    body: {
      openid: string;
      banquetId: string;
      feature: string; // ledger_export | gift_reminder | ai_page
      amount: number;
    }
  ) {
    const { openid, banquetId, feature, amount } = body;
    this.logger.log(`创建支付订单: ${openid} - ${feature} - ${amount}`);

    try {
      const result = await this.paidFeaturesService.createPaymentOrder(
        openid,
        banquetId,
        feature,
        amount
      );
      return {
        code: 200,
        msg: '订单创建成功',
        data: result,
      };
    } catch (error) {
      this.logger.error('创建订单失败:', error);
      return {
        code: 400,
        msg: error.message || '创建订单失败',
        data: null,
      };
    }
  }

  /**
   * 支付成功回调
   */
  @Post('payment-callback')
  async handlePaymentCallback(@Body() body: any) {
    this.logger.log('收到支付回调:', JSON.stringify(body));

    try {
      const { orderId, transactionId } = body;
      const result = await this.paidFeaturesService.handlePaymentSuccess(orderId, transactionId);
      return {
        code: 200,
        msg: 'success',
        data: result,
      };
    } catch (error) {
      this.logger.error('处理支付回调失败:', error);
      return {
        code: 500,
        msg: '处理失败',
        data: null,
      };
    }
  }

  /**
   * 检查功能是否已开通
   */
  @Get('check')
  async checkFeature(@Query('banquetId') banquetId: string, @Query('feature') feature: string) {
    try {
      const enabled = await this.paidFeaturesService.checkFeatureEnabled(banquetId, feature);
      return {
        code: 200,
        msg: 'success',
        data: { enabled },
      };
    } catch (error) {
      this.logger.error('检查功能状态失败:', error);
      return {
        code: 500,
        msg: '检查失败',
        data: { enabled: false },
      };
    }
  }

  /**
   * 开通AI专属页面
   */
  @Post('enable-ai-page')
  async enableAIPage(@Body() body: { banquetId: string }) {
    try {
      const result = await this.paidFeaturesService.enableAIPage(body.banquetId);
      return {
        code: 200,
        msg: '开通成功',
        data: result,
      };
    } catch (error) {
      this.logger.error('开通AI页面失败:', error);
      return {
        code: 400,
        msg: error.message || '开通失败',
        data: null,
      };
    }
  }
}
