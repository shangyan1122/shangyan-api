import { Injectable, Logger } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

@Injectable()
export class AdminUserService {
  private readonly logger = new Logger(AdminUserService.name);

  /**
   * 获取用户列表
   */
  async getUsers(params: {
    page?: number;
    pageSize?: number;
    isVip?: boolean;
    search?: string;
  }): Promise<{
    code: number;
    msg: string;
    data: { list: any[]; total: number; page: number; pageSize: number };
  }> {
    const { page = 1, pageSize = 10, isVip, search } = params;

    const client = getSupabaseClient();

    let query = client.from('users').select('*', { count: 'exact' });

    // VIP筛选 - 由于 users 表暂无 is_vip 字段，暂不支持此筛选
    // if (isVip !== undefined) {
    //   query = query.eq('is_vip', isVip);
    // }

    // 搜索
    if (search) {
      query = query.or(
        `nickname.ilike.%${search}%,phone.ilike.%${search}%,openid.ilike.%${search}%`
      );
    }

    // 分页
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data: users, error, count } = await query;

    if (error) {
      this.logger.error(`查询用户失败: ${error.message}`);
      return { code: 500, msg: '查询失败', data: { list: [], total: 0, page, pageSize } };
    }

    // 获取推荐官等级信息
    const openids = users?.map((u) => u.openid).filter(Boolean) || [];
    let levelMap: Record<string, any> = {};

    if (openids.length > 0) {
      const { data: officers } = await client
        .from('recommend_officers')
        .select('openid, level')
        .in('openid', openids);
      officers?.forEach((o) => {
        levelMap[o.openid] = o;
      });
    }

    // 格式化返回数据
    const list = (users || []).map((user) => ({
      id: user.id,
      openid: user.openid,
      nickname: user.nickname,
      avatar: user.avatar_url || '', // 使用 avatar_url 字段
      phone: user.phone,
      isVip: false, // users 表暂无 is_vip 字段
      vipExpireDate: '', // users 表暂无 vip_expire_date 字段
      level: levelMap[user.openid]?.level || 1,
      referrerOpenid: user.referrer_openid,
      totalGifts: user.total_gifts || 0,
      totalAmount: user.total_gift_amount || 0,
      createdAt: user.created_at,
    }));

    return {
      code: 200,
      msg: 'success',
      data: { list, total: count || 0, page, pageSize },
    };
  }

  /**
   * 获取用户详情
   */
  async getUserDetail(userId: string): Promise<{ code: number; msg: string; data: any }> {
    const client = getSupabaseClient();

    const { data: user, error } = await client.from('users').select('*').eq('id', userId).single();

    if (error || !user) {
      return { code: 404, msg: '用户不存在', data: null };
    }

    // 获取推荐官等级
    let level = 1;
    if (user.openid) {
      const { data: officer } = await client
        .from('recommend_officers')
        .select('level')
        .eq('openid', user.openid)
        .single();
      level = officer?.level || 1;
    }

    return {
      code: 200,
      msg: 'success',
      data: {
        ...user,
        level,
      },
    };
  }

  /**
   * 设置VIP状态
   * 注意: users 表暂无 is_vip 和 vip_expire_date 字段，此功能暂时返回不支持
   */
  async setVipStatus(
    userId: string,
    isVip: boolean,
    expireDays?: number
  ): Promise<{ code: number; msg: string; data: null }> {
    // 由于数据库 users 表暂无 is_vip 和 vip_expire_date 字段
    // VIP 管理功能暂时返回不支持
    this.logger.warn(`设置VIP暂不支持: users 表缺少 is_vip 字段`);
    return { code: 501, msg: 'VIP功能暂未开放，请联系管理员添加数据库字段', data: null };
  }
}
