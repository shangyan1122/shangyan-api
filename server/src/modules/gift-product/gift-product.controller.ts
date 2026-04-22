import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 商城商品控制器
 */
@Controller('gift-products')
export class GiftProductController {
  private readonly logger = new Logger(GiftProductController.name);

  /**
   * 获取商品列表
   * 支持按分类筛选
   */
  @Get()
  async getProducts(@Query('category') category?: string) {
    this.logger.log(`获取商品列表: category=${category}`);

    try {
      const client = getSupabaseClient();

      let query = client
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('sold_count', { ascending: false });

      if (category) {
        query = query.eq('category_id', category);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error(`获取商品列表失败: ${error.message}`);
        return { code: 500, msg: '获取商品列表失败', data: [] };
      }

      // 转换价格格式
      const products = (data || []).map((item) => ({
        ...item,
        price: item.price,
        originalPrice: item.original_price,
        displayPrice: (item.price / 100).toFixed(2),
        displayOriginalPrice: item.original_price ? (item.original_price / 100).toFixed(2) : null,
      }));

      return { code: 200, msg: 'success', data: products };
    } catch (error: any) {
      this.logger.error(`获取商品列表异常: ${error.message}`);
      return { code: 500, msg: '获取商品列表失败', data: [] };
    }
  }

  /**
   * 获取商品分类列表
   */
  @Get('categories')
  async getCategories() {
    this.logger.log('获取商品分类');

    try {
      const client = getSupabaseClient();

      const { data, error } = await client
        .from('products')
        .select('category_id')
        .eq('status', 'active');

      if (error) {
        this.logger.error(`获取商品分类失败: ${error.message}`);
        return { code: 500, msg: '获取分类失败', data: [] };
      }

      // 去重并统计
      const categoryMap = new Map<string, number>();
      (data || []).forEach((item) => {
        const cat = item.category_id || '未分类';
        const count = categoryMap.get(cat) || 0;
        categoryMap.set(cat, count + 1);
      });

      const categories = Array.from(categoryMap.entries()).map(([name, count]) => ({
        name,
        count,
      }));

      return { code: 200, msg: 'success', data: categories };
    } catch (error: any) {
      this.logger.error(`获取商品分类异常: ${error.message}`);
      return { code: 500, msg: '获取分类失败', data: [] };
    }
  }

  /**
   * 获取商品详情
   */
  @Get(':id')
  async getProductById(@Query('id') id: string) {
    this.logger.log(`获取商品详情: id=${id}`);

    try {
      const client = getSupabaseClient();

      const { data, error } = await client.from('products').select('*').eq('id', id).single();

      if (error || !data) {
        return { code: 404, msg: '商品不存在', data: null };
      }

      const product = {
        ...data,
        displayPrice: (data.price / 100).toFixed(2),
        displayOriginalPrice: data.original_price ? (data.original_price / 100).toFixed(2) : null,
      };

      return { code: 200, msg: 'success', data: product };
    } catch (error: any) {
      this.logger.error(`获取商品详情异常: ${error.message}`);
      return { code: 500, msg: '获取商品详情失败', data: null };
    }
  }
}
