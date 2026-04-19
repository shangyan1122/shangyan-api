import { Injectable, Logger } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

@Injectable()
export class AdminStatsService {
  private readonly logger = new Logger(AdminStatsService.name);

  /**
   * 获取数据统计概览
   */
  async getStats(params: {
    startDate?: string;
    endDate?: string;
  }): Promise<{ code: number; msg: string; data: any }> {
    const { startDate, endDate } = params;
    const client = getSupabaseClient();

    // 总用户数
    const { count: totalUsers } = await client
      .from('users')
      .select('*', { count: 'exact', head: true });

    // 总宴会数
    const { count: totalBanquets } = await client
      .from('banquets')
      .select('*', { count: 'exact', head: true });

    // 总订单数
    const { count: totalOrders } = await client
      .from('mall_orders')
      .select('*', { count: 'exact', head: true });

    // VIP用户数 - users 表暂无 is_vip 字段，暂时设为 0
    const vipUsers = 0;

    // 进行中的宴会
    const now = new Date().toISOString();
    const { count: activeBanquets } = await client
      .from('banquets')
      .select('*', { count: 'exact', head: true })
      .lte('event_time', now);

    // 总交易额
    const { data: gifts } = await client.from('gift_records').select('amount');

    const { data: orders } = await client
      .from('mall_orders')
      .select('total_amount')
      .eq('status', 'completed');

    const totalGiftAmount = gifts?.reduce((sum, g) => sum + (g.amount || 0), 0) || 0;
    const totalOrderAmount = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
    const totalAmount = totalGiftAmount + totalOrderAmount;

    // 今日数据
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const { data: todayGifts } = await client
      .from('gift_records')
      .select('amount')
      .gte('created_at', todayStr);

    const { data: todayOrders } = await client
      .from('mall_orders')
      .select('total_amount')
      .eq('status', 'completed')
      .gte('created_at', todayStr);

    const { count: todayUsers } = await client
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStr);

    const todayIncome =
      (todayGifts?.reduce((sum, g) => sum + (g.amount || 0), 0) || 0) +
      (todayOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0);

    return {
      code: 200,
      msg: 'success',
      data: {
        totalUsers: totalUsers || 0,
        totalBanquets: totalBanquets || 0,
        totalOrders: totalOrders || 0,
        totalAmount,
        vipUsers: vipUsers || 0,
        activeBanquets: activeBanquets || 0,
        todayUsers: todayUsers || 0,
        todayOrders: todayOrders?.length || 0,
        todayAmount: todayIncome,
      },
    };
  }

  /**
   * 获取随礼排行榜
   */
  async getGiftRankings(): Promise<{ code: number; msg: string; data: any[] }> {
    const client = getSupabaseClient();

    const { data: gifts } = await client
      .from('gift_records')
      .select('guest_name, guest_openid, amount');

    // 按用户聚合
    const userAmounts: Record<string, { name: string; amount: number }> = {};
    gifts?.forEach((g) => {
      const key = g.guest_openid || g.guest_name;
      if (!userAmounts[key]) {
        userAmounts[key] = { name: g.guest_name || '匿名', amount: 0 };
      }
      userAmounts[key].amount += g.amount || 0;
    });

    // 排序并取前10
    const rankings = Object.entries(userAmounts)
      .map(([key, value], index) => ({
        rank: index + 1,
        name: value.name,
        value: value.amount,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return { code: 200, msg: 'success', data: rankings };
  }

  /**
   * 获取宴会排行榜
   */
  async getBanquetRankings(): Promise<{ code: number; msg: string; data: any[] }> {
    const client = getSupabaseClient();

    const { data: banquets } = await client
      .from('banquets')
      .select('name, total_gift_amount')
      .order('total_gift_amount', { ascending: false })
      .limit(10);

    const rankings = (banquets || []).map((b, index) => ({
      rank: index + 1,
      name: b.name,
      value: b.total_gift_amount || 0,
    }));

    return { code: 200, msg: 'success', data: rankings };
  }

  /**
   * 获取商品销售排行
   */
  async getSalesRankings(): Promise<{ code: number; msg: string; data: any[] }> {
    const client = getSupabaseClient();

    const { data: items } = await client
      .from('mall_order_items')
      .select('product_name, quantity, price');

    // 按商品聚合
    const productSales: Record<string, { name: string; sales: number; amount: number }> = {};
    items?.forEach((item) => {
      if (!productSales[item.product_name]) {
        productSales[item.product_name] = { name: item.product_name, sales: 0, amount: 0 };
      }
      productSales[item.product_name].sales += item.quantity || 0;
      productSales[item.product_name].amount += (item.price || 0) * (item.quantity || 0);
    });

    // 排序并取前10
    const rankings = Object.values(productSales)
      .map((value, index) => ({
        rank: index + 1,
        ...value,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    return { code: 200, msg: 'success', data: rankings };
  }

  /**
   * 获取近7日趋势
   */
  async getDailyTrend(): Promise<{ code: number; msg: string; data: any[] }> {
    const client = getSupabaseClient();
    const result: any[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dateStr = date.toISOString().split('T')[0];

      // 当日礼金
      const { data: gifts } = await client
        .from('gift_records')
        .select('amount')
        .gte('created_at', date.toISOString())
        .lt('created_at', nextDate.toISOString());

      // 当日订单
      const { data: orders } = await client
        .from('mall_orders')
        .select('total_amount')
        .eq('status', 'completed')
        .gte('paid_at', date.toISOString())
        .lt('paid_at', nextDate.toISOString());

      // 当日新用户
      const { count: users } = await client
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', date.toISOString())
        .lt('created_at', nextDate.toISOString());

      result.push({
        date: dateStr.slice(5), // MM-DD格式
        income:
          (gifts?.reduce((sum, g) => sum + (g.amount || 0), 0) || 0) +
          (orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0),
        orders: orders?.length || 0,
        users: users || 0,
      });
    }

    return { code: 200, msg: 'success', data: result };
  }
}
