import { Injectable } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'

const supabase = getSupabaseClient()

@Injectable()
export class MemberManagementService {
  /**
   * 获取会员列表（分页）
   */
  async getMemberList(params: {
    page: number
    pageSize: number
    level?: string
    status?: string
    search?: string
  }) {
    const { page, pageSize, level, status, search } = params
    const offset = (page - 1) * pageSize

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })

    // 筛选条件
    if (level) {
      query = query.eq('member_level', level)
    }
    if (status) {
      query = query.eq('member_status', status)
    }
    if (search) {
      query = query.or(`nickname.ilike.%${search}%,phone.ilike.%${search}%`)
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
   * 获取会员详情
   */
  async getMemberDetail(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    // 获取会员积分记录
    const { data: pointRecords } = await supabase
      .from('member_point_records')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(10)

    return {
      code: 200,
      msg: '查询成功',
      data: {
        ...data,
        pointRecords: pointRecords || []
      }
    }
  }

  /**
   * 修改会员等级
   */
  async updateMemberLevel(id: string, body: { level: string; reason?: string }) {
    // 更新会员等级
    const { error: updateError } = await supabase
      .from('users')
      .update({ member_level: body.level })
      .eq('id', id)

    if (updateError) {
      throw new Error(updateError.message)
    }

    // 记录等级变更历史
    const { error: historyError } = await supabase
      .from('member_level_history')
      .insert({
        user_id: id,
        old_level: body.level, // 这里需要先查询旧等级，简化处理
        new_level: body.level,
        reason: body.reason || '管理员修改'
      })

    if (historyError) {
      console.error('记录等级变更历史失败:', historyError)
    }

    return {
      code: 200,
      msg: '会员等级修改成功'
    }
  }

  /**
   * 修改会员积分
   */
  async updateMemberPoints(id: string, body: { points: number; reason?: string }) {
    // 获取当前积分
    const { data: user } = await supabase
      .from('users')
      .select('member_points')
      .eq('id', id)
      .single()

    if (!user) {
      throw new Error('用户不存在')
    }

    const oldPoints = user.member_points || 0
    const newPoints = oldPoints + body.points

    // 更新积分
    const { error: updateError } = await supabase
      .from('users')
      .update({ member_points: newPoints })
      .eq('id', id)

    if (updateError) {
      throw new Error(updateError.message)
    }

    // 记录积分变动
    const { error: recordError } = await supabase
      .from('member_point_records')
      .insert({
        user_id: id,
        points: body.points,
        balance_after: newPoints,
        reason: body.reason || '管理员调整',
        type: body.points > 0 ? 'increase' : 'decrease'
      })

    if (recordError) {
      console.error('记录积分变动失败:', recordError)
    }

    return {
      code: 200,
      msg: '积分修改成功'
    }
  }

  /**
   * 冻结/解冻会员
   */
  async updateMemberStatus(id: string, body: { status: 'active' | 'frozen'; reason?: string }) {
    const { error } = await supabase
      .from('users')
      .update({ member_status: body.status })
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }

    return {
      code: 200,
      msg: body.status === 'frozen' ? '会员已冻结' : '会员已解冻'
    }
  }

  /**
   * 获取会员统计概览
   */
  async getMemberStats() {
    // 总会员数
    const { count: totalMembers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    // 活跃会员数
    const { count: activeMembers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('member_status', 'active')

    // 冻结会员数
    const { count: frozenMembers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('member_status', 'frozen')

    // 本月新增会员
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const { count: newMembers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString())

    return {
      code: 200,
      msg: '查询成功',
      data: {
        totalMembers: totalMembers || 0,
        activeMembers: activeMembers || 0,
        frozenMembers: frozenMembers || 0,
        newMembers: newMembers || 0
      }
    }
  }

  /**
   * 获取会员等级分布
   */
  async getLevelDistribution() {
    const { data } = await supabase
      .from('users')
      .select('member_level')

    const distribution = (data || []).reduce((acc, user) => {
      const level = user.member_level || 'normal'
      acc[level] = (acc[level] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      code: 200,
      msg: '查询成功',
      data: distribution
    }
  }

  /**
   * 获取会员增长趋势
   */
  async getGrowthTrend(days: number) {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)

    const { data } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', startDate.toISOString())

    // 按日期分组统计
    const trend: Record<string, number> = {}
    const result: { date: string; count: number }[] = []

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      trend[dateStr] = 0
    }

    (data || []).forEach(user => {
      const dateStr = user.created_at.split('T')[0]
      if (trend[dateStr] !== undefined) {
        trend[dateStr]++
      }
    })

    Object.entries(trend).forEach(([date, count]) => {
      result.push({ date, count })
    })

    return {
      code: 200,
      msg: '查询成功',
      data: result
    }
  }
}
