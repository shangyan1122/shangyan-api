import { Injectable, Logger } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

@Injectable()
export class AdminOrderService {
  private readonly logger = new Logger(AdminOrderService.name);

  /**
   * 获取订单列表
   */
  async getOrders(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    code: number;
    msg: string;
    data: { list: any[]; total: number; page: number; pageSize: number };
  }> {
    const { page = 1, pageSize = 10, status, search, startDate, endDate } = params;

    const client = getSupabaseClient();

    let query = client.from('mall_orders').select('*', { count: 'exact' });

    // 状态筛选
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // 搜索（订单号/用户）
    if (search) {
      query = query.or(
        `order_no.ilike.%${search}%,user_name.ilike.%${search}%,user_phone.ilike.%${search}%`
      );
    }

    // 日期筛选
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate + 'T23:59:59');
    }

    // 分页
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data: orders, error, count } = await query;

    if (error) {
      this.logger.error(`查询订单失败: ${error.message}`);
      return { code: 500, msg: '查询失败', data: { list: [], total: 0, page, pageSize } };
    }

    // 关联查询宴会信息
    const banquetIds = orders?.map((o) => o.banquet_id).filter(Boolean) || [];
    let banquetMap: Record<string, any> = {};

    if (banquetIds.length > 0) {
      const { data: banquets } = await client
        .from('banquets')
        .select('id, name')
        .in('id', banquetIds);
      banquets?.forEach((b) => {
        banquetMap[b.id] = b;
      });
    }

    // 格式化返回数据
    const list = (orders || []).map((order) => ({
      id: order.id,
      orderNo: order.order_no,
      userName: order.user_name,
      userPhone: order.user_phone,
      banquetId: order.banquet_id,
      banquetName: banquetMap[order.banquet_id]?.name || order.banquet_id,
      amount: order.total_amount,
      status: order.status,
      shippingInfo: order.shipping_info,
      createdAt: order.created_at,
      paidAt: order.paid_at,
      shippedAt: order.shipped_at,
      completedAt: order.completed_at,
    }));

    return {
      code: 200,
      msg: 'success',
      data: { list, total: count || 0, page, pageSize },
    };
  }

  /**
   * 获取订单详情
   */
  async getOrderDetail(orderId: string): Promise<{ code: number; msg: string; data: any }> {
    const client = getSupabaseClient();

    const { data: order, error } = await client
      .from('mall_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return { code: 404, msg: '订单不存在', data: null };
    }

    // 查询订单商品
    const { data: items } = await client
      .from('mall_order_items')
      .select('*')
      .eq('order_id', orderId);

    return {
      code: 200,
      msg: 'success',
      data: {
        ...order,
        items: items || [],
      },
    };
  }

  /**
   * 订单发货
   */
  async shipOrder(orderId: string): Promise<{ code: number; msg: string; data: null }> {
    const client = getSupabaseClient();

    const { error } = await client
      .from('mall_orders')
      .update({
        status: 'shipped',
        shipped_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('status', 'paid');

    if (error) {
      this.logger.error(`订单发货失败: ${error.message}`);
      return { code: 500, msg: '发货失败', data: null };
    }

    this.logger.log(`订单发货成功: orderId=${orderId}`);
    return { code: 200, msg: '发货成功', data: null };
  }

  /**
   * 确认完成订单
   */
  async completeOrder(orderId: string): Promise<{ code: number; msg: string; data: null }> {
    const client = getSupabaseClient();

    const { error } = await client
      .from('mall_orders')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('status', 'shipped');

    if (error) {
      this.logger.error(`订单完成失败: ${error.message}`);
      return { code: 500, msg: '操作失败', data: null };
    }

    return { code: 200, msg: '操作成功', data: null };
  }

  /**
   * 退款
   */
  async refundOrder(orderId: string): Promise<{ code: number; msg: string; data: null }> {
    const client = getSupabaseClient();

    // 获取订单信息
    const { data: order } = await client.from('mall_orders').select('*').eq('id', orderId).single();

    if (!order) {
      return { code: 404, msg: '订单不存在', data: null };
    }

    if (order.status === 'refunded') {
      return { code: 400, msg: '订单已退款', data: null };
    }

    // TODO: 调用微信支付退款接口
    // 模拟退款成功

    const { error } = await client
      .from('mall_orders')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) {
      this.logger.error(`订单退款失败: ${error.message}`);
      return { code: 500, msg: '退款失败', data: null };
    }

    this.logger.log(`订单退款成功: orderId=${orderId}`);
    return { code: 200, msg: '退款成功', data: null };
  }
}
