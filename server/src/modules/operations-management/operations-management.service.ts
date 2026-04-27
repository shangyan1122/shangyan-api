import { Injectable } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'

const supabase = getSupabaseClient()

@Injectable()
export class OperationsManagementService {
  /**
   * 获取活动列表（分页）
   */
  async getActivityList(params: {
    page: number
    pageSize: number
    status?: string
    type?: string
  }) {
    const { page, pageSize, status, type } = params
    const offset = (page - 1) * pageSize

    let query = supabase
      .from('activities')
      .select('*', { count: 'exact' })

    // 筛选条件
    if (status) {
      query = query.eq('status', status)
    }
    if (type) {
      query = query.eq('type', type)
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
   * 创建活动
   */
  async createActivity(body: any) {
    const { error } = await supabase
      .from('activities')
      .insert({
        title: body.title,
        type: body.type,
        start_time: body.start_time,
        end_time: body.end_time,
        description: body.description,
        rules: body.rules,
        status: 'draft',
        created_by: body.created_by
      })

    if (error) {
      throw new Error(error.message)
    }

    return {
      code: 200,
      msg: '活动创建成功'
    }
  }

  /**
   * 更新活动
   */
  async updateActivity(id: string, body: any) {
    const { error } = await supabase
      .from('activities')
      .update({
        title: body.title,
        type: body.type,
        start_time: body.start_time,
        end_time: body.end_time,
        description: body.description,
        rules: body.rules,
        status: body.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }

    return {
      code: 200,
      msg: '活动更新成功'
    }
  }

  /**
   * 删除活动
   */
  async deleteActivity(id: string) {
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }

    return {
      code: 200,
      msg: '活动删除成功'
    }
  }

  /**
   * 获取优惠券列表（分页）
   */
  async getCouponList(params: {
    page: number
    pageSize: number
    status?: string
    type?: string
  }) {
    const { page, pageSize, status, type } = params
    const offset = (page - 1) * pageSize

    let query = supabase
      .from('coupons')
      .select('*', { count: 'exact' })

    // 筛选条件
    if (status) {
      query = query.eq('status', status)
    }
    if (type) {
      query = query.eq('type', type)
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
   * 创建优惠券
   */
  async createCoupon(body: any) {
    const { error } = await supabase
      .from('coupons')
      .insert({
        name: body.name,
        type: body.type,
        value: body.value,
        min_amount: body.min_amount,
        total_quantity: body.total_quantity,
        per_user_limit: body.per_user_limit,
        start_time: body.start_time,
        end_time: body.end_time,
        description: body.description,
        status: 'active',
        created_by: body.created_by
      })

    if (error) {
      throw new Error(error.message)
    }

    return {
      code: 200,
      msg: '优惠券创建成功'
    }
  }

  /**
   * 更新优惠券
   */
  async updateCoupon(id: string, body: any) {
    const { error } = await supabase
      .from('coupons')
      .update({
        name: body.name,
        type: body.type,
        value: body.value,
        min_amount: body.min_amount,
        total_quantity: body.total_quantity,
        per_user_limit: body.per_user_limit,
        start_time: body.start_time,
        end_time: body.end_time,
        description: body.description,
        status: body.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }

    return {
      code: 200,
      msg: '优惠券更新成功'
    }
  }

  /**
   * 删除优惠券
   */
  async deleteCoupon(id: string) {
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }

    return {
      code: 200,
      msg: '优惠券删除成功'
    }
  }

  /**
   * 获取通知公告列表（分页）
   */
  async getAnnouncementList(params: {
    page: number
    pageSize: number
    type?: string
  }) {
    const { page, pageSize, type } = params
    const offset = (page - 1) * pageSize

    let query = supabase
      .from('announcements')
      .select('*', { count: 'exact' })

    // 筛选条件
    if (type) {
      query = query.eq('type', type)
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
   * 创建通知公告
   */
  async createAnnouncement(body: any) {
    const { error } = await supabase
      .from('announcements')
      .insert({
        title: body.title,
        content: body.content,
        type: body.type,
        status: 'published',
        created_by: body.created_by
      })

    if (error) {
      throw new Error(error.message)
    }

    return {
      code: 200,
      msg: '通知公告创建成功'
    }
  }

  /**
   * 更新通知公告
   */
  async updateAnnouncement(id: string, body: any) {
    const { error } = await supabase
      .from('announcements')
      .update({
        title: body.title,
        content: body.content,
        type: body.type,
        status: body.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }

    return {
      code: 200,
      msg: '通知公告更新成功'
    }
  }

  /**
   * 删除通知公告
   */
  async deleteAnnouncement(id: string) {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }

    return {
      code: 200,
      msg: '通知公告删除成功'
    }
  }

  /**
   * 获取运营统计概览
   */
  async getOperationsStats() {
    // 进行中的活动数
    const { count: activeActivities } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // 有效的优惠券数
    const { count: activeCoupons } = await supabase
      .from('coupons')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // 已发布的公告数
    const { count: publishedAnnouncements } = await supabase
      .from('announcements')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')

    return {
      code: 200,
      msg: '查询成功',
      data: {
        activeActivities: activeActivities || 0,
        activeCoupons: activeCoupons || 0,
        publishedAnnouncements: publishedAnnouncements || 0
      }
    }
  }

  /**
   * 获取活动数据统计
   */
  async getActivityStats(activityId: string) {
    // 获取活动参与人数
    const { data: participations } = await supabase
      .from('activity_participations')
      .select('user_id')
      .eq('activity_id', activityId)

    // 获取活动转化数据（简化处理）
    const participantCount = (participations || []).length

    return {
      code: 200,
      msg: '查询成功',
      data: {
        participantCount,
        conversionRate: 0 // 实际应根据具体业务计算
      }
    }
  }
}
