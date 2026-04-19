import { Injectable, Logger } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 产品配置
const PRODUCT_CONFIG = {
  ledger_export: {
    name: '礼账单导出',
    price: 990, // 9.9元（分）
    description: '单场付费9.9元，本场礼账单终身可导出、不限次数，支持Excel',
  },
  gift_reminder: {
    name: '人情往来提醒',
    price: 1990, // 19.9元（分）
    description: '单场付费19.9元，本场随礼嘉宾今后办宴，系统自动发短信提醒您',
  },
  ai_page: {
    name: 'AI专属欢迎&感谢页面',
    price: 880, // 8.8元（分）
    description: '宴会开始前可后期补开；免费传1-3张，付费传1-6张；免费统一图，付费一人一图',
  },
};

@Injectable()
export class PaidFeaturesService {
  private readonly logger = new Logger(PaidFeaturesService.name);

  /**
   * 获取用户付费功能状态
   */
  async getPaidFeaturesStatus(openid: string) {
    const client = getSupabaseClient();

    // 获取用户所有宴会的付费功能状态
    const { data: features, error } = await client
      .from('banquet_paid_features')
      .select('*')
      .eq('banquet_id', client.from('banquets').select('id').eq('host_openid', openid));

    if (error) {
      this.logger.error('查询付费功能状态失败:', error);
    }

    // 计算各功能开通数量
    const featuresList = features || [];

    return {
      aiWelcomePage: {
        paid: featuresList.some((f) => f.ai_page_enabled),
        usedCount: featuresList.filter((f) => f.ai_page_enabled).length,
      },
      ledgerExport: {
        paid: featuresList.some((f) => f.ledger_export_enabled),
        usedCount: featuresList.filter((f) => f.ledger_export_enabled).length,
      },
      giftReminder: {
        paid: featuresList.some((f) => f.gift_reminder_enabled),
        usedCount: featuresList.filter((f) => f.gift_reminder_enabled).length,
      },
    };
  }

  /**
   * 获取宴会付费功能状态
   */
  async getBanquetPaidFeatures(banquetId: string) {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('banquet_paid_features')
      .select('*')
      .eq('banquet_id', banquetId)
      .single();

    if (error && error.code !== 'PGRST116') {
      this.logger.error('查询宴会付费功能状态失败:', error);
      throw new Error('查询失败');
    }

    if (!data) {
      return {
        ledgerExport: { enabled: false, paid: false },
        giftReminder: { enabled: false, paid: false },
        aiPage: { enabled: false, paid: false, imageCount: 3 },
      };
    }

    return {
      ledgerExport: {
        enabled: data.ledger_export_enabled,
        paid: data.ledger_export_enabled,
        paidAt: data.ledger_export_paid_at,
      },
      giftReminder: {
        enabled: data.gift_reminder_enabled,
        paid: data.gift_reminder_enabled,
        paidAt: data.gift_reminder_paid_at,
      },
      aiPage: {
        enabled: data.ai_page_enabled,
        paid: data.ai_page_enabled,
        paidAt: data.ai_page_paid_at,
        imageCount: data.ai_page_enabled ? 6 : 3,
      },
    };
  }

  /**
   * 检查功能是否已开通
   */
  async checkFeatureEnabled(banquetId: string, feature: string): Promise<boolean> {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('banquet_paid_features')
      .select('*')
      .eq('banquet_id', banquetId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return false;
    }

    if (!data) return false;

    switch (feature) {
      case 'ledger_export':
        return data.ledger_export_enabled;
      case 'gift_reminder':
        return data.gift_reminder_enabled;
      case 'ai_page':
        return data.ai_page_enabled;
      default:
        return false;
    }
  }

  /**
   * 创建支付订单
   */
  async createPaymentOrder(openid: string, banquetId: string, feature: string, amount: number) {
    const client = getSupabaseClient();

    // 验证产品配置
    const productConfig = PRODUCT_CONFIG[feature];
    if (!productConfig) {
      throw new Error('无效的产品类型');
    }

    // 验证金额
    if (amount !== productConfig.price) {
      this.logger.warn(`金额不匹配: 传入${amount}, 应为${productConfig.price}`);
    }

    // 检查是否已开通
    const alreadyEnabled = await this.checkFeatureEnabled(banquetId, feature);
    if (alreadyEnabled) {
      throw new Error('该功能已开通，无需重复购买');
    }

    // 生成订单号
    const orderNo = `PF${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // 创建订单记录
    const { data: order, error: orderError } = await client
      .from('payment_orders')
      .insert({
        order_no: orderNo,
        openid,
        banquet_id: banquetId,
        product_type: feature,
        product_name: productConfig.name,
        amount: productConfig.price,
        status: 'pending',
      })
      .select()
      .single();

    if (orderError) {
      this.logger.error('创建订单失败:', orderError);
      throw new Error('创建订单失败');
    }

    // 开发环境：模拟支付成功
    if (process.env.NODE_ENV === 'development' || process.env.MOCK_PAYMENT === 'true') {
      // 模拟支付成功
      await this.handlePaymentSuccess(order.id, `MOCK_${Date.now()}`);

      return {
        orderId: order.id,
        orderNo: order.order_no,
        mock: true,
        message: '模拟支付成功',
      };
    }

    // 生产环境：返回微信支付参数
    // TODO: 集成微信支付
    return {
      orderId: order.id,
      orderNo: order.order_no,
      amount: productConfig.price,
      productName: productConfig.name,
    };
  }

  /**
   * 处理支付成功
   */
  async handlePaymentSuccess(orderId: string, transactionId: string) {
    const client = getSupabaseClient();

    // 获取订单信息
    const { data: order, error: orderError } = await client
      .from('payment_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('订单不存在');
    }

    if (order.status === 'paid') {
      return { success: true, message: '订单已处理' };
    }

    // 更新订单状态
    await client
      .from('payment_orders')
      .update({
        status: 'paid',
        transaction_id: transactionId,
        paid_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    // 开通对应功能
    await this.enableFeature(order.banquet_id, order.product_type, orderId);

    return { success: true, orderId, banquetId: order.banquet_id };
  }

  /**
   * 开通功能
   */
  private async enableFeature(banquetId: string, feature: string, orderId: string) {
    const client = getSupabaseClient();

    const now = new Date().toISOString();
    const updateField = this.getFeatureUpdateField(feature, orderId, now);

    // 尝试更新已有记录
    const { data: existing, error: queryError } = await client
      .from('banquet_paid_features')
      .select('id')
      .eq('banquet_id', banquetId)
      .single();

    if (existing) {
      // 更新已有记录
      await client.from('banquet_paid_features').update(updateField).eq('id', existing.id);
    } else {
      // 创建新记录
      await client.from('banquet_paid_features').insert({
        banquet_id: banquetId,
        ...updateField,
      });
    }

    // 如果是AI页面，同时更新banquets表
    if (feature === 'ai_page') {
      await client
        .from('banquets')
        .update({
          ai_page_enabled: true,
          ai_page_paid: true,
        })
        .eq('id', banquetId);
    }
  }

  /**
   * 获取功能更新字段
   */
  private getFeatureUpdateField(feature: string, orderId: string, now: string) {
    switch (feature) {
      case 'ledger_export':
        return {
          ledger_export_enabled: true,
          ledger_export_paid_at: now,
          ledger_export_order_id: orderId,
        };
      case 'gift_reminder':
        return {
          gift_reminder_enabled: true,
          gift_reminder_paid_at: now,
          gift_reminder_order_id: orderId,
        };
      case 'ai_page':
        return {
          ai_page_enabled: true,
          ai_page_paid_at: now,
          ai_page_order_id: orderId,
        };
      default:
        return {};
    }
  }

  /**
   * 开通AI专属页面（无需支付，用于后期补开）
   */
  async enableAIPage(banquetId: string) {
    const client = getSupabaseClient();

    // 检查宴会是否存在且未开始
    const { data: banquet, error: banquetError } = await client
      .from('banquets')
      .select('id, event_time, ai_page_paid')
      .eq('id', banquetId)
      .single();

    if (banquetError || !banquet) {
      throw new Error('宴会不存在');
    }

    // 检查宴会是否已结束
    const eventTime = new Date(banquet.event_time);
    const now = new Date();
    const eventEndTime = new Date(eventTime.getTime() + 24 * 60 * 60 * 1000);

    if (now > eventEndTime) {
      throw new Error('宴会已结束，无法开通AI页面');
    }

    // 如果已付费开通，直接返回成功
    if (banquet.ai_page_paid) {
      return { success: true, message: '已开通' };
    }

    // 免费开通（仅启用，不付费）
    await client.from('banquets').update({ ai_page_enabled: true }).eq('id', banquetId);

    // 更新付费功能表
    const { data: existing } = await client
      .from('banquet_paid_features')
      .select('id')
      .eq('banquet_id', banquetId)
      .single();

    if (existing) {
      await client
        .from('banquet_paid_features')
        .update({ ai_page_enabled: true })
        .eq('id', existing.id);
    } else {
      await client.from('banquet_paid_features').insert({
        banquet_id: banquetId,
        ai_page_enabled: true,
      });
    }

    return { success: true, message: 'AI页面已启用' };
  }
}
