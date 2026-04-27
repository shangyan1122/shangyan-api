import { Injectable, Logger } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'

@Injectable()
export class AdminUserService {
  private readonly logger = new Logger(AdminUserService.name)

  /**
   * 获取用户列表
   */
  async getUsers(params: {
    page?: number
    pageSize?: number
    isVip?: boolean
    search?: string
  }): Promise<{ code: number; msg: string; data: { list: any[]; total: number; page: number; pageSize: number } }> {
    const { page = 1, pageSize = 10, isVip, search } = params

    const client = getSupabaseClient()

    let query = client
      .from('users')
      .select('*', { count: 'exact' })

    // VIP筛选
    if (isVip !== undefined) {
      query = query.eq('is_vip', isVip)
    }

    // 搜索
    if (search) {
      query = query.or(`nickname.ilike.%${search}%,phone.ilike.%${search}%,openid.ilike.%${search}%`)
    }

    // 分页
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to).order('created_at', { ascending: false })

    const { data: users, error, count } = await query

    if (error) {
      this.logger.error(`查询用户失败: ${error.message}`)
      return { code: 500, msg: '查询失败', data: { list: [], total: 0, page, pageSize } }
    }

    // 获取推荐官等级信息
    const openids = users?.map(u => u.openid).filter(Boolean) || []
    let levelMap: Record<string, any> = {}

    if (openids.length > 0) {
      const { data: officers } = await client
        .from('recommend_officers')
        .select('openid, level')
        .in('openid', openids)
      officers?.forEach(o => { levelMap[o.openid] = o })
    }

    // 格式化返回数据
    const list = (users || []).map(user => ({
      id: user.id,
      openid: user.openid,
      nickname: user.nickname,
      avatar: user.avatar,
      phone: user.phone,
      isVip: user.is_vip || false,
      vipExpireDate: user.vip_expire_date,
      level: levelMap[user.openid]?.level || 1,
      referrerOpenid: user.referrer_openid,
      totalGifts: user.total_gifts || 0,
      totalAmount: user.total_gift_amount || 0,
      createdAt: user.created_at
    }))

    return {
      code: 200,
      msg: 'success',
      data: { list, total: count || 0, page, pageSize }
    }
  }

  /**
   * 获取用户详情
   */
  async getUserDetail(userId: string): Promise<{ code: number; msg: string; data: any }> {
    const client = getSupabaseClient()

    const { data: user, error } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !user) {
      return { code: 404, msg: '用户不存在', data: null }
    }

    // 获取推荐官等级
    let level = 1
    if (user.openid) {
      const { data: officer } = await client
        .from('recommend_officers')
        .select('level')
        .eq('openid', user.openid)
        .single()
      level = officer?.level || 1
    }

    return {
      code: 200,
      msg: 'success',
      data: {
        ...user,
        level
      }
    }
  }

  /**
   * 设置VIP状态
   */
  async setVipStatus(userId: string, isVip: boolean, expireDays?: number): Promise<{ code: number; msg: string; data: null }> {
    const client = getSupabaseClient()

    const updateData: any = {
      is_vip: isVip,
      updated_at: new Date().toISOString()
    }

    if (isVip && expireDays) {
      const expireDate = new Date()
      expireDate.setDate(expireDate.getDate() + expireDays)
      updateData.vip_expire_date = expireDate.toISOString()
    }

    const { error } = await client
      .from('users')
      .update(updateData)
      .eq('id', userId)

    if (error) {
      this.logger.error(`设置VIP失败: ${error.message}`)
      return { code: 500, msg: '操作失败', data: null }
    }

    this.logger.log(`设置VIP成功: userId=${userId}, isVip=${isVip}`)
    return { code: 200, msg: isVip ? 'VIP已开通' : 'VIP已取消', data: null }
  }
}
