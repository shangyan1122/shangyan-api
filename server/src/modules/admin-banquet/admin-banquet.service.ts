import { Injectable, Logger } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

@Injectable()
export class AdminBanquetService {
  private readonly logger = new Logger(AdminBanquetService.name);

  /**
   * 获取宴会列表
   */
  async getBanquets(params: {
    page?: number;
    pageSize?: number;
    type?: string;
    status?: string;
    search?: string;
  }): Promise<{
    code: number;
    msg: string;
    data: { list: any[]; total: number; page: number; pageSize: number };
  }> {
    const { page = 1, pageSize = 10, type, status, search } = params;

    const client = getSupabaseClient();

    let query = client.from('banquets').select('*', { count: 'exact' });

    // 类型筛选
    if (type && type !== 'all') {
      query = query.eq('banquet_type', type);
    }

    // 状态筛选
    if (status) {
      const now = new Date().toISOString();
      if (status === 'upcoming') {
        query = query.gt('event_time', now);
      } else if (status === 'active') {
        query = query.lte('event_time', now);
      } else if (status === 'ended') {
        query = query.lt('event_time', now);
      }
    }

    // 搜索
    if (search) {
      query = query.or(`name.ilike.%${search}%,host_name.ilike.%${search}%`);
    }

    // 分页
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data: banquets, error, count } = await query;

    if (error) {
      this.logger.error(`查询宴会失败: ${error.message}`);
      return { code: 500, msg: '查询失败', data: { list: [], total: 0, page, pageSize } };
    }

    // 计算宴会状态
    const now = new Date();
    const list = (banquets || []).map((banquet) => {
      const eventTime = new Date(banquet.event_time);
      let banquetStatus: 'upcoming' | 'active' | 'ended' = 'ended';

      if (eventTime > now) {
        // 未来7天内算未开始
        const daysDiff = (eventTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        banquetStatus = daysDiff > 7 ? 'upcoming' : 'active';
      } else {
        // 宴会时间已过算结束
        banquetStatus = 'ended';
      }

      return {
        id: banquet.id,
        name: banquet.name,
        type: banquet.banquet_type,
        hostName: banquet.host_name,
        hostOpenid: banquet.host_openid,
        eventTime: banquet.event_time,
        location: banquet.location,
        guestCount: banquet.guest_count || 0,
        totalAmount: banquet.total_gift_amount || 0,
        status: banquetStatus,
        qrCode: banquet.qr_code,
        createdAt: banquet.created_at,
      };
    });

    // 如果有状态筛选
    if (status && status !== list.map((l) => l.status)[0]) {
      // 进一步筛选
    }

    return {
      code: 200,
      msg: 'success',
      data: { list, total: count || 0, page, pageSize },
    };
  }

  /**
   * 获取宴会详情
   */
  async getBanquetDetail(banquetId: string): Promise<{ code: number; msg: string; data: any }> {
    const client = getSupabaseClient();

    const { data: banquet, error } = await client
      .from('banquets')
      .select('*')
      .eq('id', banquetId)
      .single();

    if (error || !banquet) {
      return { code: 404, msg: '宴会不存在', data: null };
    }

    // 获取宾客列表
    const { data: gifts } = await client
      .from('gift_records')
      .select('*')
      .eq('banquet_id', banquetId);

    return {
      code: 200,
      msg: 'success',
      data: {
        ...banquet,
        gifts: gifts || [],
      },
    };
  }

  /**
   * 删除宴会
   */
  async deleteBanquet(banquetId: string): Promise<{ code: number; msg: string; data: null }> {
    const client = getSupabaseClient();

    const { error } = await client.from('banquets').delete().eq('id', banquetId);

    if (error) {
      this.logger.error(`删除宴会失败: ${error.message}`);
      return { code: 500, msg: '删除失败', data: null };
    }

    this.logger.log(`删除宴会成功: banquetId=${banquetId}`);
    return { code: 200, msg: '删除成功', data: null };
  }
}
