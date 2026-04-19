import { Injectable, Logger } from '@nestjs/common';
import { wechatPayConfig } from './wechat-pay.config';
import { randomUUID } from 'crypto';

@Injectable()
export class WechatPayService {
  private readonly logger = new Logger(WechatPayService.name);
  private paymentService: any;

  constructor() {
    this.initPaymentService();
  }

  private initPaymentService() {
    try {
      // 动态导入 wechatpay-node-v3
      const WechatPay = require('wechatpay-node-v3');

      // 检查配置是否完整
      if (
        !wechatPayConfig.appId ||
        !wechatPayConfig.mchId ||
        wechatPayConfig.appId === 'wx_app_id' ||
        wechatPayConfig.mchId === 'merchant_id'
      ) {
        this.logger.warn('微信支付配置不完整，使用模拟模式');
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
      this.logger.log('微信支付服务初始化成功');
    } catch (error: any) {
      this.logger.warn(`微信支付服务初始化失败: ${error.message}，使用模拟模式`);
      this.paymentService = null;
    }
  }

  /**
   * 创建 JSAPI 支付订单
   */
  async createJsapiOrder(params: {
    openid: string;
    amount: number;
    description: string;
    orderId: string;
  }) {
    const { openid, amount, description, orderId } = params;

    try {
      const result = await this.paymentService.transactions_jsapi({
        description,
        out_trade_no: orderId,
        notify_url: wechatPayConfig.notifyUrl,
        amount: {
          total: Math.round(amount), // 单位：分
          currency: 'CNY',
        },
        payer: {
          openid,
        },
      });

      if (result.status === 200 || result.status === 201) {
        // 生成前端支付参数
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const nonceStr = randomUUID().replace(/-/g, '');
        const packageStr = `prepay_id=${result.prepay_id}`;

        const paySign = this.paymentService.getPaySign(
          wechatPayConfig.appId,
          timestamp,
          nonceStr,
          packageStr
        );

        return {
          success: true,
          data: {
            timeStamp: timestamp,
            nonceStr,
            package: packageStr,
            signType: 'RSA',
            paySign,
            prepayId: result.prepay_id,
          },
        };
      }

      this.logger.error('创建支付订单失败:', result);
      return {
        success: false,
        message: '创建支付订单失败',
      };
    } catch (error) {
      this.logger.error('创建支付订单异常:', error);
      return {
        success: false,
        message: error.message || '创建支付订单异常',
      };
    }
  }

  /**
   * 查询订单
   */
  async queryOrder(orderId: string) {
    try {
      const result = await this.paymentService.query({
        out_trade_no: orderId,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('查询订单失败:', error);
      return {
        success: false,
        message: error.message || '查询订单失败',
      };
    }
  }

  /**
   * 关闭订单
   */
  async closeOrder(orderId: string) {
    try {
      await this.paymentService.close({
        out_trade_no: orderId,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('关闭订单失败:', error);
      return {
        success: false,
        message: error.message || '关闭订单失败',
      };
    }
  }

  /**
   * 申请退款
   */
  async refund(params: {
    orderId: string;
    refundId: string;
    totalAmount: number;
    refundAmount: number;
    reason?: string;
  }) {
    const { orderId, refundId, totalAmount, refundAmount, reason } = params;

    try {
      const result = await this.paymentService.refunds({
        out_trade_no: orderId,
        out_refund_no: refundId,
        reason: reason || '用户申请退款',
        amount: {
          total: Math.round(totalAmount),
          refund: Math.round(refundAmount),
          currency: 'CNY',
        },
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('申请退款失败:', error);
      return {
        success: false,
        message: error.message || '申请退款失败',
      };
    }
  }

  /**
   * 验证支付回调签名
   */
  verifyNotify(headers: any, body: string): boolean {
    try {
      const signature = headers['wechatpay-signature'];
      const timestamp = headers['wechatpay-timestamp'];
      const nonce = headers['wechatpay-nonce'];
      const serial = headers['wechatpay-serial'];

      return this.paymentService.verifySign({
        signature,
        timestamp,
        nonce,
        serial,
        body,
      });
    } catch (error) {
      this.logger.error('验证回调签名失败:', error);
      return false;
    }
  }

  /**
   * 解密回调数据
   */
  decryptNotify(resource: any): any {
    try {
      return this.paymentService.decipher_gcm(
        resource.ciphertext,
        resource.associated_data,
        resource.nonce,
        wechatPayConfig.apiV3Key
      );
    } catch (error) {
      this.logger.error('解密回调数据失败:', error);
      return null;
    }
  }

  /**
   * 商家转账到零钱
   * 文档: https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter4_3_1.shtml
   * 用于发送红包、提现等场景
   */
  async transferToBalance(params: {
    openid: string;
    amount: number;
    description: string;
    orderId?: string;
  }): Promise<{ success: boolean; paymentNo?: string; errorMsg?: string }> {
    const { openid, amount, description, orderId } = params;

    this.logger.log(`商家转账到零钱: openid=${openid}, 金额=${amount}分`);

    // 检查是否配置了真实的微信支付
    if (!wechatPayConfig.appId || !wechatPayConfig.mchId) {
      this.logger.warn('微信支付未配置，使用模拟转账');
      return {
        success: true,
        paymentNo: `MOCK${Date.now()}`,
      };
    }

    try {
      // 生成商家批次单号
      const outBatchNo = orderId || `BATCH${Date.now()}${Math.random().toString(36).substr(2, 6)}`;
      // 生成商家明细单号
      const outDetailNo = `DETAIL${Date.now()}${Math.random().toString(36).substr(2, 6)}`;

      const result = await this.paymentService.transferBatch({
        out_batch_no: outBatchNo,
        batch_name: description,
        batch_remark: description,
        total_amount: amount,
        total_num: 1,
        transfer_detail_list: [
          {
            out_detail_no: outDetailNo,
            transfer_amount: amount,
            transfer_remark: description,
            openid,
          },
        ],
      });

      if (result.status === 200 || result.status === 201 || result.batch_id) {
        this.logger.log(`商家转账成功: batchId=${result.batch_id}`);
        return {
          success: true,
          paymentNo: result.batch_id || outBatchNo,
        };
      }

      this.logger.error('商家转账失败:', result);
      return {
        success: false,
        errorMsg: result.message || '转账失败',
      };
    } catch (error: any) {
      this.logger.error('商家转账异常:', error);
      return {
        success: false,
        errorMsg: error.message || '转账异常',
      };
    }
  }
}
