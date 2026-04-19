import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Req,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentService } from './payment.service';
import { ReturnGiftService } from '../return-gift/return-gift.service';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 支付控制器 - 新版个人直收模式
 *
 * 【资金合规架构】
 * 1. 嘉宾支付 → 平台商户收款
 * 2. 支付成功 → 立即转账到主办方零钱
 * 3. 回礼红包 → 从主办方充值余额扣除，平台代发
 *
 * 【删除的内容】
 * - 服务商子商户模式
 * - 特约商户进件
 * - 分账逻辑
 * - 营业执照要求
 */
@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly paymentService: PaymentService,
    @Inject(forwardRef(() => ReturnGiftService))
    private readonly returnGiftService: ReturnGiftService
  ) {}

  /**
   * 【核心】创建随礼支付订单
   *
   * 流程：
   * 1. 验证宴会状态
   * 2. 检查是否已随礼（一人一宴一次）
   * 3. 创建支付订单
   * 4. 返回支付参数
   *
   * 注意：主办方无需开通商户账户，个人即可收款
   */
  @Post('gift/create')
  async createGiftPayment(@Body() body: any, @Req() req: Request) {
    const { banquetId, guestName, guestOpenid, amount, blessing } = body;
    const openid =
      guestOpenid ||
      req.headers['x-wx-openid'] ||
      (req as any).user?.openid ||
      `guest_${Date.now()}`;

    this.logger.log(
      `创建随礼支付: banquetId=${banquetId}, guestOpenid=${openid}, amount=${amount}分`
    );

    // 参数验证
    if (!banquetId || !guestName || !amount) {
      return { code: 400, msg: '参数不完整', data: null };
    }

    // 金额验证（最低1元，最高50000元）
    if (amount < 100 || amount > 5000000) {
      return { code: 400, msg: '随礼金额需在1元至50000元之间', data: null };
    }

    try {
      const supabase = getSupabaseClient();

      // 1. 获取宴会信息
      const { data: banquet, error: banquetError } = await supabase
        .from('banquets')
        .select('*')
        .eq('id', banquetId)
        .single();

      if (banquetError || !banquet) {
        return { code: 404, msg: '宴会不存在', data: null };
      }

      if (banquet.status !== 'active') {
        return { code: 400, msg: '宴会已结束或未开始', data: null };
      }

      // 2. 检查是否已随礼（一人一宴一次）
      const { data: existingGift } = await supabase
        .from('gift_records')
        .select('id')
        .eq('banquet_id', banquetId)
        .eq('guest_openid', openid)
        .single();

      if (existingGift) {
        return { code: 400, msg: '您已经随礼过了，每人每场宴会仅限随礼一次', data: null };
      }

      // 3. 创建支付订单（嘉宾姓名和祝福语会存入attach字段）
      const paymentResult = await this.paymentService.createWechatPayment({
        banquetId,
        guestOpenid: openid,
        guestName,
        amount,
        description: `${banquet.name} - 随礼`,
        blessing,
      });

      this.logger.log(`随礼订单创建成功: orderId=${paymentResult.orderId}`);

      return {
        code: 200,
        msg: 'success',
        data: paymentResult,
      };
    } catch (error: any) {
      this.logger.error(`创建随礼支付失败: ${error.message}`);
      return { code: 500, msg: '创建订单失败', data: null };
    }
  }

  /**
   * 【核心】微信支付回调
   *
   * 流程：
   * 1. 验证签名
   * 2. 解析attach获取嘉宾信息
   * 3. 更新支付状态
   * 4. 立即转账到主办方零钱
   * 5. 触发回礼（如有配置）
   */
  @Post('notify')
  async paymentNotify(@Body() body: any) {
    this.logger.log('收到微信支付回调');

    try {
      // 处理支付回调
      const result = await this.paymentService.handlePaymentCallback(body);

      if (!result.success) {
        return { code: 'FAIL', message: result.errorMsg || '处理失败' };
      }

      // 触发回礼（如有配置）
      if (result.orderId) {
        try {
          await this.returnGiftService.triggerReturnGift(result.orderId);
          this.logger.log(`自动回礼已触发: orderId=${result.orderId}`);
        } catch (error: any) {
          this.logger.error(`触发回礼失败: ${error.message}`);
          // 回礼失败不影响主流程
        }
      }

      return { code: 'SUCCESS', message: '成功' };
    } catch (error: any) {
      this.logger.error(`支付回调处理失败: ${error.message}`);
      return { code: 'FAIL', message: '处理失败' };
    }
  }

  /**
   * 【模拟】支付成功回调（开发测试用）
   */
  @Post('mock-success')
  async mockPaymentSuccess(@Body() body: { orderId: string }) {
    const { orderId } = body;

    this.logger.log(`模拟支付成功: orderId=${orderId}`);

    if (!orderId) {
      return { code: 400, msg: '订单号不能为空', data: null };
    }

    try {
      const supabase = getSupabaseClient();

      // 1. 获取随礼记录
      const { data: giftRecord, error: queryError } = await supabase
        .from('gift_records')
        .select('*, banquets(*)')
        .eq('id', orderId)
        .single();

      if (queryError || !giftRecord) {
        return { code: 404, msg: '随礼记录不存在', data: null };
      }

      // 2. 更新支付状态
      const { error: updateError } = await supabase
        .from('gift_records')
        .update({
          payment_status: 'paid',
          transaction_id: `MOCK_TRANS_${Date.now()}`,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) {
        return { code: 500, msg: '更新支付状态失败', data: null };
      }

      // 3. 模拟转账到主办方零钱
      const banquet = giftRecord.banquets as any;
      const hostOpenid = banquet?.host_openid;

      if (hostOpenid && giftRecord.amount > 0) {
        const transferResult = await this.paymentService.transferToHost(
          hostOpenid,
          giftRecord.amount,
          `【${banquet?.name || '宴会'}】随礼收入（${giftRecord.guest_name}）`
        );

        if (transferResult.success) {
          await supabase
            .from('gift_records')
            .update({
              transfer_status: 'transferred',
              transfer_time: new Date().toISOString(),
              payment_no: transferResult.paymentNo,
            })
            .eq('id', orderId);

          this.logger.log(`模拟转账成功: ${transferResult.paymentNo}`);
        }
      }

      // 4. 触发回礼
      try {
        await this.returnGiftService.triggerReturnGift(orderId);
        this.logger.log(`回礼已触发: orderId=${orderId}`);
      } catch (error: any) {
        this.logger.error(`触发回礼失败: ${error.message}`);
      }

      return {
        code: 200,
        msg: '模拟支付成功',
        data: {
          orderId,
          amount: giftRecord.amount,
          transferred: true,
        },
      };
    } catch (error: any) {
      this.logger.error(`模拟支付成功处理失败: ${error.message}`);
      return { code: 500, msg: '处理失败', data: null };
    }
  }

  /**
   * 查询支付状态
   */
  @Get('query')
  async queryPayment(@Query('orderId') orderId: string) {
    if (!orderId) {
      return { code: 400, msg: '订单号不能为空', data: null };
    }

    try {
      const status = await this.paymentService.queryPaymentStatus(orderId);

      return {
        code: 200,
        msg: 'success',
        data: status,
      };
    } catch (error: any) {
      this.logger.error(`查询支付状态失败: ${error.message}`);
      return { code: 500, msg: '查询失败', data: null };
    }
  }
}
