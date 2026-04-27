import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { getSupabaseClient } from '@/storage/database/supabase-client'

const supabase = getSupabaseClient()

// 手续费记录接口
export interface ServiceFeeRecord {
  id: string
  banquet_id: string
  gift_record_id: string
  guest_return_gift_id?: string
  gift_amount: number
  fee_rate: number
  fee_amount: number  // 综合服务费=礼金×0.6%（含微信通道费+平台服务费）
  platform_income: number  // 平台收入=礼金×0.04%（优惠期），优惠失效后为0
  gift_type: 'mall' | 'onsite' | 'none'
  voucher_returned: boolean  // 商城礼品是否已返还购物券
  voucher_id?: string  // 关联的购物券ID
  created_at: string
}

// 购物券接口
export interface ShoppingVoucher {
  id: string
  openid: string
  banquet_id?: string
  voucher_code: string
  amount: number
  balance: number
  source_type: 'promotion' | 'manual'  // promotion=手续费返还，manual=手动发放
  source_description?: string
  status: 'active' | 'used_up' | 'expired'
  expired_at?: string
  total_used: number
  last_used_at?: string
  created_at: string
}

// 统计结果接口
export interface FeeStatistics {
  banquet_id: string
  total_gifts: number  // 总随礼笔数
  mall_gifts: number  // 商城礼品领取数
  onsite_gifts: number  // 现场礼品领取数
  total_gift_amount: number  // 总礼金金额（分）
  total_fee_amount: number  // 综合服务费总额（分），对外展示0.6%
  platform_income_amount: number  // 平台收入总额（分），优惠期0.04%
  mall_fee_amount: number  // 商城礼品综合服务费
  onsite_fee_amount: number  // 现场礼品综合服务费（始终为0）
}

@Injectable()
export class ServiceFeeService {
  private readonly logger = new Logger(ServiceFeeService.name)

  /**
   * 综合服务费率（0.6%）
   * 对外统一展示：手续费0.6%，主办方到账99.4%
   * 
   * 实际构成：
   * - 优惠期：微信手续费0.56% + 平台收入0.04%
   * - 优惠失效后：微信手续费0.60% + 平台收入0%
   */
  private readonly SERVICE_FEE_RATE = 0.006

  /**
   * 平台收入费率（0.04%，仅优惠期）
   * 优惠失效后为0
   */
  private readonly PLATFORM_INCOME_RATE = 0.0004

  /**
   * 统计宴会综合服务费
   * 规则：
   * - 综合服务费率0.6%（对外统一展示：手续费0.6%，到账99.4%）
   * - 商城礼品：收取0.6%综合服务费（平台代发，有成本）
   * - 现场礼品：不收取服务费（主办方自购，平台只记录）
   * - 未领取：不收取服务费
   * 
   * 实际构成（优惠期）：
   * - 微信手续费：0.56%
   * - 平台收入：0.04%
   * - 主办方到账：99.40%
   */
  async calculateBanquetServiceFee(banquetId: string): Promise<FeeStatistics> {
    this.logger.log(`开始统计宴会手续费: banquetId=${banquetId}`)

    // 1. 获取宴会信息
    const { data: banquet, error: banquetError } = await supabase
      .from('banquets')
      .select('id, service_fee_calculated')
      .eq('id', banquetId)
      .single()

    if (banquetError || !banquet) {
      throw new Error(`宴会不存在: ${banquetId}`)
    }

    // 2. 检查是否已统计过
    if (banquet.service_fee_calculated) {
      this.logger.log(`宴会已统计过手续费，跳过: banquetId=${banquetId}`)
      return this.getExistingStatistics(banquetId)
    }

    // 3. 查询所有已支付的随礼记录
    const { data: giftRecords, error: giftError } = await supabase
      .from('gift_records')
      .select('id, amount, guest_openid')
      .eq('banquet_id', banquetId)
      .eq('payment_status', 'paid')

    if (giftError) {
      throw new Error(`查询随礼记录失败: ${giftError.message}`)
    }

    if (!giftRecords || giftRecords.length === 0) {
      this.logger.log(`宴会无随礼记录: banquetId=${banquetId}`)
      return {
        banquet_id: banquetId,
        total_gifts: 0,
        mall_gifts: 0,
        onsite_gifts: 0,
        total_gift_amount: 0,
        total_fee_amount: 0,
        platform_income_amount: 0,
        mall_fee_amount: 0,
        onsite_fee_amount: 0
      }
    }

    // 4. 查询嘉宾回礼领取记录
    const giftRecordIds = giftRecords.map(r => r.id)
    const { data: returnGifts, error: returnError } = await supabase
      .from('guest_return_gifts')
      .select('id, gift_record_id, mall_gift_claimed, onsite_gift_claimed, status')
      .in('gift_record_id', giftRecordIds)
      .eq('status', 'completed')  // 只统计已完成的领取

    if (returnError) {
      throw new Error(`查询回礼领取记录失败: ${returnError.message}`)
    }

    // 5. 构建领取记录映射
    const returnGiftMap = new Map<string, any>()
    if (returnGifts) {
      for (const rg of returnGifts) {
        returnGiftMap.set(rg.gift_record_id, rg)
      }
    }

    // 6. 统计手续费并创建记录
    const feeRecords: ServiceFeeRecord[] = []
    let totalGiftAmount = 0
    let totalFeeAmount = 0
    let platformIncomeAmount = 0
    let mallFeeAmount = 0
    let onsiteFeeAmount = 0
    let mallGiftCount = 0
    let onsiteGiftCount = 0

    for (const gift of giftRecords) {
      totalGiftAmount += gift.amount

      const returnGift = returnGiftMap.get(gift.id)
      let giftType: 'mall' | 'onsite' | 'none' = 'none'
      let guestReturnGiftId: string | undefined
      let feeAmount = 0  // 默认不收手续费
      let platformIncome = 0  // 平台收入

      if (returnGift) {
        guestReturnGiftId = returnGift.id
        
        // 判断领取类型
        if (returnGift.mall_gift_claimed) {
          giftType = 'mall'
          // 商城礼品收取0.6%综合服务费（平台代发，有成本）
          feeAmount = Math.round(gift.amount * this.SERVICE_FEE_RATE)
          // 平台收入0.04%（优惠期）
          platformIncome = Math.round(gift.amount * this.PLATFORM_INCOME_RATE)
          mallFeeAmount += feeAmount
          platformIncomeAmount += platformIncome
          mallGiftCount++
        } else if (returnGift.onsite_gift_claimed) {
          giftType = 'onsite'
          // 现场礼品不收服务费（主办方自购，平台只记录）
          feeAmount = 0
          platformIncome = 0
          onsiteGiftCount++
        }
      }

      totalFeeAmount += feeAmount

      // 创建手续费记录
      const feeRecord: ServiceFeeRecord = {
        id: `fee_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        banquet_id: banquetId,
        gift_record_id: gift.id,
        guest_return_gift_id: guestReturnGiftId,
        gift_amount: gift.amount,
        fee_rate: giftType === 'mall' ? this.SERVICE_FEE_RATE : 0,
        fee_amount: feeAmount,
        platform_income: platformIncome,
        gift_type: giftType,
        voucher_returned: false,
        created_at: new Date().toISOString()
      }
      feeRecords.push(feeRecord)
    }

    // 7. 批量插入手续费记录
    if (feeRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('service_fee_records')
        .insert(feeRecords)

      if (insertError) {
        this.logger.error('插入手续费记录失败:', insertError)
        throw new Error(`插入手续费记录失败: ${insertError.message}`)
      }
    }

    // 8. 更新宴会统计状态
    const { error: updateError } = await supabase
      .from('banquets')
      .update({
        service_fee_calculated: true,
        service_fee_total: mallFeeAmount,  // 综合服务费总额（0.6%）
        platform_income_total: platformIncomeAmount,  // 平台收入总额（0.04%）
        updated_at: new Date().toISOString()
      })
      .eq('id', banquetId)

    if (updateError) {
      this.logger.error('更新宴会统计状态失败:', updateError)
      throw new Error(`更新宴会统计状态失败: ${updateError.message}`)
    }

    const statistics: FeeStatistics = {
      banquet_id: banquetId,
      total_gifts: giftRecords.length,
      mall_gifts: mallGiftCount,
      onsite_gifts: onsiteGiftCount,
      total_gift_amount: totalGiftAmount,
      total_fee_amount: totalFeeAmount,
      platform_income_amount: platformIncomeAmount,
      mall_fee_amount: mallFeeAmount,
      onsite_fee_amount: onsiteFeeAmount
    }

    this.logger.log(`手续费统计完成: ${JSON.stringify(statistics)}`)
    return statistics
  }

  /**
   * 获取已存在的统计数据
   */
  private async getExistingStatistics(banquetId: string): Promise<FeeStatistics> {
    const { data: feeRecords, error } = await supabase
      .from('service_fee_records')
      .select('*')
      .eq('banquet_id', banquetId)

    if (error || !feeRecords) {
      return {
        banquet_id: banquetId,
        total_gifts: 0,
        mall_gifts: 0,
        onsite_gifts: 0,
        total_gift_amount: 0,
        total_fee_amount: 0,
        platform_income_amount: 0,
        mall_fee_amount: 0,
        onsite_fee_amount: 0
      }
    }

    return {
      banquet_id: banquetId,
      total_gifts: feeRecords.length,
      mall_gifts: feeRecords.filter(r => r.gift_type === 'mall').length,
      onsite_gifts: feeRecords.filter(r => r.gift_type === 'onsite').length,
      total_gift_amount: feeRecords.reduce((sum, r) => sum + r.gift_amount, 0),
      total_fee_amount: feeRecords.reduce((sum, r) => sum + r.fee_amount, 0),
      platform_income_amount: feeRecords.reduce((sum, r) => sum + (r.platform_income || 0), 0),
      mall_fee_amount: feeRecords.filter(r => r.gift_type === 'mall').reduce((sum, r) => sum + r.fee_amount, 0),
      onsite_fee_amount: feeRecords.filter(r => r.gift_type === 'onsite').reduce((sum, r) => sum + r.fee_amount, 0)
    }
  }

  /**
   * 获取用户购物券余额
   */
  async getUserVoucherBalance(openid: string): Promise<number> {
    const { data: vouchers, error } = await supabase
      .from('shopping_vouchers')
      .select('balance')
      .eq('openid', openid)
      .eq('status', 'active')
      .or('expired_at.is.null,expired_at.gt.' + new Date().toISOString())

    if (error || !vouchers) {
      return 0
    }

    return vouchers.reduce((sum, v) => sum + v.balance, 0)
  }

  /**
   * 获取用户购物券列表
   */
  async getUserVouchers(openid: string): Promise<ShoppingVoucher[]> {
    const { data: vouchers, error } = await supabase
      .from('shopping_vouchers')
      .select('*')
      .eq('openid', openid)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      this.logger.error('获取用户购物券失败:', error)
      return []
    }

    return vouchers || []
  }
}
