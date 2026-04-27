import { Injectable, Logger } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'

interface ReturnGiftQuery {
  page: number
  pageSize: number
  banquetId?: string
  status?: string
  giftType?: string
  startDate?: string
  endDate?: string
}

interface ClaimCodeQuery {
  page: number
  pageSize: number
  status?: string
  banquetId?: string
}

@Injectable()
export class AdminReturnGiftService {
  private readonly logger = new Logger(AdminReturnGiftService.name)

  /**
   * 获取回礼发放记录列表
   */
  async getReturnGifts(query: ReturnGiftQuery) {
    const client = getSupabaseClient()
    let dbQuery = client
      .from('banquet_return_gifts')
      .select(`
        *,
        banquets (
          id,
          name,
          type,
          host_name
        ),
        users (
          id,
          nickname,
          phone
        )
      `, { count: 'exact' })

    // 筛选条件
    if (query.banquetId) {
      dbQuery = dbQuery.eq('banquet_id', query.banquetId)
    }
    if (query.status) {
      dbQuery = dbQuery.eq('payment_status', query.status)
    }
    if (query.giftType) {
      dbQuery = dbQuery.eq('gift_type', query.giftType)
    }
    if (query.startDate) {
      dbQuery = dbQuery.gte('created_at', query.startDate)
    }
    if (query.endDate) {
      dbQuery = dbQuery.lte('created_at', query.endDate)
    }

    // 分页
    const from = (query.page - 1) * query.pageSize
    const to = from + query.pageSize - 1

    const { data, error, count } = await dbQuery
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      this.logger.error(`获取回礼列表失败: ${error.message}`)
      throw new Error(error.message)
    }

    return {
      code: 200,
      msg: 'success',
      data: data || [],
      total: count || 0,
      page: query.page,
      pageSize: query.pageSize
    }
  }

  /**
   * 获取回礼发放详情
   */
  async getReturnGiftDetail(id: string) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('banquet_return_gifts')
      .select(`
        *,
        banquets (
          id,
          name,
          type,
          host_name,
          event_time,
          location
        ),
        users (
          id,
          nickname,
          phone,
          openid
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      this.logger.error(`获取回礼详情失败: ${error.message}`)
      throw new Error(error.message)
    }

    return {
      code: 200,
      msg: 'success',
      data
    }
  }

  /**
   * 获取兑换码列表
   */
  async getClaimCodes(query: ClaimCodeQuery) {
    const client = getSupabaseClient()
    let dbQuery = client
      .from('gift_claim_codes')
      .select('*', { count: 'exact' })

    // 筛选条件
    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status)
    }
    if (query.banquetId) {
      dbQuery = dbQuery.eq('banquet_id', query.banquetId)
    }

    // 分页
    const from = (query.page - 1) * query.pageSize
    const to = from + query.pageSize - 1

    const { data, error, count } = await dbQuery
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      this.logger.error(`获取兑换码列表失败: ${error.message}`)
      throw new Error(error.message)
    }

    return {
      code: 200,
      msg: 'success',
      data: data || [],
      total: count || 0,
      page: query.page,
      pageSize: query.pageSize
    }
  }

  /**
   * 创建兑换码
   */
  async createClaimCode(body: {
    banquetId: string
    guestId: string
    giftId: string
    giftType: 'red_packet' | 'mall_product' | 'custom_voucher'
    amount?: number
    quantity?: number
    expiryDate?: string
  }) {
    const client = getSupabaseClient()

    // 生成随机兑换码
    const code = this.generateClaimCode()

    const { data, error } = await client
      .from('gift_claim_codes')
      .insert({
        code,
        banquet_id: body.banquetId,
        guest_id: body.guestId,
        gift_id: body.giftId,
        gift_type: body.giftType,
        amount: body.amount || 0,
        quantity: body.quantity || 1,
        expiry_date: body.expiryDate,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      this.logger.error(`创建兑换码失败: ${error.message}`)
      throw new Error(error.message)
    }

    this.logger.log(`创建兑换码成功: code=${code}`)

    return {
      code: 200,
      msg: '兑换码创建成功',
      data
    }
  }

  /**
   * 批量创建兑换码
   */
  async batchCreateClaimCodes(body: {
    banquetId: string
    giftId: string
    giftType: 'red_packet' | 'mall_product' | 'custom_voucher'
    guestIds: string[]
    amount?: number
    quantity?: number
    expiryDate?: string
  }) {
    const client = getSupabaseClient()

    const codes = body.guestIds.map(guestId => ({
      code: this.generateClaimCode(),
      banquet_id: body.banquetId,
      guest_id: guestId,
      gift_id: body.giftId,
      gift_type: body.giftType,
      amount: body.amount || 0,
      quantity: body.quantity || 1,
      expiry_date: body.expiryDate,
      status: 'pending',
      created_at: new Date().toISOString()
    }))

    const { data, error } = await client
      .from('gift_claim_codes')
      .insert(codes)
      .select()

    if (error) {
      this.logger.error(`批量创建兑换码失败: ${error.message}`)
      throw new Error(error.message)
    }

    this.logger.log(`批量创建兑换码成功: count=${codes.length}`)

    return {
      code: 200,
      msg: `成功创建 ${codes.length} 个兑换码`,
      data
    }
  }

  /**
   * 废除兑换码
   */
  async revokeClaimCode(codeId: string) {
    const client = getSupabaseClient()

    const { error } = await client
      .from('gift_claim_codes')
      .update({
        status: 'revoked',
        updated_at: new Date().toISOString()
      })
      .eq('id', codeId)

    if (error) {
      this.logger.error(`废除兑换码失败: ${error.message}`)
      throw new Error(error.message)
    }

    this.logger.log(`废除兑换码成功: codeId=${codeId}`)

    return {
      code: 200,
      msg: '兑换码已废除'
    }
  }

  /**
   * 获取回礼统计
   */
  async getReturnGiftStats(params: { startDate?: string; endDate?: string }) {
    const client = getSupabaseClient()

    let query = client
      .from('banquet_return_gifts')
      .select('*')

    if (params.startDate) {
      query = query.gte('created_at', params.startDate)
    }
    if (params.endDate) {
      query = query.lte('created_at', params.endDate)
    }

    const { data, error } = await query

    if (error) {
      this.logger.error(`获取回礼统计失败: ${error.message}`)
      throw new Error(error.message)
    }

    const records = data || []

    // 计算统计数据
    const stats = {
      totalRecords: records.length,
      totalAmount: records.reduce((sum, r) => sum + (r.amount || 0), 0),
      paidCount: records.filter(r => r.payment_status === 'completed').length,
      paidAmount: records.filter(r => r.payment_status === 'completed').reduce((sum, r) => sum + (r.amount || 0), 0),
      claimedCount: records.filter(r => r.claim_status === 'claimed').length,
      pendingCount: records.filter(r => r.claim_status === 'pending').length,
      redPacketCount: records.filter(r => r.gift_type === 'red_packet').length,
      productCount: records.filter(r => r.gift_type === 'mall_product').length,
      voucherCount: records.filter(r => r.gift_type === 'custom_voucher').length
    }

    return {
      code: 200,
      msg: 'success',
      data: stats
    }
  }

  /**
   * 获取兑换码统计
   */
  async getClaimCodeStats() {
    const client = getSupabaseClient()

    const { data, error } = await client
      .from('gift_claim_codes')
      .select('*')

    if (error) {
      this.logger.error(`获取兑换码统计失败: ${error.message}`)
      throw new Error(error.message)
    }

    const records = data || []

    const stats = {
      totalCodes: records.length,
      pendingCodes: records.filter(r => r.status === 'pending').length,
      usedCodes: records.filter(r => r.status === 'used').length,
      expiredCodes: records.filter(r => r.status === 'expired').length,
      revokedCodes: records.filter(r => r.status === 'revoked').length
    }

    return {
      code: 200,
      msg: 'success',
      data: stats
    }
  }

  /**
   * 手动发放回礼
   */
  async manualSendGift(body: {
    guestId: string
    banquetId: string
    giftType: 'red_packet' | 'mall_product' | 'custom_voucher'
    amount?: number
    productId?: string
    voucherId?: string
    remark?: string
  }) {
    const client = getSupabaseClient()

    const { data, error } = await client
      .from('banquet_return_gifts')
      .insert({
        guest_id: body.guestId,
        banquet_id: body.banquetId,
        gift_type: body.giftType,
        amount: body.amount || 0,
        product_id: body.productId,
        voucher_id: body.voucherId,
        claim_status: 'pending',
        payment_status: 'completed',
        remark: body.remark,
        created_by: 'admin',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      this.logger.error(`手动发放回礼失败: ${error.message}`)
      throw new Error(error.message)
    }

    this.logger.log(`手动发放回礼成功: guestId=${body.guestId}`)

    return {
      code: 200,
      msg: '回礼发放成功',
      data
    }
  }

  /**
   * 生成随机兑换码
   */
  private generateClaimCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    // 每隔4位添加横杠
    return code.match(/.{1,4}/g)!.join('-')
  }
}
