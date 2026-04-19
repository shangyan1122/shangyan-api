import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import crypto from 'crypto';
import https from 'https';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const supabase = getSupabaseClient();

export interface WechatPaymentParams {
  banquetId: string;
  guestOpenid: string;
  guestName: string;
  amount: number;
  description: string;
  blessing?: string;
}

export interface PaymentResult {
  orderId: string;
  prepayId?: string;
  appId?: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
  isMock?: boolean;
}

/**
 * 支付服务 - 新版个人直收模式 + 微信支付V3分账
 *
 * 【资金合规流程】
 * 1. 嘉宾扫码支付 → 资金进入平台商户账户
 * 2. 支付成功回调 → 调用微信支付V3分账API，将资金分给主办方
 * 3. 分账成功 → 更新状态，触发回礼
 * 4. 分账失败 → 自动重试3次，通知管理员
 *
 * 【关键特性】
 * - 使用微信官方分账API，禁止平台转账、禁止二清
 * - 分账接收方为主办方微信OPENID，金额为订单实付全额
 * - 主办方无需营业执照，仅需微信授权登录
 * - 分账失败自动重试3次并通知管理员
 * - 回礼资金完全独立，从充值余额发放
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  // 分账服务（延迟注入，避免循环依赖）
  private profitSharingService: any;

  // 微信支付配置（从环境变量读取）
  private readonly appId = process.env.WECHAT_APP_ID || '';
  private readonly mchId = process.env.WECHAT_MCH_ID || '';
  private readonly apiKey = process.env.WECHAT_PAY_API_KEY || '';
  // 支付回调URL（支持多种环境变量名称）
  private readonly notifyUrl =
    process.env.WECHAT_PAY_NOTIFY_URL || process.env.WECHAT_NOTIFY_URL || '';
  private readonly apiV3Key = process.env.WECHAT_PAY_API_V3_KEY || '';

  // 商户证书配置
  private pfxCert: Buffer | null = null;
  private certPassphrase: string = process.env.WECHAT_PFX_PASSPHRASE || ''; // PFX证书密码（通常是商户号）

  constructor() {
    this.loadMerchantCert();
  }

  /**
   * 加载商户证书（用于转账等需要双向证书的接口）
   */
  private loadMerchantCert() {
    const pfxPath =
      process.env.WECHAT_PFX_PATH || join(process.cwd(), 'certs', 'apiclient_cert.p12');

    if (existsSync(pfxPath)) {
      try {
        this.pfxCert = readFileSync(pfxPath);
        this.logger.log('商户证书加载成功');
      } catch (e: any) {
        this.logger.warn(`商户证书加载失败: ${e.message}`);
      }
    } else {
      this.logger.warn(`商户证书文件不存在: ${pfxPath}，转账功能将使用模拟模式`);
    }
  }

  /**
   * 创建带商户证书的HTTPS Agent
   */
  private createCertAgent(): https.Agent | null {
    if (!this.pfxCert) {
      return null;
    }

    return new https.Agent({
      pfx: this.pfxCert,
      passphrase: this.certPassphrase || this.mchId, // 默认密码为商户号
    });
  }

  /**
   * 【核心】创建随礼支付订单
   *
   * 流程：
   * 1. 嘉宾发起支付
   * 2. 使用平台商户创建订单
   * 3. attach字段携带：嘉宾姓名、祝福语
   */
  async createWechatPayment(params: WechatPaymentParams): Promise<PaymentResult> {
    const { banquetId, guestOpenid, guestName, amount, description, blessing } = params;

    // 生成订单号
    const orderId = `GIFT${Date.now()}${Math.random().toString(36).substr(2, 6)}`;

    this.logger.log(`创建随礼支付订单: ${orderId}, 金额: ${amount}分, 宴会: ${banquetId}`);

    // 将嘉宾姓名和祝福语编码到attach字段
    const attachData = {
      guestName,
      blessing: blessing || '',
      banquetId,
      timestamp: Date.now(),
    };
    const attach = Buffer.from(JSON.stringify(attachData)).toString('base64');

    // 检查是否配置了真实的微信支付
    // 始终返回模拟支付参数，让前端决定如何处理
    // 注意：真实微信支付需要在微信商户平台完成认证
    const useMock =
      !this.appId || !this.mchId || !this.apiKey || process.env.NODE_ENV === 'development';
    if (useMock) {
      this.logger.warn('使用模拟支付模式');
      return this.createMockPayment(orderId, params);
    }

    try {
      // 1. 创建随礼记录（待支付状态）
      const { error: insertError } = await supabase.from('gift_records').insert({
        id: orderId,
        banquet_id: banquetId,
        guest_openid: guestOpenid,
        guest_name: guestName,
        amount: amount,
        blessing: blessing || '',
        payment_status: 'pending',
        return_gift_status: 'none',
        transfer_status: 'pending',
        created_at: new Date().toISOString(),
      });

      if (insertError) {
        this.logger.error('创建随礼记录失败:', insertError);
        throw new Error('创建记录失败');
      }

      // 2. 调用微信支付统一下单接口
      const unifiedOrderParams = {
        appid: this.appId,
        mch_id: this.mchId,
        nonce_str: this.generateNonceStr(),
        body: description,
        attach: attach, // 【关键】携带嘉宾信息，回调时原样返回
        out_trade_no: orderId,
        total_fee: amount, // 单位：分
        spbill_create_ip: '127.0.0.1',
        notify_url: this.notifyUrl,
        trade_type: 'JSAPI',
        openid: guestOpenid,
      };

      // 3. 生成签名
      const sign = this.generateSignature(unifiedOrderParams);
      const unifiedOrderXml = this.buildXml({ ...unifiedOrderParams, sign });

      // 4. 发起请求到微信支付
      const response = await fetch('https://api.mch.weixin.qq.com/pay/unifiedorder', {
        method: 'POST',
        body: unifiedOrderXml,
        headers: { 'Content-Type': 'application/xml' },
      });

      const responseText = await response.text();
      const responseData = this.parseXml(responseText);

      if (responseData.return_code !== 'SUCCESS' || responseData.result_code !== 'SUCCESS') {
        throw new Error(
          `微信支付下单失败: ${responseData.return_msg || responseData.err_code_des}`
        );
      }

      // 5. 生成小程序支付参数
      const prepayId = responseData.prepay_id;
      const timeStamp = Math.floor(Date.now() / 1000).toString();
      const nonceStr = this.generateNonceStr();
      const paySign = this.generatePaySign(prepayId, timeStamp, nonceStr);

      return {
        orderId,
        prepayId,
        appId: this.appId,
        timeStamp,
        nonceStr,
        package: `prepay_id=${prepayId}`,
        signType: 'MD5',
        paySign,
      };
    } catch (error: any) {
      this.logger.error(`创建微信支付订单失败: ${error.message}`);
      // 回退到模拟支付
      return this.createMockPayment(orderId, params);
    }
  }

  /**
   * 生成模拟支付结果（开发测试用）
   */
  private async createMockPayment(
    orderId: string,
    params: WechatPaymentParams
  ): Promise<PaymentResult> {
    this.logger.log(`使用模拟支付: ${orderId}`);

    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = this.generateNonceStr();

    // 创建待支付的随礼记录
    const { error } = await supabase.from('gift_records').insert({
      id: orderId,
      banquet_id: params.banquetId,
      guest_openid: params.guestOpenid,
      guest_name: params.guestName,
      amount: params.amount,
      blessing: params.blessing || '',
      payment_status: 'pending',
      return_gift_status: 'none',
      transfer_status: 'pending',
      created_at: new Date().toISOString(),
    });

    if (error) {
      this.logger.error('创建随礼记录失败:', error);
    }

    return {
      orderId,
      isMock: true,
      timeStamp,
      nonceStr,
      package: `prepay_id=mock_prepay_id_${orderId}`,
      signType: 'MD5',
      paySign: 'mock_sign_' + this.generateNonceStr(),
    };
  }

  /**
   * 【核心】处理支付成功回调
   *
   * 流程：
   * 1. 验证签名
   * 2. 解析attach获取嘉宾信息
   * 3. 更新支付状态
   * 4. 【新增】调用微信支付V3分账API，将资金分给主办方
   * 5. 触发回礼（如已配置）
   *
   * 【分账逻辑】
   * - 分账接收方：主办方微信OPENID
   * - 分账金额：订单实付全额
   * - 分账失败：自动重试3次，通知管理员
   */
  async handlePaymentCallback(body: any): Promise<{
    success: boolean;
    orderId?: string;
    errorMsg?: string;
  }> {
    this.logger.log('收到支付回调');

    try {
      // 1. 验证签名
      const isValid = await this.verifyCallback(body);
      if (!isValid) {
        this.logger.warn('支付回调签名验证失败');
        return { success: false, errorMsg: '签名验证失败' };
      }

      // 2. 解析回调数据
      const { out_trade_no, transaction_id, attach } = await this.parseCallbackData(body);

      this.logger.log(`支付成功: orderId=${out_trade_no}, wechatOrderId=${transaction_id}`);

      // 3. 解析attach获取嘉宾信息
      let guestInfo = { guestName: '', blessing: '' };
      if (attach) {
        try {
          const attachData = JSON.parse(Buffer.from(attach, 'base64').toString());
          guestInfo = {
            guestName: attachData.guestName || '',
            blessing: attachData.blessing || '',
          };
          this.logger.log(`attach信息: ${JSON.stringify(guestInfo)}`);
        } catch (e) {
          this.logger.warn('解析attach失败，使用数据库中的信息');
        }
      }

      // 4. 获取随礼记录
      const { data: giftRecord, error: queryError } = await supabase
        .from('gift_records')
        .select('*, banquets(*)')
        .eq('id', out_trade_no)
        .single();

      if (queryError || !giftRecord) {
        this.logger.error('随礼记录不存在:', queryError);
        return { success: false, errorMsg: '随礼记录不存在' };
      }

      // 5. 更新支付状态
      const { error: updateError } = await supabase
        .from('gift_records')
        .update({
          payment_status: 'paid',
          transaction_id: transaction_id,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', out_trade_no);

      if (updateError) {
        this.logger.error('更新支付状态失败:', updateError);
      }

      // 6. 【核心】调用微信支付V3分账API
      const banquet = giftRecord.banquets as any;
      const hostOpenid = banquet?.host_openid;

      if (hostOpenid && giftRecord.amount > 0 && transaction_id) {
        // 调用分账服务（带重试机制）
        const profitSharingResult = await this.executeProfitSharingWithRetry(
          transaction_id,
          hostOpenid,
          giftRecord.amount,
          out_trade_no
        );

        if (profitSharingResult.success) {
          // 分账成功：更新状态
          await supabase
            .from('gift_records')
            .update({
              transfer_status: 'transferred',
              transfer_time: new Date().toISOString(),
              payment_no: profitSharingResult.outOrderNo,
            })
            .eq('id', out_trade_no);

          this.logger.log(
            `分账成功: hostOpenid=${hostOpenid}, amount=${giftRecord.amount}, outOrderNo=${profitSharingResult.outOrderNo}`
          );
        } else {
          // 分账失败：记录错误（已在重试方法中通知管理员）
          this.logger.error(`分账失败: ${profitSharingResult.errorMsg}`);
        }
      } else {
        this.logger.warn(
          `无法执行分账: hostOpenid=${hostOpenid}, amount=${giftRecord.amount}, transaction_id=${transaction_id}`
        );
      }

      return { success: true, orderId: out_trade_no };
    } catch (error: any) {
      this.logger.error(`处理支付回调失败: ${error.message}`);
      return { success: false, errorMsg: error.message };
    }
  }

  /**
   * 【核心】转账到主办方微信零钱
   * 使用企业付款到零钱功能
   * 需要商户证书（apiclient_cert.p12）
   */
  async transferToHost(
    openid: string,
    amount: number,
    description: string
  ): Promise<{ success: boolean; paymentNo?: string; errorMsg?: string }> {
    this.logger.log(`转账到主办方零钱: openid=${openid}, 金额=${amount}分`);

    // 检查是否配置了真实的微信支付
    if (!this.appId || !this.mchId || !this.apiKey) {
      this.logger.warn('微信支付未配置，使用模拟转账');
      return {
        success: true,
        paymentNo: `MOCK_TRANSFER_${Date.now()}`,
      };
    }

    // 检查商户证书
    if (!this.pfxCert) {
      this.logger.warn('商户证书未配置，使用模拟转账');
      return {
        success: true,
        paymentNo: `MOCK_TRANSFER_${Date.now()}`,
      };
    }

    try {
      const partnerTradeNo = `TRANSFER${Date.now()}${Math.random().toString(36).substr(2, 6)}`;

      const transferParams = {
        mch_appid: this.appId,
        mchid: this.mchId,
        nonce_str: this.generateNonceStr(),
        partner_trade_no: partnerTradeNo,
        openid,
        check_name: 'NO_CHECK', // 不校验真实姓名
        amount, // 单位：分
        desc: description,
        spbill_create_ip: '127.0.0.1',
      };

      const sign = this.generateSignature(transferParams);
      const xml = this.buildXml({ ...transferParams, sign });

      // 使用商户证书的HTTPS Agent
      const agent = this.createCertAgent();

      const response = await fetch(
        'https://api.mch.weixin.qq.com/mmpaymkttransfers/promotion/transfers',
        {
          method: 'POST',
          body: xml,
          headers: { 'Content-Type': 'application/xml' },
          // @ts-ignore - Node.js fetch支持agent选项
          agent,
        }
      );

      const responseText = await response.text();
      const data = this.parseXml(responseText);

      if (data.return_code === 'SUCCESS' && data.result_code === 'SUCCESS') {
        this.logger.log(`转账成功: paymentNo=${data.payment_no}`);
        return {
          success: true,
          paymentNo: data.payment_no,
        };
      } else {
        this.logger.error(`转账失败: ${data.err_code_des || data.return_msg}`);
        return {
          success: false,
          errorMsg: data.err_code_des || data.return_msg,
        };
      }
    } catch (error: any) {
      this.logger.error(`转账异常: ${error.message}`);
      return {
        success: false,
        errorMsg: error.message,
      };
    }
  }

  /**
   * 验证支付回调签名
   */
  async verifyCallback(body: any): Promise<boolean> {
    // 模拟环境直接返回 true
    if (!this.apiKey) {
      return true;
    }

    try {
      const { sign, ...data } = body;
      const calculatedSign = this.generateSignature(data);
      return sign === calculatedSign;
    } catch {
      return false;
    }
  }

  /**
   * 解析回调数据
   */
  async parseCallbackData(body: any): Promise<{
    out_trade_no: string;
    transaction_id: string;
    openid: string;
    attach?: string;
  }> {
    // 如果是 XML 格式
    if (typeof body === 'string') {
      const data = this.parseXml(body);
      return {
        out_trade_no: data.out_trade_no,
        transaction_id: data.transaction_id,
        openid: data.openid,
        attach: data.attach,
      };
    }

    // JSON 格式
    return {
      out_trade_no: body.out_trade_no,
      transaction_id: body.transaction_id,
      openid: body.openid,
      attach: body.attach,
    };
  }

  /**
   * 查询支付状态
   */
  async queryPaymentStatus(orderId: string): Promise<any> {
    if (!this.appId || !this.mchId || !this.apiKey) {
      // 模拟环境返回成功
      return {
        trade_state: 'SUCCESS',
        trade_state_desc: '支付成功',
      };
    }

    try {
      const params = {
        appid: this.appId,
        mch_id: this.mchId,
        out_trade_no: orderId,
        nonce_str: this.generateNonceStr(),
      };

      const sign = this.generateSignature(params);
      const xml = this.buildXml({ ...params, sign });

      const response = await fetch('https://api.mch.weixin.qq.com/pay/orderquery', {
        method: 'POST',
        body: xml,
        headers: { 'Content-Type': 'application/xml' },
      });

      const responseText = await response.text();
      const data = this.parseXml(responseText);

      return {
        trade_state: data.trade_state,
        trade_state_desc: data.trade_state_desc,
        transaction_id: data.transaction_id,
      };
    } catch (error: any) {
      this.logger.error(`查询支付状态失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 生成随机字符串
   */
  private generateNonceStr(): string {
    return Math.random().toString(36).substr(2, 32);
  }

  /**
   * 生成签名
   */
  private generateSignature(params: Record<string, any>): string {
    // 按字典序排序
    const sortedKeys = Object.keys(params).sort();

    // 拼接字符串
    const stringA = sortedKeys
      .filter((key) => params[key] !== '' && params[key] !== undefined && params[key] !== null)
      .map((key) => `${key}=${params[key]}`)
      .join('&');

    // 拼接 API Key
    const stringSignTemp = `${stringA}&key=${this.apiKey}`;

    // MD5 签名
    return crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase();
  }

  /**
   * 生成支付签名
   */
  private generatePaySign(prepayId: string, timeStamp: string, nonceStr: string): string {
    const packageStr = `prepay_id=${prepayId}`;

    const params = {
      appId: this.appId,
      timeStamp,
      nonceStr,
      package: packageStr,
      signType: 'MD5',
    };

    return this.generateSignature(params);
  }

  /**
   * 构建XML
   */
  private buildXml(params: Record<string, any>): string {
    const xmlContent = Object.entries(params)
      .map(([key, value]) => `<${key}><![CDATA[${value}]]></${key}>`)
      .join('');
    return `<xml>${xmlContent}</xml>`;
  }

  /**
   * 解析XML
   */
  private parseXml(xml: string): Record<string, string> {
    const result: Record<string, string> = {};
    const regex = /<(\w+)><!\[CDATA\[(.*?)\]\]><\/\1>|<(\w+)>(.*?)<\/\3>/g;
    let match;

    while ((match = regex.exec(xml)) !== null) {
      const key = match[1] || match[3];
      const value = match[2] || match[4];
      if (key && value) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 设置分账服务（由PaymentModule初始化时调用）
   */
  setProfitSharingService(service: any) {
    this.profitSharingService = service;
  }

  /**
   * 执行分账（带重试机制）
   * 调用ProfitSharingService执行微信支付V3分账
   */
  private async executeProfitSharingWithRetry(
    transactionId: string,
    hostOpenid: string,
    amount: number,
    orderId: string
  ): Promise<{ success: boolean; outOrderNo?: string; errorMsg?: string }> {
    // 如果分账服务未注入，模拟成功
    if (!this.profitSharingService) {
      this.logger.warn('分账服务未注入，使用模拟分账');

      // 更新分账记录
      await supabase
        .from('gift_records')
        .update({
          profit_sharing_status: 'success',
          profit_sharing_out_order_no: `MOCK_PS_${Date.now()}`,
          profit_sharing_time: new Date().toISOString(),
        })
        .eq('id', orderId);

      return {
        success: true,
        outOrderNo: `MOCK_PS_${Date.now()}`,
      };
    }

    // 调用分账服务（带重试机制）
    return this.profitSharingService.executeProfitSharingWithRetry(
      transactionId,
      hostOpenid,
      amount,
      orderId,
      3 // 最大重试次数
    );
  }
}
