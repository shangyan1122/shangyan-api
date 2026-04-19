import { Injectable, Logger } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const supabase = getSupabaseClient();

export interface MemberStatus {
  isMember: boolean;
  expireTime?: string;
  features: {
    aiWelcomePage: boolean;
    ledgerExport: boolean;
    customCover: boolean;
    giftReminder: boolean;
  };
}

export interface MemberPurchase {
  id: string;
  openid: string;
  feature_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'refunded';
  payment_order_id?: string;
  created_at: string;
}

@Injectable()
export class MemberService {
  private readonly logger = new Logger(MemberService.name);

  /**
   * 获取会员状态
   */
  async getMemberStatus(openid: string): Promise<MemberStatus> {
    const { data, error } = await supabase
      .from('member_purchases')
      .select('*')
      .eq('openid', openid)
      .eq('status', 'paid');

    if (error) {
      this.logger.error('获取会员状态失败:', error);
      return {
        isMember: false,
        features: {
          aiWelcomePage: false,
          ledgerExport: false,
          customCover: false,
          giftReminder: false,
        },
      };
    }

    const features = {
      aiWelcomePage: false,
      ledgerExport: false,
      customCover: false,
      giftReminder: false,
    };

    // 检查已购买的功能
    if (data && data.length > 0) {
      for (const purchase of data) {
        if (purchase.feature_id === 'aiWelcomePage') features.aiWelcomePage = true;
        if (purchase.feature_id === 'ledgerExport') features.ledgerExport = true;
        if (purchase.feature_id === 'customCover') features.customCover = true;
        if (purchase.feature_id === 'giftReminder') features.giftReminder = true;
      }
    }

    const isMember =
      features.aiWelcomePage ||
      features.ledgerExport ||
      features.customCover ||
      features.giftReminder;

    return {
      isMember,
      features,
    };
  }

  /**
   * 创建购买订单
   */
  async createPurchaseOrder(
    openid: string,
    featureId: string,
    amount: number,
    mockPay: boolean = false
  ): Promise<any> {
    // 检查是否已购买
    const { data: existing } = await supabase
      .from('member_purchases')
      .select('*')
      .eq('openid', openid)
      .eq('feature_id', featureId)
      .eq('status', 'paid')
      .single();

    if (existing) {
      throw new Error('您已购买该功能');
    }

    // 创建订单
    const orderId = `MP${Date.now()}${Math.random().toString(36).substr(2, 6)}`;

    const { data, error } = await supabase
      .from('member_purchases')
      .insert({
        openid,
        feature_id: featureId,
        amount,
        status: mockPay ? 'paid' : 'pending', // 模拟支付直接标记为已支付
        payment_order_id: orderId,
      })
      .select()
      .single();

    if (error) {
      this.logger.error('创建订单失败:', error);
      throw new Error(error.message);
    }

    // 返回支付参数（模拟）
    return {
      orderId,
      timeStamp: String(Math.floor(Date.now() / 1000)),
      nonceStr: Math.random().toString(36).substr(2, 32),
      package: `prepay_id=wx${Date.now()}`,
      signType: 'MD5',
      paySign: 'mock_sign',
      paid: mockPay, // 告诉前端是否已支付成功
    };
  }

  /**
   * 支付成功回调
   */
  async handlePaymentSuccess(orderId: string) {
    const { error } = await supabase
      .from('member_purchases')
      .update({
        status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('payment_order_id', orderId);

    if (error) {
      this.logger.error('更新订单状态失败:', error);
      throw new Error(error.message);
    }

    return { success: true };
  }

  /**
   * 检查功能是否已解锁
   */
  async checkFeatureUnlocked(openid: string, featureId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('member_purchases')
      .select('*')
      .eq('openid', openid)
      .eq('feature_id', featureId)
      .eq('status', 'paid')
      .single();

    if (error) return false;
    return !!data;
  }
}
