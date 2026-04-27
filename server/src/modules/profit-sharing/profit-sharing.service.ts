import { Injectable, Logger } from '@nestjs/common'
import { wechatPayConfig } from '../wechat-pay/wechat-pay.config'
import { getSupabaseClient } from '@/storage/database/supabase-client'

const supabase = getSupabaseClient()

/**
 * 分账配置
 * 
 * 【三种场景的分账规则】
 * 
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ 场景1：礼金（嘉宾→主办方）                                          │
 * │ 资金流：100元 → 主办方99.4元 + 平台0.6元                            │
 * │ 节点：支付成功后立即分账，finish=true                                │
 * │ 佣金：❌ 礼金上级不分账                                              │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ 场景2：商品钱（主办方→平台商城）                                     │
 * │ 示例：主办方支付1000元(20份@50元)，宴会后退5份=250元                 │
 * │   实际消费 = 1000 - 250 = 750元                                     │
 * │   微信手续费 = 750 × 0.6% = 4.5元（只对实际消费收手续费）            │
 * │   退款部分手续费按比例退还（未结算资金退款不收手续费）                 │
 * │ 分账方：上级佣金（如果有）+ 平台（商品是平台的）                       │
 * │ 节点：宴会结束+退款完成后，一次性分账，finish=true                    │
 * │ 佣金：✅ 按实际消费金额（750元），上级按等级分账                       │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ 场景3：增值服务费/VIP（主办方→平台）                                 │
 * │ 资金流：9.9元 → 上级佣金(按等级) + 平台收入                          │
 * │ 节点：支付成功后立即分账，finish=true                                │
 * │ 佣金：✅ 按等级分账                                                  │
 * └─────────────────────────────────────────────────────────────────────┘
 */
const PROFIT_SHARING_CONFIG = {
  // 综合服务费比例（0.6%，固定，对外展示）
  SERVICE_FEE_RATIO: 0.006,
  // 微信支付当前优惠费率（0.56%，打9折优惠期）
  WECHAT_FEE_RATIO_DISCOUNT: 0.0056,
  // 微信支付标准费率（0.60%，优惠失效后）
  WECHAT_FEE_RATIO_STANDARD: 0.006,
  // 平台收入比例（优惠期：0.6% - 0.56% = 0.04%）
  PLATFORM_INCOME_RATIO: 0.0004,
  // 分账关系类型
  RELATION_TYPE: 'USER' as const,
  // 分账描述
  GIFT_DESCRIPTION: '宴会随礼分账',
  COMMISSION_DESCRIPTION: '推广佣金',
  VIP_COMMISSION_DESCRIPTION: '增值服务佣金',
}

/**
 * 分账结果接口
 */
export interface ProfitSharingResult {
  success: boolean
  transactionId?: string
  outOrderNo?: string
  errorMsg?: string
  hostAmount?: number        // 主办方分账金额（分）
  platformAmount?: number    // 平台服务费（分）
  commissionAmount?: number  // 推广佣金金额（分）
  commissionOpenid?: string  // 推广佣金接收方openid
}

/**
 * 佣金分账参数
 */
export interface CommissionSharingParams {
  commissionAmount: number    // 佣金金额（分）
  commissionOpenid: string   // 佣金接收方 openid
  commissionRate: number     // 佣金比例
  promoterLevel: string      // 推广等级
  isPlatformCommission: boolean  // 佣金是否归平台
}

/**
 * 微信支付V3分账服务
 */
@Injectable()
export class ProfitSharingService {
  private readonly logger = new Logger(ProfitSharingService.name)
  private paymentService: any

  constructor() {
    this.initPaymentService()
  }

  private initPaymentService() {
    try {
      const WechatPay = require('wechatpay-node-v3')
      
      if (!wechatPayConfig.appId || !wechatPayConfig.mchId || 
          wechatPayConfig.appId === 'wx_app_id' || wechatPayConfig.mchId === 'merchant_id') {
        this.logger.warn('微信支付配置不完整，使用模拟分账模式')
        this.paymentService = null
        return
      }

      this.paymentService = new WechatPay({
        appid: wechatPayConfig.appId,
        mchid: wechatPayConfig.mchId,
        serial_no: wechatPayConfig.serialNo,
        privateKey: Buffer.from(wechatPayConfig.privateKey || ''),
        publicKey: Buffer.from(wechatPayConfig.publicKey || '')
      })
      this.logger.log('微信支付V3分账服务初始化成功')
    } catch (error: any) {
      this.logger.warn(`微信支付V3分账服务初始化失败: ${error.message}，使用模拟模式`)
      this.paymentService = null
    }
  }

  // ==================== 场景1：礼金分账 ====================

  /**
   * 礼金分账（嘉宾随礼→主办方）
   * 规则：主办方99.4% + 平台服务费0.6%，上级不分账
   * 节点：支付成功后立即执行，finish=true
   */
  async executeGiftProfitSharing(
    transactionId: string,
    hostOpenid: string,
    amount: number,
    orderId: string
  ): Promise<ProfitSharingResult> {
    this.logger.log(`礼金分账: transactionId=${transactionId}, hostOpenid=${hostOpenid}, amount=${amount}分`)

    const hostAmount = Math.floor(amount * (1 - PROFIT_SHARING_CONFIG.SERVICE_FEE_RATIO))
    const platformAmount = amount - hostAmount

    this.logger.log(`礼金分账计算: 总金额=${amount}分, 主办方=${hostAmount}分(99.4%), 平台服务费=${platformAmount}分(0.6%)`)

    if (!this.paymentService) {
      return this.mockProfitSharing('gift_records', orderId, {
        hostAmount, platformAmount, commissionAmount: 0, commissionOpenid: ''
      })
    }

    try {
      await this.addProfitSharingReceiver(hostOpenid)

      const outOrderNo = `PS${Date.now()}${Math.random().toString(36).substr(2, 6)}`
      const receivers = [{
        type: 'PERSONAL_OPENID',
        account: hostOpenid,
        amount: hostAmount,
        description: PROFIT_SHARING_CONFIG.GIFT_DESCRIPTION
      }]

      this.logger.log(`请求礼金分账: outOrderNo=${outOrderNo}, hostAmount=${hostAmount}分`)

      const result = await this.paymentService.profitSharing({
        transaction_id: transactionId,
        out_order_no: outOrderNo,
        receivers,
        finish: true
      })

      if (result.status === 200 || result.status === 201 || result.out_order_no) {
        this.logger.log(`礼金分账成功: 主办方到账=${hostAmount}分`)
        await this.updateRecord('gift_records', orderId, {
          profit_sharing_status: 'success',
          profit_sharing_out_order_no: outOrderNo,
          profit_sharing_time: new Date().toISOString(),
          host_amount: hostAmount,
          platform_amount: platformAmount,
          commission_amount: 0
        })
        return { success: true, transactionId, outOrderNo, hostAmount, platformAmount, commissionAmount: 0 }
      }

      this.logger.error('礼金分账失败:', result)
      return { success: false, errorMsg: result.message || '分账请求失败' }
    } catch (error: any) {
      this.logger.error(`礼金分账异常: ${error.message}`)
      return { success: false, errorMsg: error.message }
    }
  }

  // ==================== 场景2：商城分账（一次性） ====================

  /**
   * 商城订单一次性分账
   * 触发时机：宴会结束 + 退还未领取礼品完成后
   * 
   * 规则：
   * - 实际消费金额 = 支付总金额 - 退款金额
   * - 上级佣金 = 实际消费金额 × 上级佣金比例（有上级分给上级，无上级归平台）
   * - 平台收入 = 实际消费金额 - 佣金（商品是平台的）
   * - finish=true 一次性完结
   * 
   * @param transactionId 微信支付交易号
   * @param orderId 关联的宴会ID或商城订单ID
   * @param actualAmount 实际消费金额（支付总金额 - 退款金额，单位分）
   * @param commissionParams 佣金参数（从ReferralService获取）
   */
  async executeMallProfitSharing(
    transactionId: string,
    orderId: string,
    actualAmount: number,
    commissionParams: CommissionSharingParams
  ): Promise<ProfitSharingResult> {
    this.logger.log(`商城一次性分账: transactionId=${transactionId}, 实际消费=${actualAmount}分, 佣金=${commissionParams.commissionAmount}分`)

    const { commissionAmount, commissionOpenid, isPlatformCommission } = commissionParams

    // 无佣金（自由人且佣金归平台=0）→ 不需要分账给个人，直接完结解冻
    if (commissionAmount <= 0 || !commissionOpenid) {
      this.logger.log(`商城无佣金分账，全部归平台: ${actualAmount}分`)
      if (this.paymentService) {
        await this.finishMallProfitSharing(transactionId, orderId)
      }
      return { success: true, platformAmount: actualAmount, commissionAmount: 0 }
    }

    if (!this.paymentService) {
      return this.mockProfitSharing('mall_orders', orderId, {
        hostAmount: 0,
        platformAmount: actualAmount - commissionAmount,
        commissionAmount,
        commissionOpenid
      })
    }

    try {
      await this.addProfitSharingReceiver(commissionOpenid)

      const outOrderNo = `PSM${Date.now()}${Math.random().toString(36).substr(2, 6)}`
      const receivers = [{
        type: 'PERSONAL_OPENID',
        account: commissionOpenid,
        amount: commissionAmount,
        description: isPlatformCommission 
          ? '平台佣金（自由人）' 
          : PROFIT_SHARING_CONFIG.COMMISSION_DESCRIPTION
      }]

      this.logger.log(`请求商城一次性分账: outOrderNo=${outOrderNo}, 佣金=${commissionAmount}分 → ${commissionOpenid}, finish=true`)

      const result = await this.paymentService.profitSharing({
        transaction_id: transactionId,
        out_order_no: outOrderNo,
        receivers,
        finish: true  // 一次性完结，剩余归平台（商户号）
      })

      if (result.status === 200 || result.status === 201 || result.out_order_no) {
        this.logger.log(`商城一次性分账成功: 佣金=${commissionAmount}分 → ${commissionOpenid}, 平台=${actualAmount - commissionAmount}分`)
        
        await this.recordCommissionToDb(orderId, commissionParams, 'mall')
        
        return { 
          success: true, transactionId, outOrderNo, 
          platformAmount: actualAmount - commissionAmount, 
          commissionAmount, commissionOpenid 
        }
      }

      this.logger.error('商城一次性分账失败:', result)
      return { success: false, errorMsg: result.message || '分账请求失败' }
    } catch (error: any) {
      this.logger.error(`商城一次性分账异常: ${error.message}`)
      return { success: false, errorMsg: error.message }
    }
  }

  /**
   * 商城订单完结分账（全部收货后或30天到期）
   * 解冻剩余资金回商户号
   */
  async finishMallProfitSharing(
    transactionId: string,
    orderId: string
  ): Promise<boolean> {
    this.logger.log(`商城完结分账: transactionId=${transactionId}, orderId=${orderId}`)

    if (!this.paymentService) {
      this.logger.log('模拟商城完结分账成功')
      await this.updateRecord('mall_orders', orderId, {
        profit_sharing_status: 'completed'
      })
      return true
    }

    try {
      const outOrderNo = `PSF${Date.now()}${Math.random().toString(36).substr(2, 6)}`
      
      // 调用完结分账：剩余资金全部解冻回商户号
      const result = await this.paymentService.profitSharingUnfreeze({
        transaction_id: transactionId,
        out_order_no: outOrderNo,
        description: '商城订单分账完结，解冻剩余资金'
      })

      if (result.status === 200 || result.status === 201) {
        this.logger.log('商城完结分账成功')
        await this.updateRecord('mall_orders', orderId, {
          profit_sharing_status: 'completed'
        })
        return true
      }

      this.logger.error('商城完结分账失败:', result)
      return false
    } catch (error: any) {
      this.logger.error(`商城完结分账异常: ${error.message}`)
      return false
    }
  }

  // ==================== 场景3：增值服务/VIP分账 ====================

  /**
   * 增值服务费/VIP分账
   * 规则：上级按等级分佣金，剩余归平台
   * 节点：支付成功后立即执行，finish=true
   */
  async executeVipProfitSharing(
    transactionId: string,
    orderId: string,
    amount: number,
    commissionParams: CommissionSharingParams
  ): Promise<ProfitSharingResult> {
    this.logger.log(`增值服务分账: transactionId=${transactionId}, amount=${amount}分, commission=${commissionParams.commissionAmount}分`)

    const { commissionAmount, commissionOpenid } = commissionParams
    const platformAmount = amount - commissionAmount

    if (commissionAmount <= 0 || !commissionOpenid || commissionParams.isPlatformCommission) {
      this.logger.log(`增值服务无佣金分账，全部归平台: ${amount}分`)
      // 不需要分账，直接解冻
      if (this.paymentService) {
        await this.finishMallProfitSharing(transactionId, orderId)
      }
      return { success: true, platformAmount: amount, commissionAmount: 0 }
    }

    if (!this.paymentService) {
      return this.mockProfitSharing('payment_orders', orderId, {
        hostAmount: 0, platformAmount, commissionAmount, commissionOpenid
      })
    }

    try {
      await this.addProfitSharingReceiver(commissionOpenid)

      const outOrderNo = `PSV${Date.now()}${Math.random().toString(36).substr(2, 6)}`
      const receivers = [{
        type: 'PERSONAL_OPENID',
        account: commissionOpenid,
        amount: commissionAmount,
        description: PROFIT_SHARING_CONFIG.VIP_COMMISSION_DESCRIPTION
      }]

      this.logger.log(`请求增值服务分账: outOrderNo=${outOrderNo}, commission=${commissionAmount}分 → ${commissionOpenid}`)

      const result = await this.paymentService.profitSharing({
        transaction_id: transactionId,
        out_order_no: outOrderNo,
        receivers,
        finish: true  // 完结，剩余归平台
      })

      if (result.status === 200 || result.status === 201 || result.out_order_no) {
        this.logger.log(`增值服务分账成功: 佣金=${commissionAmount}分, 平台=${platformAmount}分`)
        await this.recordCommissionToDb(orderId, commissionParams, 'vip')
        return { success: true, transactionId, outOrderNo, platformAmount, commissionAmount, commissionOpenid }
      }

      this.logger.error('增值服务分账失败:', result)
      return { success: false, errorMsg: result.message || '分账请求失败' }
    } catch (error: any) {
      this.logger.error(`增值服务分账异常: ${error.message}`)
      return { success: false, errorMsg: error.message }
    }
  }

  // ==================== 带重试的分账 ====================

  /**
   * 礼金分账（带重试）
   */
  async executeGiftProfitSharingWithRetry(
    transactionId: string,
    hostOpenid: string,
    amount: number,
    orderId: string,
    maxRetries: number = 3
  ): Promise<ProfitSharingResult> {
    return this.retryWrapper(
      () => this.executeGiftProfitSharing(transactionId, hostOpenid, amount, orderId),
      orderId,
      maxRetries
    )
  }

  /**
   * 增值服务分账（带重试）
   */
  async executeVipProfitSharingWithRetry(
    transactionId: string,
    orderId: string,
    amount: number,
    commissionParams: CommissionSharingParams,
    maxRetries: number = 3
  ): Promise<ProfitSharingResult> {
    return this.retryWrapper(
      () => this.executeVipProfitSharing(transactionId, orderId, amount, commissionParams),
      orderId,
      maxRetries
    )
  }

  /**
   * 商城一次性分账（带重试）
   */
  async executeMallProfitSharingWithRetry(
    transactionId: string,
    orderId: string,
    actualAmount: number,
    commissionParams: CommissionSharingParams,
    maxRetries: number = 3
  ): Promise<ProfitSharingResult> {
    return this.retryWrapper(
      () => this.executeMallProfitSharing(transactionId, orderId, actualAmount, commissionParams),
      orderId,
      maxRetries
    )
  }

  // ==================== 内部工具方法 ====================

  /**
   * 通用重试包装
   */
  private async retryWrapper(
    fn: () => Promise<ProfitSharingResult>,
    orderId: string,
    maxRetries: number = 3
  ): Promise<ProfitSharingResult> {
    let lastError: string = ''
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await fn()
      if (result.success) return result
      lastError = result.errorMsg || '未知错误'
      if (attempt < maxRetries) {
        const delay = attempt * 1000
        this.logger.log(`分账失败，等待${delay}ms后重试...`)
        await this.sleep(delay)
      }
    }
    this.logger.error(`分账失败，已重试${maxRetries}次: orderId=${orderId}, error=${lastError}`)
    await this.notifyAdmin(orderId, lastError)
    return { success: false, errorMsg: `分账失败，已重试${maxRetries}次: ${lastError}` }
  }

  /**
   * 添加分账接收方
   */
  private async addProfitSharingReceiver(openid: string): Promise<void> {
    if (!this.paymentService) return
    try {
      await this.paymentService.profitSharingAddReceiver({
        account: openid,
        relation_type: 'USER',
        type: 'PERSONAL_OPENID',
        name: '分账接收方'
      })
      this.logger.log(`添加分账接收方成功: openid=${openid}`)
    } catch (error: any) {
      if (error.message?.includes('已存在') || error.code === 'RECEIVER_ALREADY_EXISTS') {
        this.logger.log(`分账接收方已存在: openid=${openid}`)
        return
      }
      this.logger.warn(`添加分账接收方失败: ${error.message}`)
    }
  }

  /**
   * 模拟分账
   */
  private async mockProfitSharing(
    table: string,
    orderId: string,
    amounts: { hostAmount: number; platformAmount: number; commissionAmount: number; commissionOpenid: string }
  ): Promise<ProfitSharingResult> {
    this.logger.log(`模拟分账成功: 主办方=${amounts.hostAmount}分, 平台=${amounts.platformAmount}分, 佣金=${amounts.commissionAmount}分`)
    await this.updateRecord(table, orderId, {
      profit_sharing_status: 'success',
      profit_sharing_out_order_no: `MOCK_PS_${Date.now()}`,
      profit_sharing_time: new Date().toISOString(),
      host_amount: amounts.hostAmount,
      platform_amount: amounts.platformAmount,
      commission_amount: amounts.commissionAmount,
      commission_openid: amounts.commissionOpenid
    })
    return {
      success: true,
      outOrderNo: `MOCK_PS_${Date.now()}`,
      ...amounts
    }
  }

  /**
   * 记录佣金到数据库
   */
  private async recordCommissionToDb(orderId: string, params: CommissionSharingParams, type: 'mall' | 'vip'): Promise<void> {
    try {
      await supabase
        .from('commissions')
        .insert({
          user_id: params.isPlatformCommission ? 'platform' : params.commissionOpenid,
          payment_id: orderId,
          amount: params.commissionAmount,
          commission_rate: params.commissionRate,
          commission_type: `profit_sharing_${type}`,
          status: 'received',
          is_platform: params.isPlatformCommission,
          created_at: new Date().toISOString()
        })
    } catch (error: any) {
      this.logger.error(`记录佣金失败: ${error.message}`)
    }
  }

  /**
   * 更新记录（通用）
   */
  private async updateRecord(table: string, orderId: string, updates: Record<string, any>): Promise<void> {
    try {
      const { error } = await supabase.from(table).update(updates).eq('id', orderId)
      if (error) this.logger.error(`更新${table}记录失败:`, error)
    } catch (error: any) {
      this.logger.error(`更新${table}记录异常: ${error.message}`)
    }
  }

  /**
   * 通知管理员分账失败
   */
  private async notifyAdmin(orderId: string, errorMsg: string): Promise<void> {
    try {
      await supabase
        .from('admin_notifications')
        .insert({
          type: 'profit_sharing_failed',
          title: '分账失败通知',
          content: `订单${orderId}分账失败，已重试3次。错误信息：${errorMsg}`,
          order_id: orderId,
          error_message: errorMsg,
          status: 'pending',
          created_at: new Date().toISOString()
        })
    } catch (error: any) {
      this.logger.error(`通知管理员失败: ${error.message}`)
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
