import { Injectable, Logger } from '@nestjs/common';
import { wechatPayConfig } from '../wechat-pay/wechat-pay.config';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const supabase = getSupabaseClient();

/**
 * 分账配置
 *
 * 【分账规则】
 * - 固定从主办方扣除 0.6% 手续费（始终不变）
 * - 微信支付当前优惠打9折：0.6% × 0.9 = 0.54%
 * - 平台利润：0.6% - 0.54% = 0.06%
 *
 * 【资金示例】
 * - 嘉宾支付 100 元
 * - 主办方到账：100 × 99.4% = 99.4 元
 * - 平台收取：100 × 0.6% = 0.6 元
 * - 微信实际扣：100 × 0.54% = 0.54 元
 * - 平台利润：0.6 - 0.54 = 0.06 元
 *
 * 【注意】
 * - 主办方始终被扣除 0.6%，不受微信优惠影响
 * - 微信优惠带来的利润归平台所有
 */
const PROFIT_SHARING_CONFIG = {
  // 主办方分账比例（99.4%，固定扣除0.6%手续费）
  HOST_RATIO: 0.994,
  // 平台收取的手续费比例（0.6%，固定）
  PLATFORM_FEE_RATIO: 0.006,
  // 微信支付实际费率（0.54%，当前打9折优惠）
  WECHAT_FEE_RATIO: 0.0054,
  // 平台利润比例（0.06%）
  PLATFORM_PROFIT_RATIO: 0.0006,
  // 分账关系类型
  RELATION_TYPE: 'USER' as const,
  // 分账描述
  DESCRIPTION: '宴会随礼分账',
};

/**
 * 分账结果接口
 */
export interface ProfitSharingResult {
  success: boolean;
  transactionId?: string;
  outOrderNo?: string;
  errorMsg?: string;
  hostAmount?: number; // 主办方分账金额（分）
  platformAmount?: number; // 平台服务费（分）
}

/**
 * 分账接收方
 */
export interface ProfitSharingReceiver {
  openid: string;
  name?: string;
  relationType:
    | 'PARTNER'
    | 'SERVICE_PROVIDER'
    | 'STORE'
    | 'STAFF'
    | 'STORE_OWNER'
    | 'SUPPLIER'
    | 'CUSTOM'
    | 'USER';
}

/**
 * 微信支付V3分账服务
 *
 * 【核心特性】
 * 1. 使用微信官方分账API，禁止平台转账、禁止二清
 * 2. 分账接收方为主办方微信OPENID
 * 3. 分账金额为订单实付全额
 * 4. 分账失败自动重试3次并通知管理员
 *
 * 【分账流程】
 * 1. 支付成功后，调用添加分账接收方接口
 * 2. 调用请求分账接口
 * 3. 分账成功：更新记录，走原有成功逻辑
 * 4. 分账失败：重试3次，通知管理员
 */
@Injectable()
export class ProfitSharingService {
  private readonly logger = new Logger(ProfitSharingService.name);
  private paymentService: any;

  constructor() {
    this.initPaymentService();
  }

  private initPaymentService() {
    try {
      const WechatPay = require('wechatpay-node-v3');

      // 检查配置是否完整
      if (
        !wechatPayConfig.appId ||
        !wechatPayConfig.mchId ||
        wechatPayConfig.appId === 'wx_app_id' ||
        wechatPayConfig.mchId === 'merchant_id'
      ) {
        this.logger.warn('微信支付配置不完整，使用模拟分账模式');
        this.paymentService = null;
        return;
      }

      this.paymentService = new WechatPay({
        appid: wechatPayConfig.appId,
        mchid: wechatPayConfig.mchId,
        serial_no: wechatPayConfig.serialNo,
        privateKey: Buffer.from(wechatPayConfig.privateKey || ''),
        publicKey: Buffer.from(wechatPayConfig.publicKey || ''),
      });
      this.logger.log('微信支付V3分账服务初始化成功');
    } catch (error: any) {
      this.logger.warn(`微信支付V3分账服务初始化失败: ${error.message}，使用模拟模式`);
      this.paymentService = null;
    }
  }

  /**
   * 【核心】执行分账
   *
   * 【分账流程】
   * 1. 嘉宾支付 100 元随礼
   * 2. 主办方到账：100 × 99.4% = 99.4 元
   * 3. 平台收取：100 × 0.6% = 0.6 元
   *    - 微信实际扣：0.54 元（打9折优惠）
   *    - 平台利润：0.06 元
   *
   * @param transactionId 微信支付交易号
   * @param hostOpenid 主办方OPENID（分账接收方）
   * @param amount 随礼金额（分）
   * @param orderId 业务订单号
   * @returns 分账结果
   */
  async executeProfitSharing(
    transactionId: string,
    hostOpenid: string,
    amount: number,
    orderId: string
  ): Promise<ProfitSharingResult> {
    this.logger.log(
      `开始分账: transactionId=${transactionId}, hostOpenid=${hostOpenid}, amount=${amount}分`
    );

    // 计算分账金额
    const hostAmount = Math.floor(amount * PROFIT_SHARING_CONFIG.HOST_RATIO);
    const platformAmount = amount - hostAmount; // 平台收取 = 总金额 - 主办方金额

    this.logger.log(
      `分账金额计算: 总金额=${amount}分, 主办方=${hostAmount}分(${PROFIT_SHARING_CONFIG.HOST_RATIO * 100}%), 平台收取=${platformAmount}分(${PROFIT_SHARING_CONFIG.PLATFORM_FEE_RATIO * 100}%), 平台利润=${Math.floor(amount * PROFIT_SHARING_CONFIG.PLATFORM_PROFIT_RATIO)}分`
    );

    // 检查是否配置了真实的微信支付
    if (!this.paymentService) {
      this.logger.warn('微信支付未配置，使用模拟分账');
      return this.mockProfitSharing(
        transactionId,
        hostOpenid,
        amount,
        orderId,
        hostAmount,
        platformAmount
      );
    }

    try {
      // 1. 添加分账接收方（主办方）
      await this.addProfitSharingReceiver(hostOpenid);

      // 2. 生成分账单号
      const outOrderNo = `PS${Date.now()}${Math.random().toString(36).substr(2, 6)}`;

      // 3. 请求分账
      // 注意：微信支付V3分账API要求 receivers 数组
      // 分账接收方列表：主办方 + 平台（可选）
      const receivers = [
        {
          type: 'PERSONAL_OPENID', // 个人接收方，使用 OPENID
          account: hostOpenid, // 主办方 OPENID
          amount: hostAmount, // 主办方分账金额（99.4%）
          description: PROFIT_SHARING_CONFIG.DESCRIPTION,
        },
      ];

      // 如果平台服务费 > 0，添加平台分账接收方
      // 注意：平台作为商户号，需要在微信支付后台配置为分账接收方
      // 这里暂时不添加平台分账，剩余资金自动留在平台商户账户

      this.logger.log(`请求分账: outOrderNo=${outOrderNo}, receivers=${JSON.stringify(receivers)}`);

      const result = await this.paymentService.profitSharing({
        transaction_id: transactionId,
        out_order_no: outOrderNo,
        receivers: receivers,
        finish: true, // 完成分账，解冻剩余资金
      });

      if (result.status === 200 || result.status === 201 || result.out_order_no) {
        this.logger.log(`分账成功: outOrderNo=${outOrderNo}, 主办方到账=${hostAmount}分`);

        // 更新分账记录
        await this.updateProfitSharingRecord(orderId, {
          profit_sharing_status: 'success',
          profit_sharing_out_order_no: outOrderNo,
          profit_sharing_time: new Date().toISOString(),
          host_amount: hostAmount,
          platform_amount: platformAmount,
        });

        return {
          success: true,
          transactionId,
          outOrderNo,
          hostAmount,
          platformAmount,
        };
      }

      this.logger.error('分账失败:', result);
      return {
        success: false,
        errorMsg: result.message || '分账请求失败',
      };
    } catch (error: any) {
      this.logger.error(`分账异常: ${error.message}`);
      return {
        success: false,
        errorMsg: error.message || '分账异常',
      };
    }
  }

  /**
   * 添加分账接收方
   * 文档: https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter8_1_8.shtml
   */
  private async addProfitSharingReceiver(openid: string): Promise<void> {
    try {
      // 检查接收方是否已存在
      const result = await this.paymentService.profitSharingAddReceiver({
        account: openid,
        relation_type: 'USER',
        type: 'PERSONAL_OPENID',
        name: '宴会主办方', // 可选，个人接收方可不传
      });

      this.logger.log(`添加分账接收方成功: openid=${openid}`);
    } catch (error: any) {
      // 如果是已存在的错误，忽略
      if (error.message?.includes('已存在') || error.code === 'RECEIVER_ALREADY_EXISTS') {
        this.logger.log(`分账接收方已存在: openid=${openid}`);
        return;
      }
      this.logger.warn(`添加分账接收方失败: ${error.message}`);
    }
  }

  /**
   * 【核心】分账失败重试机制
   *
   * @param transactionId 微信支付交易号
   * @param hostOpenid 主办方OPENID
   * @param amount 分账金额
   * @param orderId 业务订单号
   * @param maxRetries 最大重试次数（默认3次）
   * @returns 分账结果
   */
  async executeProfitSharingWithRetry(
    transactionId: string,
    hostOpenid: string,
    amount: number,
    orderId: string,
    maxRetries: number = 3
  ): Promise<ProfitSharingResult> {
    let lastError: string = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      this.logger.log(`分账第${attempt}次尝试: orderId=${orderId}`);

      const result = await this.executeProfitSharing(transactionId, hostOpenid, amount, orderId);

      if (result.success) {
        return result;
      }

      lastError = result.errorMsg || '未知错误';

      // 如果不是最后一次重试，等待一段时间再重试
      if (attempt < maxRetries) {
        const delay = attempt * 1000; // 递增延迟：1s, 2s, 3s
        this.logger.log(`分账失败，等待${delay}ms后重试...`);
        await this.sleep(delay);
      }
    }

    // 所有重试都失败，通知管理员
    this.logger.error(`分账失败，已重试${maxRetries}次: orderId=${orderId}, error=${lastError}`);
    await this.notifyAdmin(orderId, lastError);

    // 更新分账记录为失败
    await this.updateProfitSharingRecord(orderId, {
      profit_sharing_status: 'failed',
      profit_sharing_error: lastError,
      profit_sharing_retry_count: maxRetries,
    });

    return {
      success: false,
      errorMsg: `分账失败，已重试${maxRetries}次: ${lastError}`,
    };
  }

  /**
   * 通知管理员分账失败
   */
  private async notifyAdmin(orderId: string, errorMsg: string): Promise<void> {
    try {
      // 获取订单详情
      const { data: giftRecord } = await supabase
        .from('gift_records')
        .select('*, banquets(name, host_openid)')
        .eq('id', orderId)
        .single();

      if (!giftRecord) {
        this.logger.error('通知管理员失败：订单不存在');
        return;
      }

      // 创建管理员通知记录
      await supabase.from('admin_notifications').insert({
        type: 'profit_sharing_failed',
        title: '分账失败通知',
        content: `订单${orderId}分账失败，已重试3次。错误信息：${errorMsg}。宴会：${(giftRecord.banquets as any)?.name}，金额：${giftRecord.amount}分`,
        order_id: orderId,
        host_openid: (giftRecord.banquets as any)?.host_openid,
        amount: giftRecord.amount,
        error_message: errorMsg,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      this.logger.log('已创建管理员通知记录');
    } catch (error: any) {
      this.logger.error(`通知管理员失败: ${error.message}`);
    }
  }

  /**
   * 更新分账记录
   */
  private async updateProfitSharingRecord(
    orderId: string,
    updates: Record<string, any>
  ): Promise<void> {
    try {
      const { error } = await supabase.from('gift_records').update(updates).eq('id', orderId);

      if (error) {
        this.logger.error('更新分账记录失败:', error);
      }
    } catch (error: any) {
      this.logger.error(`更新分账记录异常: ${error.message}`);
    }
  }

  /**
   * 模拟分账（开发测试用）
   */
  private async mockProfitSharing(
    transactionId: string,
    hostOpenid: string,
    amount: number,
    orderId: string,
    hostAmount: number,
    platformAmount: number
  ): Promise<ProfitSharingResult> {
    const platformProfit = Math.floor(amount * PROFIT_SHARING_CONFIG.PLATFORM_PROFIT_RATIO);
    this.logger.log(
      `模拟分账成功: 总金额=${amount}分, 主办方=${hostAmount}分, 平台收取=${platformAmount}分, 平台利润=${platformProfit}分`
    );

    // 更新分账记录
    await this.updateProfitSharingRecord(orderId, {
      profit_sharing_status: 'success',
      profit_sharing_out_order_no: `MOCK_PS_${Date.now()}`,
      profit_sharing_time: new Date().toISOString(),
      host_amount: hostAmount,
      platform_amount: platformAmount,
    });

    return {
      success: true,
      transactionId,
      outOrderNo: `MOCK_PS_${Date.now()}`,
      hostAmount,
      platformAmount,
    };
  }

  /**
   * 查询分账结果
   */
  async queryProfitSharing(outOrderNo: string): Promise<any> {
    if (!this.paymentService) {
      return {
        success: true,
        data: { status: 'FINISHED' },
      };
    }

    try {
      const result = await this.paymentService.profitSharingQuery({
        out_order_no: outOrderNo,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      this.logger.error(`查询分账结果失败: ${error.message}`);
      return {
        success: false,
        errorMsg: error.message,
      };
    }
  }

  /**
   * 解冻剩余资金
   * 在分账完成后，需要解冻剩余资金才能进行后续操作
   */
  async unfreezeRemaining(transactionId: string, orderId: string): Promise<boolean> {
    if (!this.paymentService) {
      this.logger.log('模拟解冻剩余资金成功');
      return true;
    }

    try {
      const result = await this.paymentService.profitSharingUnfreeze({
        transaction_id: transactionId,
        out_order_no: `UNFREEZE_${Date.now()}`,
        description: '解冻剩余资金',
      });

      if (result.status === 200 || result.status === 201) {
        this.logger.log('解冻剩余资金成功');
        return true;
      }

      this.logger.error('解冻剩余资金失败:', result);
      return false;
    } catch (error: any) {
      this.logger.error(`解冻剩余资金异常: ${error.message}`);
      return false;
    }
  }

  /**
   * 工具函数：休眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
