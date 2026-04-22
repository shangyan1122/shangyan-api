import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

@Injectable()
export class UserService {
  // 获取用户统计数据
  async getUserStats(openid: string) {
    const client = getSupabaseClient();

    // 查询主办的宴会数量
    const { count: totalBanquets } = await client
      .from('banquets')
      .select('*', { count: 'exact', head: true })
      .eq('openid', openid);

    // 先获取主办方的所有宴会ID
    const { data: banquets } = await client.from('banquets').select('id').eq('openid', openid);

    const banquetIds = banquets?.map((b) => b.id) || [];

    // 查询随礼记录数量和总金额
    let totalGifts = 0;
    let totalAmount = 0;

    if (banquetIds.length > 0) {
      const { data: giftRecords } = await client
        .from('gift_records')
        .select('amount')
        .eq('payment_status', 'paid')
        .in('banquet_id', banquetIds);

      totalGifts = giftRecords?.length || 0;
      totalAmount = giftRecords?.reduce((sum, record) => sum + record.amount, 0) || 0;
    }

    return {
      totalBanquets: totalBanquets || 0,
      totalGifts,
      totalAmount,
    };
  }

  // 获取礼账列表（主办方视角）
  async getGiftLedger(hostOpenid: string, page: number = 1, pageSize: number = 20) {
    const client = getSupabaseClient();

    // 先获取主办方的所有宴会
    const { data: banquets } = await client
      .from('banquets')
      .select('id, name')
      .eq('openid', hostOpenid);

    if (!banquets || banquets.length === 0) {
      return { records: [], total: 0 };
    }

    const banquetIds = banquets.map((b) => b.id);
    const banquetMap = new Map(banquets.map((b) => [b.id, b.name]));

    // 查询这些宴会的随礼记录
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: records, count } = await client
      .from('gift_records')
      .select('*', { count: 'exact' })
      .in('banquet_id', banquetIds)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false })
      .range(from, to);

    // 添加宴会名称
    const recordsWithBanquetName =
      records?.map((record) => ({
        ...record,
        banquet_name: banquetMap.get(record.banquet_id),
      })) || [];

    return {
      records: recordsWithBanquetName,
      total: count || 0,
    };
  }

  // 获取嘉宾的随礼记录
  async getGuestGifts(guestOpenid: string) {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('gift_records')
      .select('*, banquets(name, type, event_time)')
      .eq('guest_openid', guestOpenid)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取嘉宾随礼记录失败:', error);
      return [];
    }

    return (
      data?.map((record) => ({
        ...record,
        banquet_name: (record.banquets as any)?.name,
        banquet_type: (record.banquets as any)?.type,
        event_time: (record.banquets as any)?.event_time,
      })) || []
    );
  }

  /**
   * 获取嘉宾参加的宴会列表（去重）
   */
  async getGuestBanquets(guestOpenid: string) {
    const client = getSupabaseClient();

    // 查询嘉宾的随礼记录
    const { data: records, error } = await client
      .from('gift_records')
      .select('*')
      .eq('guest_openid', guestOpenid)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false });

    if (error || !records || records.length === 0) {
      console.error('获取嘉宾随礼记录失败:', error);
      return [];
    }

    // 获取所有宴会ID
    const banquetIds = [...new Set(records.map((r) => r.banquet_id))];

    // 查询宴会信息
    const { data: banquets, error: banquetError } = await client
      .from('banquets')
      .select('id, name, type, event_time, location')
      .in('id', banquetIds);

    if (banquetError || !banquets) {
      console.error('获取宴会信息失败:', banquetError);
      return [];
    }

    // 创建宴会映射
    const banquetMap = new Map(banquets.map((b) => [b.id, b]));

    // 按宴会ID去重，保留每个宴会的最新记录
    const result: any[] = [];
    const seenBanquets = new Set<string>();

    for (const record of records) {
      if (seenBanquets.has(record.banquet_id)) continue;

      const banquet = banquetMap.get(record.banquet_id);
      if (banquet) {
        result.push({
          id: record.id,
          banquet_id: record.banquet_id,
          banquet_name: banquet.name,
          banquet_type: banquet.type,
          event_time: banquet.event_time,
          location: banquet.location,
          amount: record.amount,
          blessing: record.blessing,
          created_at: record.created_at,
        });
        seenBanquets.add(record.banquet_id);
      }
    }

    return result;
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(openid: string) {
    const client = getSupabaseClient();

    // 查询用户表
    const { data: user, error } = await client
      .from('users')
      .select('*')
      .eq('openid', openid)
      .single();

    if (error || !user) {
      // 用户不存在，返回默认信息
      return {
        openid,
        nickname: '新用户',
        avatar: '',
        phone: '',
        isVip: false,
        vipExpireDate: '',
      };
    }

    return {
      id: user.id,
      openid: user.openid,
      nickname: user.nickname || '用户',
      avatar: user.avatar_url || '', // 使用数据库中的 avatar_url 字段
      phone: user.phone || '',
      isVip: false, // users 表暂无 is_vip 字段
      vipExpireDate: '', // users 表暂无 vip_expire_date 字段
    };
  }

  /**
   * 更新用户信息
   */
  async updateUserInfo(openid: string, data: { nickname?: string; avatar?: string }) {
    const client = getSupabaseClient();

    const updateData: any = { updated_at: new Date().toISOString() };
    if (data.nickname) updateData.nickname = data.nickname;
    if (data.avatar) updateData.avatar_url = data.avatar; // 使用数据库中的 avatar_url 字段

    await client.from('users').update(updateData).eq('openid', openid);
  }

  /**
   * 开通VIP
   * 注意: users 表暂无 is_vip 和 vip_expire_date 字段，此功能暂时返回不支持
   */
  async activateVip(
    openid: string,
    months: number = 12
  ): Promise<{ code: number; msg: string; data: { vipExpireDate: string } }> {
    // 由于数据库 users 表暂无 is_vip 和 vip_expire_date 字段
    // VIP 功能暂时返回不支持，需要先添加数据库字段
    return {
      code: 501,
      msg: 'VIP功能暂未开放，请联系管理员添加数据库字段',
      data: { vipExpireDate: '' },
    };
  }
}
