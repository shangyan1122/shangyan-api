import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'
import { WechatPayService } from '../wechat-pay/wechat-pay.service'
import { GiftReminderService } from '../gift-reminder/gift-reminder.service'

// 产品配置
const PRODUCT_CONFIG = {
  ledger_export: {
    name: '礼账单导出',
    price: 990,  // 9.9元（分）
    description: '单场付费9.9元，本场礼账单终身可导出、不限次数，支持Excel'
  },
  gift_reminder: {
    name: '人情往来提醒',
    price: 1990,  // 19.9元（分）
    description: '单场付费19.9元，主办方与随礼嘉宾终身互相提醒；嘉宾办新宴时自动提醒主办方回礼'
  },
  ai_page: {
    name: 'AI专属欢迎&感谢页面',
    price: 880,  // 8.8元（分）
    description: '仅限宴会创建前开通，不可后期补开；免费传1-3张，付费传1-6张；免费统一图，付费一人一图'
  }
}

@Injectable()
export class PaidFeaturesService {
  private readonly logger = new Logger(PaidFeaturesService.name)

  constructor(
    private readonly wechatPayService: WechatPayService,
    @Inject(forwardRef(() => GiftReminderService))
    private readonly giftReminderService: GiftReminderService
  ) {}

  /**
   * 获取用户付费功能状态
   */
  async getPaidFeaturesStatus(openid: string) {
    const client = getSupabaseClient()
    
    // 获取用户所有宴会的付费功能状态
    const { data: features, error } = await client
      .from('banquet_paid_features')
      .select('*')
      .eq('banquet_id', (
        client.from('banquets').select('id').eq('host_openid', openid)
      ))

    if (error) {
      this.logger.error('查询付费功能状态失败:', error)
    }

    // 计算各功能开通数量
    const featuresList = features || []
    
    return {
      aiWelcomePage: {
        paid: featuresList.some(f => f.ai_page_enabled),
        usedCount: featuresList.filter(f => f.ai_page_enabled).length
      },
      ledgerExport: {
        paid: featuresList.some(f => f.ledger_export_enabled),
        usedCount: featuresList.filter(f => f.ledger_export_enabled).length
      },
      giftReminder: {
        paid: featuresList.some(f => f.gift_reminder_enabled),
        usedCount: featuresList.filter(f => f.gift_reminder_enabled).length
      }
    }
  }

  /**
   * 获取宴会付费功能状态
   */
  async getBanquetPaidFeatures(banquetId: string) {
    const client = getSupabaseClient()
    
    const { data, error } = await client
      .from('banquet_paid_features')
      .select('*')
      .eq('banquet_id', banquetId)
      .single()

    if (error && error.code !== 'PGRST116') {
      this.logger.error('查询宴会付费功能状态失败:', error)
      throw new Error('查询失败')
    }

    if (!data) {
      return {
        ledgerExport: { enabled: false, paid: false },
        giftReminder: { enabled: false, paid: false },
        aiPage: { enabled: false, paid: false, imageCount: 3 }
      }
    }

    return {
      ledgerExport: {
        enabled: data.ledger_export_enabled,
        paid: data.ledger_export_enabled,
        paidAt: data.ledger_export_paid_at
      },
      giftReminder: {
        enabled: data.gift_reminder_enabled,
        paid: data.gift_reminder_enabled,
        paidAt: data.gift_reminder_paid_at
      },
      aiPage: {
        enabled: data.ai_page_enabled,
        paid: data.ai_page_enabled,
        paidAt: data.ai_page_paid_at,
        imageCount: data.ai_page_enabled ? 6 : 3
      }
    }
  }

  /**
   * 检查功能是否已开通
   */
  async checkFeatureEnabled(banquetId: string, feature: string): Promise<boolean> {
    const client = getSupabaseClient()
    
    const { data, error } = await client
      .from('banquet_paid_features')
      .select('*')
      .eq('banquet_id', banquetId)
      .single()

    if (error && error.code !== 'PGRST116') {
      return false
    }

    if (!data) return false

    switch (feature) {
      case 'ledger_export':
        return data.ledger_export_enabled
      case 'gift_reminder':
        return data.gift_reminder_enabled
      case 'ai_page':
        return data.ai_page_enabled
      default:
        return false
    }
  }

  /**
   * 创建支付订单
   */
  async createPaymentOrder(
    openid: string,
    banquetId: string,
    feature: string,
    amount: number
  ) {
    const client = getSupabaseClient()
    
    // 验证产品配置
    const productConfig = PRODUCT_CONFIG[feature]
    if (!productConfig) {
      throw new Error('无效的产品类型')
    }

    // 验证金额
    if (amount !== productConfig.price) {
      this.logger.warn(`金额不匹配: 传入${amount}, 应为${productConfig.price}`)
    }

    // 检查是否已开通
    const alreadyEnabled = await this.checkFeatureEnabled(banquetId, feature)
    if (alreadyEnabled) {
      throw new Error('该功能已开通，无需重复购买')
    }

    // AI页面仅限宴会创建前开通，不可后期补开
    if (feature === 'ai_page') {
      const { data: banquet } = await client
        .from('banquets')
        .select('event_time')
        .eq('id', banquetId)
        .single()

      if (banquet) {
        const eventTime = new Date(banquet.event_time)
        const now = new Date()
        // 宴会已开始则不允许开通AI页面
        if (now >= eventTime) {
          throw new Error('AI专属页面仅限宴会开始前开通，不可后期补开')
        }
      }
    }

    // 生成订单号
    const orderNo = `PF${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`

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
        status: 'pending'
      })
      .select()
      .single()

    if (orderError) {
      this.logger.error('创建订单失败:', orderError)
      throw new Error('创建订单失败')
    }

    // 开发环境：模拟支付成功
    if (process.env.NODE_ENV === 'development' || process.env.MOCK_PAYMENT === 'true') {
      // 模拟支付成功
      await this.handlePaymentSuccess(order.id, `MOCK_${Date.now()}`)

      return {
        orderId: order.id,
        orderNo: order.order_no,
        mock: true,
        message: '模拟支付成功'
      }
    }

    // 生产环境：调用微信支付创建订单
    try {
      const payResult = await this.wechatPayService.createJsapiOrder({
        openid,
        amount: productConfig.price,
        description: productConfig.name,
        orderId: order.order_no,
        enableProfitSharing: true  // 增值服务订单必须启用分账
      })

      if (!payResult.success) {
        this.logger.error(`创建微信支付订单失败: ${payResult.message}`)
        throw new Error(payResult.message || '创建支付订单失败')
      }

      return {
        orderId: order.id,
        orderNo: order.order_no,
        amount: productConfig.price,
        productName: productConfig.name,
        paymentParams: payResult.data
      }
    } catch (error: any) {
      this.logger.error(`创建微信支付订单失败: ${error.message}`)
      throw new Error('创建支付订单失败')
    }
  }

  /**
   * 处理支付成功
   */
  async handlePaymentSuccess(orderId: string, transactionId: string) {
    const client = getSupabaseClient()
    
    // 获取订单信息
    const { data: order, error: orderError } = await client
      .from('payment_orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw new Error('订单不存在')
    }

    if (order.status === 'paid') {
      return { success: true, message: '订单已处理' }
    }

    // 更新订单状态
    await client
      .from('payment_orders')
      .update({
        status: 'paid',
        transaction_id: transactionId,
        paid_at: new Date().toISOString()
      })
      .eq('id', orderId)

    // 开通对应功能
    await this.enableFeature(order.banquet_id, order.product_type, orderId)

    // 【核心】增值服务费分账：支付成功后立即分账给推广上级
    await this.triggerVipCommissionSharing(order, transactionId)

    return { success: true, orderId, banquetId: order.banquet_id }
  }

  /**
   * 增值服务费/VIP分账
   * 规则：支付成功后立即分账，上级按VIP佣金比例分账，剩余归平台
   */
  private async triggerVipCommissionSharing(order: any, transactionId: string): Promise<void> {
    try {
      // 获取宴会主办方openid（下单人）
      const client = getSupabaseClient()
      const { data: banquet } = await client
        .from('banquets')
        .select('host_openid')
        .eq('id', order.banquet_id)
        .single()

      if (!banquet?.host_openid) {
        this.logger.warn(`宴会 ${order.banquet_id} 无主办方，跳过VIP分账`)
        return
      }

      // 获取主办方的推广上级佣金参数
      const { ReferralService } = await import('../referral/referral.service')
      const referralService = new ReferralService()
      const commissionParams = await referralService.getCommissionSharingParams(
        banquet.host_openid,
        order.amount,
        'vip'
      )

      if (!commissionParams || commissionParams.commissionAmount <= 0) {
        this.logger.log(`增值服务订单 ${order.id} 无佣金分账（自由人或佣金为0）`)
        return
      }

      this.logger.log(`增值服务分账: ${commissionParams.commissionAmount}分 → ${commissionParams.commissionOpenid} (${commissionParams.promoterLevel})`)

      // 调用分账服务
      const { ProfitSharingService } = await import('../profit-sharing/profit-sharing.service')
      const profitSharingService = new ProfitSharingService()
      
      const result = await profitSharingService.executeVipProfitSharingWithRetry(
        transactionId,
        order.id,
        order.amount,
        commissionParams,
        3
      )

      if (!result.success) {
        this.logger.error(`增值服务分账失败: ${result.errorMsg}`)
      }
    } catch (error: any) {
      this.logger.error(`增值服务分账异常: ${error.message}`)
    }
  }

  /**
   * 开通功能
   */
  private async enableFeature(banquetId: string, feature: string, orderId: string) {
    const client = getSupabaseClient()
    
    const now = new Date().toISOString()
    const updateField = this.getFeatureUpdateField(feature, orderId, now)
    
    // 尝试更新已有记录
    const { data: existing, error: queryError } = await client
      .from('banquet_paid_features')
      .select('id')
      .eq('banquet_id', banquetId)
      .single()

    if (existing) {
      // 更新已有记录
      await client
        .from('banquet_paid_features')
        .update(updateField)
        .eq('id', existing.id)
    } else {
      // 创建新记录
      await client
        .from('banquet_paid_features')
        .insert({
          banquet_id: banquetId,
          ...updateField
        })
    }

    // 如果是AI页面，同时更新banquets表
    if (feature === 'ai_page') {
      await client
        .from('banquets')
        .update({
          ai_page_enabled: true,
          ai_page_paid: true
        })
        .eq('id', banquetId)
    }

    // 如果是人情提醒，自动建立互相提醒关系
    if (feature === 'gift_reminder') {
      try {
        await this.giftReminderService.onBanquetGiftReminderEnabled(banquetId)
      } catch (err) {
        this.logger.error('建立互相提醒失败（不影响开通）:', err)
      }
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
          ledger_export_order_id: orderId
        }
      case 'gift_reminder':
        return {
          gift_reminder_enabled: true,
          gift_reminder_paid_at: now,
          gift_reminder_order_id: orderId
        }
      case 'ai_page':
        return {
          ai_page_enabled: true,
          ai_page_paid_at: now,
          ai_page_order_id: orderId
        }
      default:
        return {}
    }
  }

}
