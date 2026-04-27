import { Injectable } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'

const supabase = getSupabaseClient()

@Injectable()
export class MerchantManagementService {
  /**
   * 获取商户列表（分页）
   */
  async getMerchantList(params: {
    page: number
    pageSize: number
    status?: string
    search?: string
  }) {
    const { page, pageSize, status, search } = params
    const offset = (page - 1) * pageSize

    let query = supabase
      .from('merchants')
      .select('*', { count: 'exact' })

    // 筛选条件
    if (status) {
      query = query.eq('status', status)
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,contact_name.ilike.%${search}%,contact_phone.ilike.%${search}%`)
    }

    // 分页
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    const { data, error, count } = await query

    if (error) {
      throw new Error(error.message)
    }

    return {
      code: 200,
      msg: '查询成功',
      data: data || [],
      total: count || 0
    }
  }

  /**
   * 获取商户详情
   */
  async getMerchantDetail(id: string) {
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    // 获取商户订单统计
    const { data: orderStats } = await supabase
      .from('mall_orders')
      .select('total_amount')
      .eq('merchant_id', id)

    // 获取商户结算记录
    const { data: settlements } = await supabase
      .from('merchant_settlements')
      .select('*')
      .eq('merchant_id', id)
      .order('created_at', { ascending: false })
      .limit(10)

    const totalRevenue = (orderStats || []).reduce((sum, order) => sum + (order.total_amount || 0), 0)

    return {
      code: 200,
      msg: '查询成功',
      data: {
        ...data,
        totalRevenue,
        settlements: settlements || []
      }
    }
  }

  /**
   * 审核商户
   */
  async auditMerchant(id: string, body: { status: 'approved' | 'rejected'; remark?: string }) {
    const { error } = await supabase
      .from('merchants')
      .update({
        status: body.status,
        audit_remark: body.remark,
        audit_time: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }

    return {
      code: 200,
      msg: body.status === 'approved' ? '商户审核通过' : '商户已拒绝'
    }
  }

  /**
   * 修改商户状态
   */
  async updateMerchantStatus(id: string, body: { status: 'active' | 'suspended'; reason?: string }) {
    const { error } = await supabase
      .from('merchants')
      .update({
        status: body.status,
        suspend_reason: body.reason
      })
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }

    return {
      code: 200,
      msg: body.status === 'suspended' ? '商户已暂停' : '商户已激活'
    }
  }

  /**
   * 商户结算
   */
  async createSettlement(id: string, body: { amount: number; remark?: string }) {
    // 创建结算记录
    const { error: settlementError } = await supabase
      .from('merchant_settlements')
      .insert({
        merchant_id: id,
        amount: body.amount,
        remark: body.remark,
        status: 'pending'
      })

    if (settlementError) {
      throw new Error(settlementError.message)
    }

    return {
      code: 200,
      msg: '结算申请已创建'
    }
  }

  /**
   * 获取商户结算记录
   */
  async getMerchantSettlements(id: string, params: { page: number; pageSize: number }) {
    const { page, pageSize } = params
    const offset = (page - 1) * pageSize

    const { data, error, count } = await supabase
      .from('merchant_settlements')
      .select('*', { count: 'exact' })
      .eq('merchant_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (error) {
      throw new Error(error.message)
    }

    return {
      code: 200,
      msg: '查询成功',
      data: data || [],
      total: count || 0
    }
  }

  /**
   * 获取商户统计概览
   */
  async getMerchantStats() {
    // 总商户数
    const { count: totalMerchants } = await supabase
      .from('merchants')
      .select('*', { count: 'exact', head: true })

    // 待审核商户数
    const { count: pendingMerchants } = await supabase
      .from('merchants')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    // 活跃商户数
    const { count: activeMerchants } = await supabase
      .from('merchants')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // 本月新增商户
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const { count: newMerchants } = await supabase
      .from('merchants')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString())

    return {
      code: 200,
      msg: '查询成功',
      data: {
        totalMerchants: totalMerchants || 0,
        pendingMerchants: pendingMerchants || 0,
        activeMerchants: activeMerchants || 0,
        newMerchants: newMerchants || 0
      }
    }
  }

  /**
   * 获取商户排行榜
   */
  async getMerchantRanking(limit: number) {
    const { data, error } = await supabase.rpc('get_merchant_ranking', { p_limit: limit })

    if (error) {
      // 如果函数不存在，使用替代方案
      const { data: merchants } = await supabase
        .from('merchants')
        .select('*')
        .eq('status', 'active')
        .order('total_revenue', { ascending: false })
        .limit(limit)

      return {
        code: 200,
        msg: '查询成功',
        data: merchants || []
      }
    }

    return {
      code: 200,
      msg: '查询成功',
      data: data || []
    }
  }
}
