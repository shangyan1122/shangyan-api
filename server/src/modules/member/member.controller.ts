import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { MemberService } from './member.service';
import { Logger } from '@nestjs/common';

@Controller('member')
export class MemberController {
  private readonly logger = new Logger(MemberController.name);

  constructor(private readonly memberService: MemberService) {}

  /**
   * 获取会员状态
   */
  @Get('status')
  async getMemberStatus(@Query('openid') openid: string) {
    this.logger.log(`获取会员状态: ${openid}`);

    try {
      const status = await this.memberService.getMemberStatus(openid);
      return {
        code: 200,
        msg: 'success',
        data: status,
      };
    } catch (error) {
      this.logger.error('获取会员状态失败:', error);
      return {
        code: 500,
        msg: '获取会员状态失败',
        data: null,
      };
    }
  }

  /**
   * 创建购买订单
   */
  @Post('purchase')
  async createPurchase(
    @Body() body: { openid: string; featureId: string; amount: number; mockPay?: boolean }
  ) {
    const { openid, featureId, amount, mockPay } = body;
    this.logger.log(`创建购买订单: ${openid} - ${featureId}, mockPay: ${mockPay}`);

    try {
      const paymentParams = await this.memberService.createPurchaseOrder(
        openid,
        featureId,
        amount,
        mockPay
      );
      return {
        code: 200,
        msg: '订单创建成功',
        data: paymentParams,
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
   * 支付回调
   */
  @Post('payment-callback')
  async handlePaymentCallback(@Body() body: any) {
    this.logger.log('收到支付回调:', JSON.stringify(body));

    try {
      // 实际项目中需要验证签名
      const { orderId } = body;
      const result = await this.memberService.handlePaymentSuccess(orderId);
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
   * 检查功能是否解锁
   */
  @Get('check-feature')
  async checkFeature(@Query('openid') openid: string, @Query('featureId') featureId: string) {
    this.logger.log(`检查功能解锁: ${openid} - ${featureId}`);

    try {
      const unlocked = await this.memberService.checkFeatureUnlocked(openid, featureId);
      return {
        code: 200,
        msg: 'success',
        data: { unlocked },
      };
    } catch (error) {
      this.logger.error('检查功能失败:', error);
      return {
        code: 500,
        msg: '检查失败',
        data: { unlocked: false },
      };
    }
  }
}
