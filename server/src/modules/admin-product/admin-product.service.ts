import { Injectable, Logger } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const supabase = getSupabaseClient();

/**
 * 商城商品接口
 */
export interface AdminGiftProduct {
  id: string;
  name: string;
  description?: string;
  price: number; // 售价（分）
  original_price: number; // 原价（分）
  image: string;
  images?: string[];
  category: string;
  stock: number;
  sales: number;
  status: 'active' | 'inactive';
  // 1688代发字段
  gift_type: 'onsite' | 'delivery';
  alibaba_1688_product_id?: string;
  alibaba_1688_sku_id?: string;
  alibaba_1688_url?: string;
  supply_cost_price: number; // 供货成本价（分）
  alibaba_1688_sync_status: 'none' | 'pending' | 'synced' | 'failed';
  alibaba_1688_synced_at?: string;
  source: 'manual' | 'alibaba_1688';
  created_at: string;
  updated_at?: string;
}

/**
 * 1688商品搜索结果
 */
export interface Alibaba1688Product {
  productId: string;
  name: string;
  image: string;
  images: string[];
  price: number; // 供货价（分）
  priceRange?: { min: number; max: number };
  skuList?: { skuId: string; name: string; price: number }[];
  category?: string;
  description?: string;
  url: string;
  shopName?: string;
  minOrderQuantity?: number;
}

/**
 * 商品创建参数
 */
export interface CreateProductParams {
  name: string;
  description?: string;
  price: number;
  original_price: number;
  image: string;
  images?: string[];
  category: string;
  stock: number;
  gift_type?: 'onsite' | 'delivery';
  alibaba_1688_product_id?: string;
  alibaba_1688_sku_id?: string;
  alibaba_1688_url?: string;
  supply_cost_price?: number;
  source?: 'manual' | 'alibaba_1688';
}

/**
 * 管理后台商品服务
 *
 * 功能：
 * 1. 商品CRUD管理
 * 2. 1688商品搜索（模拟）
 * 3. 1688商品导入
 */
@Injectable()
export class AdminProductService {
  private readonly logger = new Logger(AdminProductService.name);

  // 默认加价倍率
  private readonly DEFAULT_MARKUP_RATE = 1.2;

  /**
   * 获取商品列表（管理后台）
   */
  async getProducts(params?: {
    category?: string;
    status?: string;
    source?: string;
    gift_type?: string;
    keyword?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ products: AdminGiftProduct[]; total: number }> {
    this.logger.log(`获取商品列表: ${JSON.stringify(params)}`);

    let query = supabase.from('products').select('*', { count: 'exact' });

    if (params?.category) {
      query = query.eq('category', params.category);
    }
    if (params?.status) {
      query = query.eq('status', params.status);
    }
    if (params?.source) {
      query = query.eq('source', params.source);
    }
    if (params?.gift_type) {
      query = query.eq('gift_type', params.gift_type);
    }
    if (params?.keyword) {
      query = query.ilike('name', `%${params.keyword}%`);
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    query = query.order('created_at', { ascending: false });
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      this.logger.error('获取商品列表失败:', error);
      throw new Error('获取商品列表失败');
    }

    return {
      products: data || [],
      total: count || 0,
    };
  }

  /**
   * 获取商品详情
   */
  async getProductById(id: string): Promise<AdminGiftProduct | null> {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      this.logger.error('获取商品详情失败:', error);
      throw new Error('获取商品详情失败');
    }

    return data;
  }

  /**
   * 创建商品
   */
  async createProduct(params: CreateProductParams): Promise<AdminGiftProduct> {
    this.logger.log(`创建商品: ${params.name}`);

    // 生成唯一ID：使用时间戳 + 随机数
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const productId = `prod_${timestamp}_${random}`;

    const { data, error } = await supabase
      .from('products')
      .insert({
        id: productId,
        ...params,
        gift_type: params.gift_type || 'onsite',
        source: params.source || 'manual',
        supply_cost_price: params.supply_cost_price || 0,
        alibaba_1688_sync_status: 'none',
        status: 'active',
        sold_count: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      this.logger.error('创建商品失败:', error);
      throw new Error('创建商品失败');
    }

    return data;
  }

  /**
   * 更新商品
   */
  async updateProduct(id: string, params: Partial<CreateProductParams>): Promise<AdminGiftProduct> {
    this.logger.log(`更新商品: ${id}`);

    const { data, error } = await supabase
      .from('products')
      .update({
        ...params,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error('更新商品失败:', error);
      throw new Error('更新商品失败');
    }

    return data;
  }

  /**
   * 删除商品
   */
  async deleteProduct(id: string): Promise<void> {
    this.logger.log(`删除商品: ${id}`);

    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      this.logger.error('删除商品失败:', error);
      throw new Error('删除商品失败');
    }
  }

  /**
   * 切换商品状态
   */
  async toggleProductStatus(id: string): Promise<AdminGiftProduct> {
    const product = await this.getProductById(id);
    if (!product) {
      throw new Error('商品不存在');
    }

    const newStatus = product.status === 'active' ? 'inactive' : 'active';

    const { data, error } = await supabase
      .from('products')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error('切换商品状态失败:', error);
      throw new Error('切换商品状态失败');
    }

    return data;
  }

  /**
   * 调整商品价格和服务费
   */
  async updateProductPrice(
    id: string,
    params: {
      price: number;
      originalPrice?: number;
      exchangeServiceFeeRate?: number; // 置换服务费率（百分比，如5表示5%）
      reason?: string;
    }
  ): Promise<AdminGiftProduct> {
    const product = await this.getProductById(id);
    if (!product) {
      throw new Error('商品不存在');
    }

    // 验证价格
    if (params.price < 0) {
      throw new Error('售价不能为负数');
    }
    if (params.originalPrice !== undefined && params.originalPrice < 0) {
      throw new Error('原价不能为负数');
    }
    // 验证置换服务费率
    if (params.exchangeServiceFeeRate !== undefined) {
      if (params.exchangeServiceFeeRate < 0 || params.exchangeServiceFeeRate > 100) {
        throw new Error('置换服务费率必须在0-100之间');
      }
    }

    // 对于1688商品，检查售价不能低于成本价
    if (product.source === 'alibaba_1688' && product.supply_cost_price > 0) {
      if (params.price < product.supply_cost_price) {
        throw new Error(`售价不能低于成本价¥${(product.supply_cost_price / 100).toFixed(2)}`);
      }
    }

    this.logger.log(
      `调整商品价格: ${id}, 原价=${product.price}, 新价=${params.price}, 服务费率=${params.exchangeServiceFeeRate}%, 原因=${params.reason || '无'}`
    );

    const updateData: Record<string, any> = {
      price: params.price,
      updated_at: new Date().toISOString(),
    };

    // 如果提供了新原价，也更新
    if (params.originalPrice !== undefined) {
      updateData.original_price = params.originalPrice;
    }

    // 如果提供了置换服务费率，更新（转换为小数存储，如5% -> 0.05）
    if (params.exchangeServiceFeeRate !== undefined) {
      updateData.exchange_service_fee_rate = params.exchangeServiceFeeRate / 100;
    }

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error('调整商品价格失败:', error);
      throw new Error('调整商品价格失败');
    }

    return data;
  }

  /**
   * 搜索1688商品（模拟）
   *
   * 实际对接时需要调用1688开放平台API
   * 目前返回模拟数据供前端测试
   */
  async search1688Products(
    keyword: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{
    products: Alibaba1688Product[];
    total: number;
  }> {
    this.logger.log(`搜索1688商品: keyword=${keyword}, page=${page}`);

    // 模拟1688商品搜索结果
    const mockProducts: Alibaba1688Product[] = [
      {
        productId: '1688_001',
        name: '高档喜糖礼盒装20颗装',
        image: 'https://cbu01.alicdn.com/img/example1.jpg',
        images: [
          'https://cbu01.alicdn.com/img/example1.jpg',
          'https://cbu01.alicdn.com/img/example1_2.jpg',
        ],
        price: 1800, // 18元
        category: '喜糖礼盒',
        description: '高档喜糖礼盒，内含20颗精选糖果，适合婚宴回礼',
        url: 'https://detail.1688.com/offer/001.html',
        shopName: '喜庆糖果批发店',
        minOrderQuantity: 10,
      },
      {
        productId: '1688_002',
        name: '创意伴手礼小礼盒',
        image: 'https://cbu01.alicdn.com/img/example2.jpg',
        images: [
          'https://cbu01.alicdn.com/img/example2.jpg',
          'https://cbu01.alicdn.com/img/example2_2.jpg',
        ],
        price: 1500, // 15元
        category: '伴手礼',
        description: '创意小礼盒，可用于婚宴、生日、满月等场合',
        url: 'https://detail.1688.com/offer/002.html',
        shopName: '礼品包装工厂',
        minOrderQuantity: 20,
      },
      {
        productId: '1688_003',
        name: '中式婚礼红包封套',
        image: 'https://cbu01.alicdn.com/img/example3.jpg',
        images: ['https://cbu01.alicdn.com/img/example3.jpg'],
        price: 200, // 2元
        category: '红包',
        description: '中式婚礼专用红包封套，烫金工艺',
        url: 'https://detail.1688.com/offer/003.html',
        shopName: '印刷制品厂',
        minOrderQuantity: 100,
      },
      {
        productId: '1688_004',
        name: '精美玻璃杯礼盒装',
        image: 'https://cbu01.alicdn.com/img/example4.jpg',
        images: [
          'https://cbu01.alicdn.com/img/example4.jpg',
          'https://cbu01.alicdn.com/img/example4_2.jpg',
        ],
        price: 2800, // 28元
        category: '生活用品',
        description: '精美玻璃杯礼盒，适合乔迁、开业回礼',
        url: 'https://detail.1688.com/offer/004.html',
        shopName: '玻璃制品工厂',
        minOrderQuantity: 10,
      },
      {
        productId: '1688_005',
        name: '定制马克杯情侣套装',
        image: 'https://cbu01.alicdn.com/img/example5.jpg',
        images: ['https://cbu01.alicdn.com/img/example5.jpg'],
        price: 3200, // 32元
        category: '生活用品',
        description: '可定制图案的马克杯情侣套装',
        url: 'https://detail.1688.com/offer/005.html',
        shopName: '陶瓷定制工厂',
        minOrderQuantity: 5,
      },
    ];

    // 根据关键词过滤
    const filteredProducts = mockProducts.filter(
      (p) =>
        !keyword ||
        p.name.includes(keyword) ||
        p.category?.includes(keyword) ||
        p.description?.includes(keyword)
    );

    // 分页
    const start = (page - 1) * pageSize;
    const paginatedProducts = filteredProducts.slice(start, start + pageSize);

    return {
      products: paginatedProducts,
      total: filteredProducts.length,
    };
  }

  /**
   * 从1688导入商品
   */
  async importFrom1688(params: {
    productId: string;
    category: string;
    stock?: number;
    markupRate?: number;
  }): Promise<AdminGiftProduct> {
    this.logger.log(`从1688导入商品: productId=${params.productId}`);

    // 1. 获取1688商品信息（从模拟数据中直接查找）
    const allProducts = await this.search1688Products('');
    const alibabaProduct = allProducts.products.find((p) => p.productId === params.productId);

    if (!alibabaProduct) {
      throw new Error('1688商品不存在');
    }

    // 2. 计算售价
    const markupRate = params.markupRate || this.DEFAULT_MARKUP_RATE;
    const salePrice = Math.round(alibabaProduct.price * markupRate);

    // 3. 创建商品
    const product = await this.createProduct({
      name: alibabaProduct.name,
      description: alibabaProduct.description,
      price: salePrice,
      original_price: salePrice, // 原价等于售价
      image: alibabaProduct.image,
      images: alibabaProduct.images,
      category: params.category,
      stock: params.stock || 999,
      gift_type: 'delivery',
      alibaba_1688_product_id: alibabaProduct.productId,
      alibaba_1688_url: alibabaProduct.url,
      supply_cost_price: alibabaProduct.price,
      source: 'alibaba_1688',
    });

    // 4. 更新同步状态
    await supabase
      .from('products')
      .update({
        alibaba_1688_sync_status: 'synced',
        alibaba_1688_synced_at: new Date().toISOString(),
      })
      .eq('id', product.id);

    this.logger.log(
      `商品导入成功: ${product.id}, 售价=${salePrice}分, 成本=${alibabaProduct.price}分`
    );

    return product;
  }

  /**
   * 批量导入1688商品
   */
  async batchImportFrom1688(
    items: {
      productId: string;
      category: string;
      stock?: number;
      markupRate?: number;
    }[]
  ): Promise<{ success: number; failed: number; products: AdminGiftProduct[] }> {
    this.logger.log(`批量导入1688商品: ${items.length}个`);

    const results: AdminGiftProduct[] = [];
    let success = 0;
    let failed = 0;

    for (const item of items) {
      try {
        const product = await this.importFrom1688(item);
        results.push(product);
        success++;
      } catch (error: any) {
        this.logger.error(`导入商品失败: productId=${item.productId}, error=${error.message}`);
        failed++;
      }
    }

    return { success, failed, products: results };
  }

  /**
   * 获取商品统计数据
   */
  async getProductStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    from1688: number;
    manual: number;
  }> {
    const { data, error } = await supabase.from('products').select('status, source');

    if (error) {
      this.logger.error('获取商品统计失败:', error);
      throw new Error('获取商品统计失败');
    }

    const stats = {
      total: data?.length || 0,
      active: data?.filter((p) => p.status === 'active').length || 0,
      inactive: data?.filter((p) => p.status === 'inactive').length || 0,
      from1688: data?.filter((p) => p.source === 'alibaba_1688').length || 0,
      manual: data?.filter((p) => p.source === 'manual').length || 0,
    };

    return stats;
  }

  /**
   * 获取商品分类列表
   */
  async getCategories(): Promise<{ name: string; count: number }[]> {
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .eq('status', 'active');

    if (error) {
      this.logger.error('获取分类失败:', error);
      throw new Error('获取分类失败');
    }

    const categoryMap = new Map<string, number>();
    (data || []).forEach((item) => {
      const count = categoryMap.get(item.category) || 0;
      categoryMap.set(item.category, count + 1);
    });

    return Array.from(categoryMap.entries()).map(([name, count]) => ({
      name,
      count,
    }));
  }
}
