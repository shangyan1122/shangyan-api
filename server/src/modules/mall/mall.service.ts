import { Injectable, Logger } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export interface GiftProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  original_price: number;
  image: string;
  images?: string[];
  category: string;
  stock: number;
  sales: number;
  status: 'active' | 'inactive';
  region?: string;
  is_specialty?: boolean;
  is_recommended?: boolean;
  rank_score?: number;
  tags?: string[];
  created_at: string;
  updated_at?: string;
}

export interface CartItem {
  id: string;
  user_openid: string;
  product_id: string;
  quantity: number;
  product?: GiftProduct;
  created_at: string;
}

@Injectable()
export class MallService {
  private readonly logger = new Logger(MallService.name);

  /**
   * 获取商品列表
   */
  async getProducts(
    category?: string,
    page: number = 1,
    pageSize: number = 20,
    sceneCategory?: string,
    priceTier?: string,
    limit?: number
  ) {
    const client = getSupabaseClient();

    // 如果指定了limit，则使用limit而不是分页
    const effectiveLimit = limit || pageSize;
    const from = limit ? 0 : (page - 1) * pageSize;
    const to = limit ? limit - 1 : from + pageSize - 1;

    let query = client
      .from('products')
      .select('*', { count: 'exact' })
      .eq('status', 'active')
      .gt('stock', 0)
      .order('sold_count', { ascending: false })
      .range(from, to);

    // 旧分类参数（保留兼容）
    if (category && category !== '全部') {
      query = query.eq('category', category);
    }

    // 新场景分类参数
    if (sceneCategory && sceneCategory !== 'all') {
      query = query.eq('scene_category', sceneCategory);
    }

    // 价格档位参数
    if (priceTier) {
      query = query.eq('price_tier', priceTier);
    }

    const { data, count, error } = await query;

    if (error) {
      this.logger.error('获取商品列表失败:', JSON.stringify(error, null, 2));
      return { products: [], total: 0 };
    }

    return {
      products: data || [],
      total: count || 0,
    };
  }

  /**
   * 获取商品详情
   */
  async getProductById(id: string): Promise<GiftProduct | null> {
    const client = getSupabaseClient();

    const { data, error } = await client.from('products').select('*').eq('id', id).single();

    if (error) {
      this.logger.error('获取商品详情失败:', error);
      return null;
    }

    return data;
  }

  /**
   * 获取热门商品
   */
  async getHotProducts(limit: number = 6): Promise<GiftProduct[]> {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('products')
      .select('*')
      .eq('status', 'active')
      .gt('stock', 0)
      .order('sold_count', { ascending: false })
      .limit(limit);

    if (error) {
      this.logger.error('获取热门商品失败:', error);
      return [];
    }

    return data || [];
  }

  /**
   * 添加到购物车
   */
  async addToCart(userOpenid: string, productId: string, quantity: number = 1): Promise<CartItem> {
    const client = getSupabaseClient();

    // 检查商品是否存在且有库存
    const product = await this.getProductById(productId);
    if (!product) {
      throw new Error('商品不存在');
    }
    if (product.stock < quantity) {
      throw new Error('库存不足');
    }

    // 检查购物车是否已有该商品
    const { data: existingItem } = await client
      .from('cart_items')
      .select('*')
      .eq('user_openid', userOpenid)
      .eq('product_id', productId)
      .single();

    if (existingItem) {
      // 更新数量
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > product.stock) {
        throw new Error('库存不足');
      }

      const { data, error } = await client
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', existingItem.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    } else {
      // 新增购物车项
      const { data, error } = await client
        .from('cart_items')
        .insert({
          user_openid: userOpenid,
          product_id: productId,
          quantity,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }
  }

  /**
   * 获取购物车列表
   */
  async getCart(userOpenid: string): Promise<CartItem[]> {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('cart_items')
      .select('*, products(*)')
      .eq('user_openid', userOpenid)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('获取购物车失败:', error);
      return [];
    }

    return data || [];
  }

  /**
   * 更新购物车商品数量
   */
  async updateCartQuantity(
    userOpenid: string,
    cartItemId: string,
    quantity: number
  ): Promise<CartItem | null> {
    const client = getSupabaseClient();

    if (quantity <= 0) {
      // 删除购物车项
      await client.from('cart_items').delete().eq('id', cartItemId).eq('user_openid', userOpenid);

      return null;
    }

    const { data, error } = await client
      .from('cart_items')
      .update({ quantity })
      .eq('id', cartItemId)
      .eq('user_openid', userOpenid)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * 清空购物车
   */
  async clearCart(userOpenid: string): Promise<boolean> {
    const client = getSupabaseClient();

    const { error } = await client.from('cart_items').delete().eq('user_openid', userOpenid);

    if (error) {
      this.logger.error('清空购物车失败:', error);
      return false;
    }

    return true;
  }

  /**
   * 获取购物车商品数量
   */
  async getCartCount(userOpenid: string): Promise<number> {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('cart_items')
      .select('quantity')
      .eq('user_openid', userOpenid);

    if (error) {
      return 0;
    }

    return data?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  }

  /**
   * 获取地方特产
   */
  async getSpecialties(region?: string): Promise<GiftProduct[]> {
    const client = getSupabaseClient();

    let query = client
      .from('products')
      .select('*')
      .eq('status', 'active')
      .eq('is_specialty', true)
      .gt('stock', 0)
      .order('sold_count', { ascending: false })
      .limit(10);

    if (region) {
      query = query.eq('region', region);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error('获取地方特产失败:', error);
      return [];
    }

    return data || [];
  }

  /**
   * 获取推荐商品
   */
  async getRecommendedProducts(limit: number = 6): Promise<GiftProduct[]> {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('products')
      .select('*')
      .eq('status', 'active')
      .eq('is_recommended', true)
      .gt('stock', 0)
      .order('rank_score', { ascending: false })
      .limit(limit);

    if (error) {
      this.logger.error('获取推荐商品失败:', error);
      return [];
    }

    return data || [];
  }

  /**
   * 获取排行榜商品
   */
  async getRankedProducts(limit: number = 10): Promise<GiftProduct[]> {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('products')
      .select('*')
      .eq('status', 'active')
      .gt('stock', 0)
      .order('rank_score', { ascending: false })
      .limit(limit);

    if (error) {
      this.logger.error('获取排行榜失败:', error);
      return [];
    }

    return data || [];
  }

  /**
   * 获取用户未邮寄的回礼礼品
   * 返回嘉宾收到的商城礼品回礼，且未邮寄/未置换的记录
   */
  async getUserReturnGifts(openid: string) {
    const client = getSupabaseClient();

    // 查询嘉宾收到的商城礼品回礼，且未邮寄的记录
    const { data, error } = await client
      .from('guest_return_gifts')
      .select(
        `
        id,
        product_id,
        product_name,
        product_price,
        product_image,
        banquet_id,
        need_delivery,
        is_mailed,
        exchange_status,
        created_at
      `
      )
      .eq('guest_openid', openid) // 查询该用户的回礼
      .eq('return_type', 'mall_gift')
      .eq('is_mailed', false)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('获取用户未邮寄回礼礼品失败:', error);
      return [];
    }

    // 获取宴会名称
    const banquetIds = [...new Set(data?.map((item: any) => item.banquet_id).filter(Boolean))];
    let banquetMap: Record<string, string> = {};

    if (banquetIds.length > 0) {
      const { data: banquets } = await client
        .from('banquets')
        .select('id, banquet_name')
        .in('id', banquetIds);

      banquetMap = (banquets || []).reduce((map: Record<string, string>, b: any) => {
        map[b.id] = b.banquet_name;
        return map;
      }, {});
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      product_id: item.product_id,
      product_name: item.product_name || '未知礼品',
      product_price: item.product_price || 0,
      product_image: item.product_image || '',
      banquet_id: item.banquet_id,
      banquet_name: banquetMap[item.banquet_id] || '未知宴会',
      created_at: item.created_at,
    }));
  }

  /**
   * 礼品置换
   * 用未邮寄的商城回礼礼品兑换新礼品，收取10%手续费
   * 规则：回礼价值打9折后，与目标礼品价格对比，不足部分需补差价
   */
  async exchangeGifts(
    openid: string,
    returnGiftIds: string[],
    targetProductId: string,
    diffAmount: number
  ) {
    const client = getSupabaseClient();

    // 1. 验证目标商品
    const targetProduct = await this.getProductById(targetProductId);
    if (!targetProduct) {
      throw new Error('目标商品不存在');
    }
    if (targetProduct.stock < 1) {
      throw new Error('目标商品库存不足');
    }

    // 2. 验证回礼礼品归属和状态
    const { data: returnGifts, error: queryError } = await client
      .from('guest_return_gifts')
      .select('*')
      .in('id', returnGiftIds)
      .eq('is_mailed', false);

    if (queryError || !returnGifts?.length) {
      this.logger.error('查询回礼失败:', queryError);
      throw new Error('回礼礼品不存在或不可置换');
    }

    // 3. 计算回礼总价值（扣除10%手续费）
    const totalOriginalValue = returnGifts.reduce((sum: number, item: any) => {
      return sum + (item.product_price || 0);
    }, 0);

    const serviceFee = Math.floor(totalOriginalValue * 0.1); // 10%手续费（分）
    const actualValue = totalOriginalValue - serviceFee;

    // 4. 验证差价计算
    const targetPrice = targetProduct.price;
    const expectedDiff = Math.max(0, targetPrice - actualValue);

    if (Math.abs(expectedDiff - diffAmount) > 1) {
      // 允许1分误差
      this.logger.error(`差价计算错误: expected=${expectedDiff}, actual=${diffAmount}`);
      throw new Error(`差价计算错误，需要补 ${(expectedDiff / 100).toFixed(2)} 元`);
    }

    // 5. 如果需要补差价，这里应该调用支付接口（暂时跳过，后续接入微信支付）

    // 6. 标记原回礼为已使用/已置换
    const { error: updateError } = await client
      .from('guest_return_gifts')
      .update({
        is_mailed: true,
        exchange_status: 'replaced',
      })
      .in('id', returnGiftIds);

    if (updateError) {
      this.logger.error('更新回礼状态失败:', updateError);
      throw new Error('更新回礼状态失败');
    }

    // 7. 扣减目标商品库存
    await client
      .from('products')
      .update({ stock: targetProduct.stock - 1 })
      .eq('id', targetProductId);

    // 8. 创建新的礼品记录
    const { data: newGift, error: newGiftError } = await client
      .from('guest_return_gifts')
      .insert({
        product_id: targetProductId,
        product_name: targetProduct.name,
        product_price: targetProduct.price,
        product_image: targetProduct.image,
        return_type: 'mall_gift',
        need_delivery: true,
        is_mailed: false,
        exchange_status: 'completed',
      })
      .select()
      .single();

    if (newGiftError) {
      this.logger.error('创建新礼品记录失败:', newGiftError);
    }

    // 9. 创建置换记录
    const { data: exchangeRecord, error: insertError } = await client
      .from('gift_exchange_records')
      .insert({
        openid: openid,
        source_gifts: returnGifts.map((g: any) => ({
          id: g.id,
          name: g.product_name,
          cost_price: g.mall_product_cost_price || Math.floor(g.product_price * 0.6),
          price: g.product_price,
          quantity: 1,
        })),
        target_products: [
          {
            id: targetProductId,
            name: targetProduct.name,
            price: targetProduct.price,
            quantity: 1,
          },
        ],
        total_deductible: actualValue,
        total_target_amount: targetPrice,
        price_difference: diffAmount,
        service_fee: serviceFee,
        actual_payment: diffAmount + serviceFee,
        payment_status: diffAmount > 0 ? 'pending' : 'completed',
      })
      .select()
      .single();

    if (insertError) {
      this.logger.error('创建置换记录失败:', insertError);
      // 不抛出错误，因为置换已经成功
    }

    return {
      success: true,
      exchangeId: exchangeRecord?.id,
      newGiftId: newGift?.id,
      originalValue: totalOriginalValue,
      serviceFee: serviceFee,
      actualValue: actualValue,
      diffAmount: diffAmount,
    };
  }

  /**
   * 获取兑换记录（旧版，保留兼容）
   */
  async getExchangeRecords(openid: string) {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('voucher_exchanges')
      .select('*, products(*)')
      .eq('user_openid', openid)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('获取兑换记录失败:', error);
      return [];
    }

    return data || [];
  }
}
