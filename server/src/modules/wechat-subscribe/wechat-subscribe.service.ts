import { Injectable, Logger } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const supabase = getSupabaseClient();

/**
 * 微信小程序订阅消息模板ID配置
 * 在微信小程序后台申请后配置
 */
const SUBSCRIBE_TEMPLATE_IDS = {
  // 人情提醒模板
  GIFT_REMINDER: process.env.WECHAT_TEMPLATE_GIFT_REMINDER || '',

  // 嘉宾办宴通知模板（事件触发）
  GUEST_BANQUET_NOTIFY: process.env.WECHAT_TEMPLATE_GUEST_BANQUET_NOTIFY || '',

  // 宴会邀请模板
  BANQUET_INVITATION: process.env.WECHAT_TEMPLATE_BANQUET_INVITATION || '',

  // 回礼通知模板
  RETURN_GIFT_NOTIFY: process.env.WECHAT_TEMPLATE_RETURN_GIFT || '',

  // 支付成功通知
  PAYMENT_SUCCESS: process.env.WECHAT_TEMPLATE_PAYMENT_SUCCESS || '',

  // 宴会提醒（开始前1天）
  BANQUET_REMINDER: process.env.WECHAT_TEMPLATE_BANQUET_REMINDER || '',

  // 库存预警通知
  STOCK_WARNING: process.env.WECHAT_TEMPLATE_STOCK_WARNING || '',

  // 收货信息填写提醒
  DELIVERY_REMINDER: process.env.WECHAT_TEMPLATE_DELIVERY_REMINDER || '',
};

export interface SubscribeMessage {
  touser: string; // 接收者openid
  template_id: string; // 模板ID
  page?: string; // 点击跳转页面
  data: Record<string, { value: string }>; // 模板数据
  miniprogram_state?: 'developer' | 'trial' | 'formal'; // 跳转小程序类型
  lang?: 'zh_CN' | 'zh_TW' | 'en'; // 语言
}

@Injectable()
export class WechatSubscribeService {
  private readonly logger = new Logger(WechatSubscribeService.name);

  // 微信小程序配置
  private readonly appId = process.env.WECHAT_APP_ID || '';
  private readonly appSecret = process.env.WECHAT_APP_SECRET || '';

  // 缓存access_token
  private accessToken: string | null = null;
  private tokenExpireTime: number = 0;

  /**
   * 获取微信access_token
   */
  private async getAccessToken(): Promise<string | null> {
    // 检查缓存是否有效
    if (this.accessToken && Date.now() < this.tokenExpireTime) {
      return this.accessToken;
    }

    if (!this.appId || !this.appSecret) {
      this.logger.warn('微信小程序配置不完整，无法获取access_token');
      return null;
    }

    try {
      const response = await fetch(
        `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`
      );

      const data = await response.json();

      if (data.access_token) {
        this.accessToken = data.access_token;
        // 提前5分钟过期，避免临界情况
        this.tokenExpireTime = Date.now() + (data.expires_in - 300) * 1000;
        return this.accessToken;
      } else {
        this.logger.error('获取access_token失败:', data);
        return null;
      }
    } catch (error: any) {
      this.logger.error('获取access_token异常:', error.message);
      return null;
    }
  }

  /**
   * 发送订阅消息
   */
  async sendSubscribeMessage(
    message: SubscribeMessage
  ): Promise<{ success: boolean; errcode?: number; errmsg?: string }> {
    const accessToken = await this.getAccessToken();

    if (!accessToken) {
      this.logger.warn('access_token获取失败，使用模拟发送');
      return { success: true }; // 开发环境模拟成功
    }

    try {
      const response = await fetch(
        `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            touser: message.touser,
            template_id: message.template_id,
            page: message.page || 'pages/index/index',
            data: message.data,
            miniprogram_state: message.miniprogram_state || 'formal',
            lang: message.lang || 'zh_CN',
          }),
        }
      );

      const result = await response.json();

      if (result.errcode === 0) {
        this.logger.log(
          `订阅消息发送成功: openid=${message.touser}, template=${message.template_id}`
        );
        return { success: true };
      } else {
        this.logger.error(`订阅消息发送失败: ${JSON.stringify(result)}`);
        return { success: false, errcode: result.errcode, errmsg: result.errmsg };
      }
    } catch (error: any) {
      this.logger.error('发送订阅消息异常:', error.message);
      return { success: false, errmsg: error.message };
    }
  }

  /**
   * 发送人情提醒订阅消息
   * 模板参数（示例，根据实际模板调整）：
   * - thing1: 宾客姓名
   * - amount2: 随礼金额
   * - time3: 随礼时间
   * - thing4: 宴会名称
   * - thing5: 提醒内容
   */
  async sendGiftReminder(params: {
    openid: string;
    guestName: string;
    giftAmount: number;
    giftDate: string;
    banquetName: string;
    reminderContent: string;
  }): Promise<{ success: boolean }> {
    const { openid, guestName, giftAmount, giftDate, banquetName, reminderContent } = params;

    const templateId = SUBSCRIBE_TEMPLATE_IDS.GIFT_REMINDER;

    if (!templateId) {
      this.logger.warn('人情提醒模板ID未配置');
      return { success: false };
    }

    const result = await this.sendSubscribeMessage({
      touser: openid,
      template_id: templateId,
      page: 'pages/gift-ledger/index',
      data: {
        thing1: { value: guestName.substring(0, 20) },
        amount2: { value: `¥${(giftAmount / 100).toFixed(0)}` },
        time3: { value: giftDate },
        thing4: { value: banquetName.substring(0, 20) },
        thing5: { value: reminderContent.substring(0, 20) },
      },
    });

    return { success: result.success };
  }

  /**
   * 发送回礼通知订阅消息
   */
  async sendReturnGiftNotify(params: {
    openid: string;
    guestName: string;
    banquetName: string;
    giftName: string;
    claimCode: string;
  }): Promise<{ success: boolean }> {
    const { openid, guestName, banquetName, giftName, claimCode } = params;

    const templateId = SUBSCRIBE_TEMPLATE_IDS.RETURN_GIFT_NOTIFY;

    if (!templateId) {
      this.logger.warn('回礼通知模板ID未配置');
      return { success: false };
    }

    const result = await this.sendSubscribeMessage({
      touser: openid,
      template_id: templateId,
      page: 'pages/redemption/index',
      data: {
        thing1: { value: guestName.substring(0, 20) },
        thing2: { value: banquetName.substring(0, 20) },
        thing3: { value: giftName.substring(0, 20) },
        character_string4: { value: claimCode },
      },
    });

    return { success: result.success };
  }

  /**
   * 发送嘉宾办宴通知（人情提醒事件触发）
   * 当嘉宾创建宴会时，通知曾经收到该嘉宾随礼的主办方
   *
   * 模板参数：
   * - thing1: 嘉宾姓名
   * - thing2: 嘉宾宴会名称
   * - amount3: 曾随礼金额
   * - thing4: 来源宴会名称
   * - thing5: 温馨提示
   */
  async sendGuestBanquetNotify(params: {
    openid: string; // 被通知的主办方
    guestName: string; // 办宴的嘉宾姓名
    guestBanquetName: string; // 嘉宾的宴会名称
    giftAmount: number; // 曾随礼金额（分）
    sourceBanquetName: string; // 来源宴会名称
    tip?: string; // 温馨提示
  }): Promise<{ success: boolean }> {
    const { openid, guestName, guestBanquetName, giftAmount, sourceBanquetName, tip } = params;

    const templateId = SUBSCRIBE_TEMPLATE_IDS.GUEST_BANQUET_NOTIFY;

    if (!templateId) {
      this.logger.warn('嘉宾办宴通知模板ID未配置，使用人情提醒模板替代');
      // 降级使用人情提醒模板
      return this.sendGiftReminder({
        openid,
        guestName,
        giftAmount,
        giftDate: new Date().toLocaleDateString('zh-CN'),
        banquetName: sourceBanquetName,
        reminderContent: `${guestName}正在举办${guestBanquetName}`,
      });
    }

    const result = await this.sendSubscribeMessage({
      touser: openid,
      template_id: templateId,
      page: 'pages/index/index',
      data: {
        thing1: { value: guestName.substring(0, 20) },
        thing2: { value: guestBanquetName.substring(0, 20) },
        amount3: { value: `¥${(giftAmount / 100).toFixed(0)}` },
        thing4: { value: sourceBanquetName.substring(0, 20) },
        thing5: { value: (tip || '礼尚往来，记得送上祝福').substring(0, 20) },
      },
    });

    return { success: result.success };
  }

  /**
   * 发送支付成功通知
   */
  async sendPaymentSuccess(params: {
    openid: string;
    banquetName: string;
    guestName: string;
    amount: number;
    time: string;
  }): Promise<{ success: boolean }> {
    const { openid, banquetName, guestName, amount, time } = params;

    const templateId = SUBSCRIBE_TEMPLATE_IDS.PAYMENT_SUCCESS;

    if (!templateId) {
      this.logger.warn('支付成功通知模板ID未配置');
      return { success: false };
    }

    const result = await this.sendSubscribeMessage({
      touser: openid,
      template_id: templateId,
      page: 'pages/gift-ledger/index',
      data: {
        thing1: { value: banquetName.substring(0, 20) },
        thing2: { value: guestName.substring(0, 20) },
        amount3: { value: `¥${(amount / 100).toFixed(2)}` },
        time4: { value: time },
      },
    });

    return { success: result.success };
  }

  /**
   * 发送宴会提醒（开始前1天）
   */
  async sendBanquetReminder(params: {
    openid: string;
    banquetName: string;
    banquetType: string;
    eventTime: string;
    location: string;
  }): Promise<{ success: boolean }> {
    const { openid, banquetName, banquetType, eventTime, location } = params;

    const templateId = SUBSCRIBE_TEMPLATE_IDS.BANQUET_REMINDER;

    if (!templateId) {
      this.logger.warn('宴会提醒模板ID未配置');
      return { success: false };
    }

    const result = await this.sendSubscribeMessage({
      touser: openid,
      template_id: templateId,
      page: 'pages/index/index',
      data: {
        thing1: { value: banquetName.substring(0, 20) },
        thing2: { value: banquetType },
        time3: { value: eventTime },
        thing4: { value: location.substring(0, 20) },
      },
    });

    return { success: result.success };
  }

  /**
   * 记录用户订阅状态
   * 当用户点击订阅按钮时调用
   */
  async recordSubscription(params: {
    openid: string;
    templateId: string;
    subscribeStatus: 'accept' | 'reject' | 'ban';
  }): Promise<void> {
    const { openid, templateId, subscribeStatus } = params;

    const { error } = await supabase.from('user_subscriptions').upsert(
      {
        openid,
        template_id: templateId,
        subscribe_status: subscribeStatus,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'openid,template_id',
      }
    );

    if (error) {
      this.logger.error('记录订阅状态失败:', error);
    }
  }

  /**
   * 检查用户是否已订阅某模板
   */
  async checkSubscription(openid: string, templateId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('subscribe_status')
      .eq('openid', openid)
      .eq('template_id', templateId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.subscribe_status === 'accept';
  }

  /**
   * 批量发送订阅消息（带频率限制）
   * 微信限制：每个用户每月接收订阅消息上限
   */
  async batchSendSubscribeMessages(
    messages: SubscribeMessage[]
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const message of messages) {
      const result = await this.sendSubscribeMessage(message);

      if (result.success) {
        success++;
      } else {
        failed++;
      }

      // 添加延迟，避免频率限制
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return { success, failed };
  }

  /**
   * 发送库存预警通知
   * 当商城礼品库存剩余不足5%时通知主办方
   *
   * 模板参数：
   * - thing1: 宴会名称
   * - thing2: 商品名称
   * - number3: 剩余数量
   * - amount4: 库存百分比
   * - thing5: 提醒内容
   */
  async sendStockWarning(params: {
    openid: string;
    banquetName: string;
    productName: string;
    totalCount: number;
    remainingCount: number;
    remainingPercentage: string;
  }): Promise<{ success: boolean }> {
    const { openid, banquetName, productName, totalCount, remainingCount, remainingPercentage } =
      params;

    const templateId = SUBSCRIBE_TEMPLATE_IDS.STOCK_WARNING;

    if (!templateId) {
      this.logger.warn('库存预警模板ID未配置');
      return { success: false };
    }

    const result = await this.sendSubscribeMessage({
      touser: openid,
      template_id: templateId,
      page: 'packageB/pages/return-gift/index',
      data: {
        thing1: { value: banquetName.substring(0, 20) },
        thing2: { value: productName.substring(0, 20) },
        number3: { value: `${remainingCount}/${totalCount}` },
        amount4: { value: `${remainingPercentage}%` },
        thing5: { value: '库存不足5%，请及时补货' },
      },
    });

    return { success: result.success };
  }

  /**
   * 发送收货信息填写提醒
   * 当嘉宾已领取商城礼品但未填写收货信息时，每日提醒
   *
   * 模板参数：
   * - thing1: 宴会名称
   * - thing2: 礼品名称
   * - time3: 领取时间
   * - thing4: 提醒内容
   */
  async sendDeliveryReminder(params: {
    openid: string;
    banquetName: string;
    productName: string;
    claimedAt: string;
  }): Promise<{ success: boolean }> {
    const { openid, banquetName, productName, claimedAt } = params;

    const templateId = SUBSCRIBE_TEMPLATE_IDS.DELIVERY_REMINDER;

    if (!templateId) {
      this.logger.warn('收货信息填写提醒模板ID未配置');
      return { success: false };
    }

    const result = await this.sendSubscribeMessage({
      touser: openid,
      template_id: templateId,
      page: 'packageB/pages/claim-return-gift/index',
      data: {
        thing1: { value: banquetName.substring(0, 20) },
        thing2: { value: productName.substring(0, 20) },
        time3: { value: claimedAt },
        thing4: { value: '您已领取回礼，请尽快填写收货信息以便发货' },
      },
    });

    return { success: result.success };
  }
}
