import { Injectable, Logger } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

@Injectable()
export class AdminFinanceService {
  private readonly logger = new Logger(AdminFinanceService.name);

  /**
   * 获取财务统计
   */
  async getStats(): Promise<{ code: number; msg: string; data: any }> {
    const client = getSupabaseClient();

    // 获取总收入（礼金总额）
    const { data: gifts } = await client.from('gift_records').select('amount');

    const totalGift = gifts?.reduce((sum, g) => sum + (g.amount || 0), 0) || 0;

    // 获取订单收入
    const { data: orders } = await client
      .from('mall_orders')
      .select('total_amount')
      .eq('status', 'completed');

    const totalOrder = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

    // 获取VIP收入
    const { data: members } = await client
      .from('member_orders')
      .select('amount')
      .eq('status', 'completed');

    const totalVip = members?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0;

    // 获取已提现总额
    const { data: withdraws } = await client
      .from('withdraw_records')
      .select('amount')
      .eq('status', 'completed');

    const totalWithdraw = withdraws?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0;

    // 获取待处理提现
    const { data: pendingWithdraws } = await client
      .from('withdraw_records')
      .select('amount')
      .eq('status', 'pending');

    const pendingWithdraw = pendingWithdraws?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0;

    // 今日收入
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const { data: todayGifts } = await client
      .from('gift_records')
      .select('amount')
      .gte('created_at', todayStr);

    const todayGift = todayGifts?.reduce((sum, g) => sum + (g.amount || 0), 0) || 0;

    const { data: todayOrders } = await client
      .from('mall_orders')
      .select('total_amount')
      .eq('status', 'completed')
      .gte('paid_at', todayStr);

    const todayOrder = todayOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

    return {
      code: 200,
      msg: 'success',
      data: {
        totalIncome: totalGift + totalOrder + totalVip,
        totalExpense: totalWithdraw,
        totalGift,
        totalOrder,
        totalVip,
        totalWithdraw,
        pendingWithdraw,
        todayIncome: todayGift + todayOrder,
      },
    };
  }

  /**
   * 获取交易流水
   */
  async getTransactions(params: {
    page?: number;
    pageSize?: number;
    type?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    code: number;
    msg: string;
    data: { list: any[]; total: number; page: number; pageSize: number };
  }> {
    const { page = 1, pageSize = 10, type, category, startDate, endDate } = params;

    const client = getSupabaseClient();
    const transactions: any[] = [];

    // 收入：礼金记录
    if (!type || type === 'income') {
      let giftQuery = client.from('gift_records').select('*', { count: 'exact' });

      if (category === 'gift' || !category) {
        if (startDate) giftQuery = giftQuery.gte('created_at', startDate);
        if (endDate) giftQuery = giftQuery.lte('created_at', endDate + 'T23:59:59');

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        giftQuery = giftQuery.range(from, to).order('created_at', { ascending: false });

        const { data: gifts } = await giftQuery;
        gifts?.forEach((g) => {
          transactions.push({
            id: g.id,
            orderNo: g.id,
            type: 'income',
            category: 'gift',
            amount: g.amount,
            status: 'completed',
            description: `${g.guest_name || '嘉宾'}随礼`,
            userName: g.guest_name,
            banquetName: g.banquet_id,
            createdAt: g.created_at,
            completedAt: g.created_at,
          });
        });
      }
    }

    // 收入：订单
    if (!type || type === 'income') {
      let orderQuery = client.from('mall_orders').select('*', { count: 'exact' });

      if (category === 'gift_goods' || !category) {
        if (startDate) orderQuery = orderQuery.gte('created_at', startDate);
        if (endDate) orderQuery = orderQuery.lte('created_at', endDate + 'T23:59:59');

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        orderQuery = orderQuery.range(from, to).order('created_at', { ascending: false });

        const { data: orders } = await orderQuery;
        orders?.forEach((o) => {
          if (o.status === 'completed') {
            transactions.push({
              id: o.id,
              orderNo: o.order_no,
              type: 'income',
              category: 'gift_goods',
              amount: o.total_amount,
              status: 'completed',
              description: '购买礼品',
              userName: o.user_name,
              banquetName: o.banquet_id,
              createdAt: o.created_at,
              completedAt: o.paid_at,
            });
          }
        });
      }
    }

    // 收入：VIP
    if (!type || type === 'income') {
      let memberQuery = client.from('member_orders').select('*', { count: 'exact' });

      if (category === 'vip' || !category) {
        if (startDate) memberQuery = memberQuery.gte('created_at', startDate);
        if (endDate) memberQuery = memberQuery.lte('created_at', endDate + 'T23:59:59');

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        memberQuery = memberQuery.range(from, to).order('created_at', { ascending: false });

        const { data: members } = await memberQuery;
        members?.forEach((m) => {
          if (m.status === 'completed') {
            transactions.push({
              id: m.id,
              orderNo: m.order_no,
              type: 'income',
              category: 'vip',
              amount: m.amount,
              status: 'completed',
              description: 'VIP开通',
              userName: m.user_name,
              banquetName: '-',
              createdAt: m.created_at,
              completedAt: m.paid_at,
            });
          }
        });
      }
    }

    // 支出：提现
    if (!type || type === 'expense') {
      let withdrawQuery = client.from('withdraw_records').select('*', { count: 'exact' });

      if (category === 'withdraw' || !category) {
        if (startDate) withdrawQuery = withdrawQuery.gte('created_at', startDate);
        if (endDate) withdrawQuery = withdrawQuery.lte('created_at', endDate + 'T23:59:59');

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        withdrawQuery = withdrawQuery.range(from, to).order('created_at', { ascending: false });

        const { data: withdraws } = await withdrawQuery;
        withdraws?.forEach((w) => {
          transactions.push({
            id: w.id,
            orderNo: w.id,
            type: 'expense',
            category: 'withdraw',
            amount: w.amount,
            status: w.status,
            description: '提现到微信',
            userName: w.user_name,
            banquetName: '-',
            createdAt: w.created_at,
            completedAt: w.completed_at,
          });
        });
      }
    }

    // 按时间排序
    transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      code: 200,
      msg: 'success',
      data: {
        list: transactions.slice(0, pageSize),
        total: transactions.length,
        page,
        pageSize,
      },
    };
  }

  /**
   * 审核提现
   */
  async approveWithdraw(recordId: string): Promise<{ code: number; msg: string; data: null }> {
    const client = getSupabaseClient();

    // TODO: 调用微信支付打款接口

    const { error } = await client
      .from('withdraw_records')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', recordId)
      .eq('status', 'pending');

    if (error) {
      this.logger.error(`审核提现失败: ${error.message}`);
      return { code: 500, msg: '操作失败', data: null };
    }

    this.logger.log(`审核提现成功: recordId=${recordId}`);
    return { code: 200, msg: '审核通过', data: null };
  }

  /**
   * 拒绝提现
   */
  async rejectWithdraw(recordId: string): Promise<{ code: number; msg: string; data: null }> {
    const client = getSupabaseClient();

    const { error } = await client
      .from('withdraw_records')
      .update({
        status: 'rejected',
        completed_at: new Date().toISOString(),
      })
      .eq('id', recordId)
      .eq('status', 'pending');

    if (error) {
      this.logger.error(`拒绝提现失败: ${error.message}`);
      return { code: 500, msg: '操作失败', data: null };
    }

    this.logger.log(`拒绝提现: recordId=${recordId}`);
    return { code: 200, msg: '已拒绝', data: null };
  }
}
