import { Injectable, Logger } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export interface ExchangeItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  sourceType?: 'user_return_gift' | 'guest_mall_gift'; // 源类型
}

export interface CreateExchangeDto {
  userOpenid: string;
  exchangeType: 'n_to_1' | '1_to_n';
  sourceItems: ExchangeItem[]; // 源商品（用户提供的回礼）
  targetItems: ExchangeItem[]; // 目标商品（用户想换的商品）
}

export interface ExchangeRecord {
  id: string;
  exchangeNo: string;
  userOpenid: string;
  exchangeType: string;
  sourceItems: ExchangeItem[];
  sourceTotalValue: number;
  targetItems: ExchangeItem[];
  targetTotalValue: number;
  serviceFee: number;
  diffAmount: number;
  diffPayStatus: string;
  status: string;
  orderId?: string;
  createdAt: string;
}

@Injectable()
export class GiftExchangeService {
  private readonly logger = new Logger(GiftExchangeService.name);

  /**
   * 生成置换单号
   */
  private generateExchangeNo(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `GE${timestamp}${random}`;
  }

  /**
   * 创建置换申请
   *
   * 置换规则：
   * 1. N换1：用多个回礼换一个商品
   * 2. 1换N：用一个高价值回礼换多个商品
   * 3. 手续费：按每个目标商品的置换服务费率计算（默认5%）
   * 4. 差价：目标价值 + 手续费 - 源价值
   *    - 正数：用户需补差价
   *    - 负数或零：无需支付
   */
  async createExchange(dto: CreateExchangeDto): Promise<ExchangeRecord> {
    const client = getSupabaseClient();
    const exchangeNo = this.generateExchangeNo();

    // 1. 计算源商品总价值
    const sourceTotalValue = dto.sourceItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // 2. 先获取目标商品信息（用于获取置换服务费率）
    const targetIds = dto.targetItems.map((item) => item.id);
    const { data: products, error: productError } = await client
      .from('gift_products')
      .select('id, name, price, stock, exchange_service_fee_rate')
      .in('id', targetIds)
      .eq('status', 'active');

    if (productError || !products || products.length !== targetIds.length) {
      throw new Error('目标商品不存在或已下架');
    }

    // 3. 验证库存并计算目标商品总价值和手续费
    let targetTotalValue = 0;
    let serviceFee = 0;

    for (const item of dto.targetItems) {
      const product = products.find((p: any) => p.id === item.id);
      if (!product) {
        throw new Error(`商品不存在: ${item.id}`);
      }
      if (product.stock < item.quantity) {
        throw new Error(`商品 ${product.name} 库存不足`);
      }

      const itemValue = item.price * item.quantity;
      targetTotalValue += itemValue;

      // 使用单品设置的置换服务费率，默认5%
      const feeRate = product.exchange_service_fee_rate || 0.05;
      serviceFee += Math.floor(itemValue * feeRate);
    }

    // 4. 计算差价
    const diffAmount = targetTotalValue - sourceTotalValue + serviceFee;

    // 5. 验证源商品（支持两种来源）
    const userGiftIds: string[] = [];
    const guestGiftIds: string[] = [];

    for (const item of dto.sourceItems) {
      if (item.sourceType === 'guest_mall_gift') {
        guestGiftIds.push(item.id);
      } else {
        userGiftIds.push(item.id);
      }
    }

    // 验证 user_return_gifts 表的回礼
    if (userGiftIds.length > 0) {
      const { data: userGifts, error: giftError } = await client
        .from('user_return_gifts')
        .select('id')
        .in('id', userGiftIds)
        .eq('user_openid', dto.userOpenid)
        .eq('status', 'available');

      if (giftError || !userGifts || userGifts.length !== userGiftIds.length) {
        throw new Error('部分回礼不可用或已被使用');
      }
    }

    // 验证 guest_return_gifts 表的商城礼品
    if (guestGiftIds.length > 0) {
      const { data: guestGifts, error: guestError } = await client
        .from('guest_return_gifts')
        .select('id')
        .in('id', guestGiftIds)
        .eq('guest_openid', dto.userOpenid)
        .eq('mall_gift_claimed', true)
        .eq('mall_claim_type', 'exchange')
        .is('mall_exchanged', false);

      if (guestError || !guestGifts || guestGifts.length !== guestGiftIds.length) {
        throw new Error('部分商城礼品不可用或已被置换');
      }
    }

    // 6. 创建置换记录
    const exchangeData = {
      exchange_no: exchangeNo,
      user_openid: dto.userOpenid,
      exchange_type: dto.exchangeType,
      source_items: JSON.parse(JSON.stringify(dto.sourceItems)),
      source_total_value: sourceTotalValue,
      target_items: JSON.parse(JSON.stringify(dto.targetItems)),
      target_total_value: targetTotalValue,
      service_fee: serviceFee,
      diff_amount: diffAmount,
      diff_pay_status: diffAmount > 0 ? 'pending' : 'none',
      status: diffAmount > 0 ? 'pending' : 'processing',
    };

    const { data: exchange, error: exchangeError } = await client
      .from('gift_exchanges')
      .insert(exchangeData)
      .select()
      .single();

    if (exchangeError) {
      this.logger.error('创建置换记录失败:', JSON.stringify(exchangeError, null, 2));
      throw new Error('创建置换记录失败');
    }

    // 7. 锁定源商品
    // 锁定 user_return_gifts 表的回礼
    if (userGiftIds.length > 0) {
      await client.from('user_return_gifts').update({ status: 'exchanging' }).in('id', userGiftIds);
    }

    // 锁定 guest_return_gifts 表的商城礼品
    if (guestGiftIds.length > 0) {
      await client
        .from('guest_return_gifts')
        .update({ mall_exchanged: true, mall_exchange_status: 'exchanging' })
        .in('id', guestGiftIds);
    }

    // 8. 预扣目标商品库存
    for (const item of dto.targetItems) {
      const product = products.find((p: any) => p.id === item.id);
      if (product) {
        await client
          .from('gift_products')
          .update({ stock: product.stock - item.quantity })
          .eq('id', item.id);
      }
    }

    this.logger.log(`置换申请创建成功: ${exchangeNo}`);

    const result = await this.getExchangeById(exchange.id);
    return result!;
  }

  /**
   * 获取置换详情
   */
  async getExchangeById(exchangeId: string): Promise<ExchangeRecord | null> {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('gift_exchanges')
      .select('*')
      .eq('id', exchangeId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      exchangeNo: data.exchange_no,
      userOpenid: data.user_openid,
      exchangeType: data.exchange_type,
      sourceItems: data.source_items,
      sourceTotalValue: data.source_total_value,
      targetItems: data.target_items,
      targetTotalValue: data.target_total_value,
      serviceFee: data.service_fee,
      diffAmount: data.diff_amount,
      diffPayStatus: data.diff_pay_status,
      status: data.status,
      orderId: data.order_id,
      createdAt: data.created_at,
    };
  }

  /**
   * 获取用户置换记录
   */
  async getUserExchanges(
    userOpenid: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ records: ExchangeRecord[]; total: number }> {
    const client = getSupabaseClient();

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await client
      .from('gift_exchanges')
      .select('*', { count: 'exact' })
      .eq('user_openid', userOpenid)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      return { records: [], total: 0 };
    }

    const records = (data || []).map((item: any) => ({
      id: item.id,
      exchangeNo: item.exchange_no,
      userOpenid: item.user_openid,
      exchangeType: item.exchange_type,
      sourceItems: item.source_items,
      sourceTotalValue: item.source_total_value,
      targetItems: item.target_items,
      targetTotalValue: item.target_total_value,
      serviceFee: item.service_fee,
      diffAmount: item.diff_amount,
      diffPayStatus: item.diff_pay_status,
      status: item.status,
      orderId: item.order_id,
      createdAt: item.created_at,
    }));

    return { records, total: count || 0 };
  }

  /**
   * 差价支付成功回调
   */
  async handleDiffPaymentSuccess(exchangeNo: string, transactionId: string): Promise<boolean> {
    const client = getSupabaseClient();

    const { data: exchange } = await client
      .from('gift_exchanges')
      .select('*')
      .eq('exchange_no', exchangeNo)
      .single();

    if (!exchange) {
      throw new Error('置换记录不存在');
    }

    // 更新支付状态
    const { error } = await client
      .from('gift_exchanges')
      .update({
        diff_pay_status: 'paid',
        diff_pay_transaction_id: transactionId,
        status: 'processing',
      })
      .eq('id', exchange.id);

    if (error) {
      throw new Error('更新支付状态失败');
    }

    return true;
  }

  /**
   * 完成置换（创建订单并发货）
   */
  async completeExchange(exchangeId: string): Promise<boolean> {
    const client = getSupabaseClient();

    const exchange = await this.getExchangeById(exchangeId);
    if (!exchange) {
      throw new Error('置换记录不存在');
    }

    // 1. 创建订单
    const orderNo = `MO${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const { data: order, error: orderError } = await client
      .from('mall_orders')
      .insert({
        order_no: orderNo,
        user_openid: exchange.userOpenid,
        order_type: 'exchange',
        total_amount: exchange.targetTotalValue,
        pay_amount: exchange.diffAmount > 0 ? exchange.diffAmount : 0,
        pay_status: exchange.diffAmount > 0 ? 'paid' : 'none',
        status: 'paid',
        remark: `置换单号：${exchange.exchangeNo}`,
      })
      .select()
      .single();

    if (orderError) {
      throw new Error('创建订单失败');
    }

    // 2. 创建订单商品明细
    const itemsData = exchange.targetItems.map((item) => ({
      order_id: order.id,
      product_id: item.id,
      product_name: item.name,
      product_image: item.image,
      product_price: item.price,
      quantity: item.quantity,
      total_price: item.price * item.quantity,
      is_return_gift: false,
    }));

    await client.from('mall_order_items').insert(itemsData);

    // 3. 标记源商品为已置换
    const sourceIds = exchange.sourceItems.map((item) => item.id);
    await client
      .from('user_return_gifts')
      .update({ status: 'exchanged', updated_at: new Date().toISOString() })
      .in('id', sourceIds);

    // 4. 更新置换记录状态
    await client
      .from('gift_exchanges')
      .update({
        status: 'completed',
        order_id: order.id,
        completed_at: new Date().toISOString(),
      })
      .eq('id', exchangeId);

    this.logger.log(`置换完成: ${exchange.exchangeNo}`);
    return true;
  }

  /**
   * 取消置换
   */
  async cancelExchange(exchangeId: string): Promise<boolean> {
    const client = getSupabaseClient();

    const exchange = await this.getExchangeById(exchangeId);
    if (!exchange) {
      throw new Error('置换记录不存在');
    }

    if (exchange.status === 'completed') {
      throw new Error('已完成的置换无法取消');
    }

    // 1. 恢复源商品状态
    const sourceIds = exchange.sourceItems.map((item) => item.id);
    await client
      .from('user_return_gifts')
      .update({ status: 'available', updated_at: new Date().toISOString() })
      .in('id', sourceIds);

    // 2. 恢复目标商品库存
    for (const item of exchange.targetItems) {
      const { data: product } = await client
        .from('gift_products')
        .select('stock')
        .eq('id', item.id)
        .single();

      if (product) {
        await client
          .from('gift_products')
          .update({ stock: product.stock + item.quantity })
          .eq('id', item.id);
      }
    }

    // 3. 更新置换记录状态
    await client.from('gift_exchanges').update({ status: 'cancelled' }).eq('id', exchangeId);

    this.logger.log(`置换已取消: ${exchange.exchangeNo}`);
    return true;
  }

  /**
   * 获取用户可用的回礼礼品
   * 支持两种来源：
   * 1. user_return_gifts - 用户回礼表（传统回礼）
   * 2. guest_return_gifts - 嘉宾回礼表中选择置换的商城礼品
   */
  async getUserAvailableGifts(userOpenid: string): Promise<any[]> {
    const client = getSupabaseClient();
    const results: any[] = [];

    // 1. 查询 user_return_gifts 表中的可用回礼
    const { data: userGifts, error: userError } = await client
      .from('user_return_gifts')
      .select('*')
      .eq('user_openid', userOpenid)
      .eq('status', 'available')
      .order('created_at', { ascending: false });

    if (!userError && userGifts) {
      results.push(
        ...userGifts.map((item: any) => ({
          id: item.id,
          sourceType: 'user_return_gift',
          productId: item.product_id,
          productName: item.product_name,
          productImage: item.product_image,
          productPrice: item.product_price,
          sourceBanquetName: item.source_banquet_name,
          createdAt: item.created_at,
        }))
      );
    }

    // 2. 查询 guest_return_gifts 表中选择置换的商城礼品
    const { data: guestGifts, error: guestError } = await client
      .from('guest_return_gifts')
      .select(
        'id, guest_openid, banquet_id, mall_product_id, mall_product_name, mall_product_price, mall_product_image, mall_claim_type, mall_exchanged, created_at, banquets(name)'
      )
      .eq('guest_openid', userOpenid)
      .eq('mall_gift_claimed', true)
      .eq('mall_claim_type', 'exchange')
      .is('mall_exchanged', false)
      .order('created_at', { ascending: false });

    if (!guestError && guestGifts) {
      results.push(
        ...guestGifts.map((item: any) => ({
          id: item.id,
          sourceType: 'guest_mall_gift',
          productId: item.mall_product_id,
          productName: item.mall_product_name,
          productImage: item.mall_product_image,
          productPrice: item.mall_product_price,
          sourceBanquetName: item.banquets?.name || '',
          createdAt: item.created_at,
        }))
      );
    }

    // 按创建时间排序
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return results;
  }

  /**
   * 计算置换方案预览
   */
  async previewExchange(
    sourceItems: ExchangeItem[],
    targetItems: ExchangeItem[]
  ): Promise<{
    sourceTotalValue: number;
    targetTotalValue: number;
    serviceFee: number;
    diffAmount: number;
    needPay: boolean;
  }> {
    const sourceTotalValue = sourceItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const targetTotalValue = targetItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const serviceFee = Math.floor(targetTotalValue * 0.1);
    const diffAmount = targetTotalValue - sourceTotalValue + serviceFee;

    return {
      sourceTotalValue,
      targetTotalValue,
      serviceFee,
      diffAmount,
      needPay: diffAmount > 0,
    };
  }
}
