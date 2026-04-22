import { Injectable, Logger } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export interface CreateOrderDto {
  userOpenid: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  orderType: 'normal' | 'return_gift' | 'exchange';
  banquetId?: string;
  recipientInfo?: {
    name: string;
    phone: string;
    province?: string;
    city?: string;
    district?: string;
    address: string;
  };
  remark?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productImage: string;
  productPrice: number;
  quantity: number;
  totalPrice: number;
  isReturnGift: boolean;
}

export interface Order {
  id: string;
  orderNo: string;
  userOpenid: string;
  orderType: string;
  banquetId?: string;
  totalAmount: number;
  discountAmount: number;
  shippingFee: number;
  payAmount: number;
  payStatus: string;
  payTime?: string;
  payTransactionId?: string;
  shipStatus: string;
  shipTime?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  status: string;
  remark?: string;
  createdAt: string;
  items?: OrderItem[];
  logistics?: any;
}

@Injectable()
export class MallOrderService {
  private readonly logger = new Logger(MallOrderService.name);

  /**
   * 生成订单号
   * 格式：MO + 时间戳 + 6位随机码
   */
  private generateOrderNo(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `MO${timestamp}${random}`;
  }

  /**
   * 创建订单
   */
  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const client = getSupabaseClient();
    const orderNo = this.generateOrderNo();

    // 1. 查询商品信息
    const productIds = dto.items.map((item) => item.productId);
    const { data: products, error: productError } = await client
      .from('products')
      .select('*')
      .in('id', productIds);

    if (productError || !products?.length) {
      throw new Error('商品不存在');
    }

    // 2. 校验库存并计算金额
    let totalAmount = 0;
    const orderItems: Array<{
      productId: string;
      productName: string;
      productImage: string;
      productPrice: number;
      quantity: number;
      totalPrice: number;
    }> = [];

    for (const item of dto.items) {
      const product = products.find((p: any) => p.id === item.productId);
      if (!product) {
        throw new Error(`商品 ${item.productId} 不存在`);
      }
      if (product.stock < item.quantity) {
        throw new Error(`商品 ${product.name} 库存不足`);
      }
      if (product.status !== 'active') {
        throw new Error(`商品 ${product.name} 已下架`);
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        productImage: product.image,
        productPrice: product.price,
        quantity: item.quantity,
        totalPrice: itemTotal,
      });
    }

    // 3. 创建订单
    const orderData: any = {
      order_no: orderNo,
      user_openid: dto.userOpenid,
      order_type: dto.orderType,
      total_amount: totalAmount,
      pay_amount: totalAmount, // 暂无优惠
      status: 'pending',
      pay_status: 'pending',
      ship_status: 'pending',
    };

    if (dto.banquetId) {
      orderData.banquet_id = dto.banquetId;
    }

    if (dto.recipientInfo) {
      orderData.recipient_name = dto.recipientInfo.name;
      orderData.recipient_phone = dto.recipientInfo.phone;
      orderData.recipient_province = dto.recipientInfo.province;
      orderData.recipient_city = dto.recipientInfo.city;
      orderData.recipient_district = dto.recipientInfo.district;
      orderData.recipient_address = dto.recipientInfo.address;
    }

    if (dto.remark) {
      orderData.remark = dto.remark;
    }

    const { data: order, error: orderError } = await client
      .from('mall_orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      this.logger.error('创建订单失败:', JSON.stringify(orderError, null, 2));
      throw new Error('创建订单失败');
    }

    // 4. 创建订单商品明细
    const itemsData = orderItems.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      product_image: item.productImage,
      product_price: item.productPrice,
      quantity: item.quantity,
      total_price: item.totalPrice,
      is_return_gift: dto.orderType === 'return_gift',
    }));

    const { error: itemsError } = await client.from('mall_order_items').insert(itemsData);

    if (itemsError) {
      this.logger.error('创建订单商品失败:', itemsError);
      // 回滚订单
      await client.from('mall_orders').delete().eq('id', order.id);
      throw new Error('创建订单商品失败');
    }

    // 5. 预扣库存
    for (const item of dto.items) {
      try {
        await client.rpc('decrement_stock', {
          product_id: item.productId,
          quantity: item.quantity,
        });
      } catch {
        // 如果存储过程不存在，直接更新
        const product = products.find((p: any) => p.id === item.productId);
        if (product) {
          await client
            .from('products')
            .update({
              stock: product.stock - item.quantity,
            })
            .eq('id', item.productId);
        }
      }
    }

    this.logger.log(`订单创建成功: ${orderNo}`);

    const result = await this.getOrderById(order.id);
    return result!;
  }

  /**
   * 获取订单详情
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    const client = getSupabaseClient();

    const { data: order, error } = await client
      .from('mall_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return null;
    }

    // 查询订单商品
    const { data: items } = await client
      .from('mall_order_items')
      .select('*')
      .eq('order_id', orderId);

    // 查询物流信息
    const { data: logistics } = await client
      .from('order_logistics')
      .select('*')
      .eq('order_id', orderId)
      .single();

    return {
      id: order.id,
      orderNo: order.order_no,
      userOpenid: order.user_openid,
      orderType: order.order_type,
      banquetId: order.banquet_id,
      totalAmount: order.total_amount,
      discountAmount: order.discount_amount || 0,
      shippingFee: order.shipping_fee || 0,
      payAmount: order.pay_amount,
      payStatus: order.pay_status,
      payTime: order.pay_time,
      payTransactionId: order.pay_transaction_id,
      shipStatus: order.ship_status,
      shipTime: order.ship_time,
      recipientName: order.recipient_name,
      recipientPhone: order.recipient_phone,
      recipientAddress: order.recipient_address,
      status: order.status,
      remark: order.remark,
      createdAt: order.created_at,
      items: (items || []).map((item: any) => ({
        id: item.id,
        orderId: item.order_id,
        productId: item.product_id,
        productName: item.product_name,
        productImage: item.product_image,
        productPrice: item.product_price,
        quantity: item.quantity,
        totalPrice: item.total_price,
        isReturnGift: item.is_return_gift,
      })),
      logistics: logistics || null,
    };
  }

  /**
   * 获取用户订单列表
   */
  async getUserOrders(
    userOpenid: string,
    status?: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ orders: Order[]; total: number }> {
    const client = getSupabaseClient();

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = client
      .from('mall_orders')
      .select('*', { count: 'exact' })
      .eq('user_openid', userOpenid)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, count, error } = await query;

    if (error) {
      this.logger.error('获取订单列表失败:', error);
      return { orders: [], total: 0 };
    }

    // 查询所有订单的商品
    const orderIds = (data || []).map((o: any) => o.id);
    const { data: allItems } = await client
      .from('mall_order_items')
      .select('*')
      .in('order_id', orderIds);

    const orders = (data || []).map((order: any) => ({
      id: order.id,
      orderNo: order.order_no,
      userOpenid: order.user_openid,
      orderType: order.order_type,
      banquetId: order.banquet_id,
      totalAmount: order.total_amount,
      discountAmount: order.discount_amount || 0,
      shippingFee: order.shipping_fee || 0,
      payAmount: order.pay_amount,
      payStatus: order.pay_status,
      payTime: order.pay_time,
      shipStatus: order.ship_status,
      shipTime: order.ship_time,
      recipientName: order.recipient_name,
      recipientPhone: order.recipient_phone,
      recipientAddress: order.recipient_address,
      status: order.status,
      createdAt: order.created_at,
      items: (allItems || [])
        .filter((item: any) => item.order_id === order.id)
        .map((item: any) => ({
          id: item.id,
          orderId: item.order_id,
          productId: item.product_id,
          productName: item.product_name,
          productImage: item.product_image,
          productPrice: item.product_price,
          quantity: item.quantity,
          totalPrice: item.total_price,
          isReturnGift: item.is_return_gift,
        })),
    }));

    return { orders, total: count || 0 };
  }

  /**
   * 支付成功回调处理
   */
  async handlePaymentSuccess(orderNo: string, transactionId: string): Promise<boolean> {
    const client = getSupabaseClient();

    // 1. 查询订单
    const { data: order, error: queryError } = await client
      .from('mall_orders')
      .select('*')
      .eq('order_no', orderNo)
      .single();

    if (queryError || !order) {
      this.logger.error('订单不存在:', orderNo);
      return false;
    }

    // 2. 检查是否已支付
    if (order.pay_status === 'paid') {
      this.logger.log('订单已支付:', orderNo);
      return true;
    }

    // 3. 更新订单状态
    const { error: updateError } = await client
      .from('mall_orders')
      .update({
        pay_status: 'paid',
        pay_time: new Date().toISOString(),
        pay_transaction_id: transactionId,
        status: 'paid',
      })
      .eq('id', order.id);

    if (updateError) {
      this.logger.error('更新订单状态失败:', updateError);
      return false;
    }

    // 4. 如果是回礼订单，更新宴会状态
    if (order.order_type === 'return_gift' && order.banquet_id) {
      await client
        .from('banquets')
        .update({
          mall_gift_paid: true,
          mall_gift_pay_time: new Date().toISOString(),
          mall_gift_pay_no: orderNo,
        })
        .eq('id', order.banquet_id);
    }

    this.logger.log(`订单支付成功: ${orderNo}`);
    return true;
  }

  /**
   * 发货（管理员操作）
   */
  async shipOrder(
    orderId: string,
    logisticsInfo: {
      company: string;
      code: string;
      trackingNo: string;
    }
  ): Promise<boolean> {
    const client = getSupabaseClient();

    // 1. 更新订单发货状态
    const { error: orderError } = await client
      .from('mall_orders')
      .update({
        ship_status: 'shipped',
        ship_time: new Date().toISOString(),
        status: 'shipped',
      })
      .eq('id', orderId);

    if (orderError) {
      this.logger.error('更新订单发货状态失败:', orderError);
      return false;
    }

    // 2. 创建物流记录
    const { error: logisticsError } = await client.from('order_logistics').insert({
      order_id: orderId,
      logistics_company: logisticsInfo.company,
      logistics_code: logisticsInfo.code,
      tracking_no: logisticsInfo.trackingNo,
      status: 'picked',
      shipped_at: new Date().toISOString(),
    });

    if (logisticsError) {
      this.logger.error('创建物流记录失败:', logisticsError);
    }

    this.logger.log(`订单发货成功: ${orderId}`);
    return true;
  }

  /**
   * 确认收货
   */
  async confirmReceive(orderId: string): Promise<boolean> {
    const client = getSupabaseClient();

    const { error } = await client
      .from('mall_orders')
      .update({
        ship_status: 'received',
        status: 'received',
      })
      .eq('id', orderId);

    if (error) {
      this.logger.error('确认收货失败:', error);
      return false;
    }

    // 更新物流状态
    await client
      .from('order_logistics')
      .update({
        status: 'signed',
        signed_at: new Date().toISOString(),
      })
      .eq('order_id', orderId);

    return true;
  }

  /**
   * 取消订单
   */
  async cancelOrder(orderId: string, reason?: string): Promise<boolean> {
    const client = getSupabaseClient();

    // 1. 查询订单
    const { data: order } = await client.from('mall_orders').select('*').eq('id', orderId).single();

    if (!order) {
      throw new Error('订单不存在');
    }

    // 2. 只有待支付状态可以取消
    if (order.status !== 'pending') {
      throw new Error('当前订单状态不可取消');
    }

    // 3. 更新订单状态
    const { error } = await client
      .from('mall_orders')
      .update({
        status: 'cancelled',
        cancel_reason: reason,
      })
      .eq('id', orderId);

    if (error) {
      throw new Error('取消订单失败');
    }

    // 4. 恢复库存
    const { data: items } = await client
      .from('mall_order_items')
      .select('*')
      .eq('order_id', orderId);

    for (const item of items || []) {
      await client
        .from('products')
        .update({
          stock: client.rpc('increment', {
            table_name: 'gift_products',
            column_name: 'stock',
            row_id: item.product_id,
            amount: item.quantity,
          }),
        })
        .eq('id', item.product_id);
    }

    return true;
  }

  /**
   * 获取待发货订单数量（管理员用）
   */
  async getPendingShipCount(): Promise<number> {
    const client = getSupabaseClient();

    const { count, error } = await client
      .from('mall_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'paid')
      .eq('ship_status', 'pending');

    if (error) {
      return 0;
    }

    return count || 0;
  }

  /**
   * 获取所有订单列表（管理员用）
   */
  async getAllOrders(
    status?: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ orders: Order[]; total: number }> {
    const client = getSupabaseClient();

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = client
      .from('mall_orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, count, error } = await query;

    if (error) {
      return { orders: [], total: 0 };
    }

    return { orders: data || [], total: count || 0 };
  }
}
