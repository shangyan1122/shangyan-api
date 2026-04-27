import { Injectable, Logger } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'

interface RecommendOfficerQuery {
  page: number
  pageSize: number
  status?: string
  keyword?: string
  startDate?: string
  endDate?: string
}

interface InviteQuery {
  page: number
  pageSize: number
}

interface EarningsQuery {
  page: number
  pageSize: number
  startDate?: string
  endDate?: string
}

@Injectable()
export class AdminRecommendOfficerService {
  private readonly logger = new Logger(AdminRecommendOfficerService.name)

  /**
   * 获取推荐官列表
   */
  async getRecommendOfficers(query: RecommendOfficerQuery) {
    const client = getSupabaseClient()
    let dbQuery = client
      .from('recommend_officers')
      .select(`
        *,
        users (
          id,
          nickname,
          phone,
          openid
        )
      `, { count: 'exact' })

    // 筛选条件
    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status)
    }
    if (query.keyword) {
      dbQuery = dbQuery.or(`real_name.ilike.%${query.keyword}%,users.nickname.ilike.%${query.keyword}%,users.phone.ilike.%${query.keyword}%`)
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
      this.logger.error(`获取推荐官列表失败: ${error.message}`)
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
   * 获取推荐官详情
   */
  async getRecommendOfficerDetail(id: string) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('recommend_officers')
      .select(`
        *,
        users (
          id,
          nickname,
          phone,
          openid,
          avatar_url
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      this.logger.error(`获取推荐官详情失败: ${error.message}`)
      throw new Error(error.message)
    }

    // 获取统计数据
    const { data: stats } = await client
      .from('user_referrals')
      .select('*, users!inner(nickname, phone)')
      .eq('referee_id', id)

    return {
      code: 200,
      msg: 'success',
      data: {
        ...data,
        inviteCount: stats?.length || 0,
        recentInvites: stats?.slice(0, 10) || []
      }
    }
  }

  /**
   * 审核推荐官
   */
  async auditRecommendOfficer(id: string, approved: boolean, remark?: string) {
    const client = getSupabaseClient()

    // 先检查当前状态
    const { data: officer, error: fetchError } = await client
      .from('recommend_officers')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      this.logger.error(`查询推荐官失败: ${fetchError.message}`)
      throw new Error('推荐官不存在')
    }

    if (officer.status !== 'pending') {
      throw new Error('只能审核待审核的推荐官')
    }

    // 更新状态
    const { error: updateError } = await client
      .from('recommend_officers')
      .update({
        status: approved ? 'approved' : 'rejected',
        audit_remark: remark,
        audit_time: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      this.logger.error(`审核推荐官失败: ${updateError.message}`)
      throw new Error(updateError.message)
    }

    this.logger.log(`推荐官审核成功: id=${id}, approved=${approved}`)

    return {
      code: 200,
      msg: approved ? '审核通过' : '审核拒绝',
      data: { approved, remark }
    }
  }

  /**
   * 设置佣金比例
   */
  async setCommission(id: string, body: {
    vipCommissionRate?: number
    mallCommissionRate?: number
    remark?: string
  }) {
    const client = getSupabaseClient()

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (body.vipCommissionRate !== undefined) {
      updateData.vip_commission_rate = body.vipCommissionRate
    }
    if (body.mallCommissionRate !== undefined) {
      updateData.mall_commission_rate = body.mallCommissionRate
    }
    if (body.remark) {
      updateData.remark = body.remark
    }

    const { error } = await client
      .from('recommend_officers')
      .update(updateData)
      .eq('id', id)

    if (error) {
      this.logger.error(`设置佣金失败: ${error.message}`)
      throw new Error(error.message)
    }

    this.logger.log(`设置佣金成功: id=${id}`)

    return {
      code: 200,
      msg: '佣金设置成功',
      data: updateData
    }
  }

  /**
   * 获取推荐官统计
   */
  async getRecommendOfficerStats(params: { startDate?: string; endDate?: string }) {
    const client = getSupabaseClient()

    // 获取推荐官统计
    let officerQuery = client
      .from('recommend_officers')
      .select('*')

    if (params.startDate) {
      officerQuery = officerQuery.gte('created_at', params.startDate)
    }
    if (params.endDate) {
      officerQuery = officerQuery.lte('created_at', params.endDate)
    }

    const { data: officers } = await officerQuery

    const stats = {
      totalOfficers: officers?.length || 0,
      pendingCount: officers?.filter(o => o.status === 'pending').length || 0,
      approvedCount: officers?.filter(o => o.status === 'approved').length || 0,
      rejectedCount: officers?.filter(o => o.status === 'rejected').length || 0,
      frozenCount: officers?.filter(o => o.is_frozen).length || 0
    }

    return {
      code: 200,
      msg: 'success',
      data: stats
    }
  }

  /**
   * 获取推荐官排行榜
   */
  async getRecommendOfficerRankings(period: string = 'all') {
    const client = getSupabaseClient()

    let query = client
      .from('recommend_officers')
      .select(`
        *,
        users (
          id,
          nickname,
          phone,
          avatar_url
        )
      `)
      .eq('status', 'approved')

    // 根据时间范围筛选
    const now = new Date()
    if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      query = query.gte('created_at', weekAgo.toISOString())
    } else if (period === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      query = query.gte('created_at', monthAgo.toISOString())
    }

    const { data, error } = await query
      .order('total_earnings', { ascending: false })
      .limit(20)

    if (error) {
      this.logger.error(`获取排行榜失败: ${error.message}`)
      throw new Error(error.message)
    }

    return {
      code: 200,
      msg: 'success',
      data: data || []
    }
  }

  /**
   * 获取推荐官邀请记录
   */
  async getInviteRecords(id: string, query: InviteQuery) {
    const client = getSupabaseClient()

    const from = (query.page - 1) * query.pageSize
    const to = from + query.pageSize - 1

    const { data, error, count } = await client
      .from('user_referrals')
      .select(`
        *,
        users (
          id,
          nickname,
          phone,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('referee_id', id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      this.logger.error(`获取邀请记录失败: ${error.message}`)
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
   * 获取推荐官收益记录
   */
  async getEarnings(id: string, query: EarningsQuery) {
    const client = getSupabaseClient()

    // 由于没有收益表，暂时返回空数据
    return {
      code: 200,
      msg: 'success',
      data: [],
      total: 0,
      page: query.page,
      pageSize: query.pageSize
    }
  }

  /**
   * 冻结/解冻推荐官
   */
  async freezeRecommendOfficer(id: string, frozen: boolean, reason?: string) {
    const client = getSupabaseClient()

    const { error } = await client
      .from('recommend_officers')
      .update({
        is_frozen: frozen,
        freeze_reason: frozen ? reason : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      this.logger.error(`${frozen ? '冻结' : '解冻'}推荐官失败: ${error.message}`)
      throw new Error(error.message)
    }

    this.logger.log(`${frozen ? '冻结' : '解冻'}推荐官成功: id=${id}`)

    return {
      code: 200,
      msg: frozen ? '已冻结' : '已解冻',
      data: { frozen, reason }
    }
  }

  /**
   * 批量审核推荐官
   */
  async batchAudit(ids: string[], approved: boolean, remark?: string) {
    const client = getSupabaseClient()

    const { error } = await client
      .from('recommend_officers')
      .update({
        status: approved ? 'approved' : 'rejected',
        audit_remark: remark,
        audit_time: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .in('id', ids)
      .eq('status', 'pending')

    if (error) {
      this.logger.error(`批量审核推荐官失败: ${error.message}`)
      throw new Error(error.message)
    }

    this.logger.log(`批量审核推荐官成功: count=${ids.length}`)

    return {
      code: 200,
      msg: `成功审核 ${ids.length} 个推荐官`,
      data: { approvedCount: ids.length }
    }
  }
}
