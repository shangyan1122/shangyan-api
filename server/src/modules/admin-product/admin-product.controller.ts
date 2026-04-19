import { Controller, Get, Post, Put, Delete, Body, Query, Param } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { AdminProductService, CreateProductParams } from './admin-product.service';

/**
 * 管理后台商品控制器
 *
 * 功能：
 * 1. 商品CRUD管理
 * 2. 1688商品搜索
 * 3. 1688商品导入
 */
@Controller('admin/products')
export class AdminProductController {
  private readonly logger = new Logger(AdminProductController.name);

  constructor(private readonly adminProductService: AdminProductService) {}

  /**
   * 获取商品列表
   * GET /api/admin/products
   */
  @Get()
  async getProducts(
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('gift_type') gift_type?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    this.logger.log(`获取商品列表: category=${category}, keyword=${keyword}`);

    try {
      const result = await this.adminProductService.getProducts({
        category,
        status,
        source,
        gift_type,
        keyword,
        page: page ? parseInt(page) : 1,
        pageSize: pageSize ? parseInt(pageSize) : 20,
      });

      return {
        code: 200,
        msg: 'success',
        data: result.products,
        total: result.total,
      };
    } catch (error: any) {
      this.logger.error(`获取商品列表失败: ${error.message}`);
      return { code: 500, msg: '获取商品列表失败', data: [] };
    }
  }

  /**
   * 获取商品统计
   * GET /api/admin/products/stats
   */
  @Get('stats')
  async getProductStats() {
    this.logger.log('获取商品统计');

    try {
      const stats = await this.adminProductService.getProductStats();
      return { code: 200, msg: 'success', data: stats };
    } catch (error: any) {
      this.logger.error(`获取商品统计失败: ${error.message}`);
      return { code: 500, msg: '获取商品统计失败', data: null };
    }
  }

  /**
   * 获取商品分类
   * GET /api/admin/products/categories
   */
  @Get('categories')
  async getCategories() {
    this.logger.log('获取商品分类');

    try {
      const categories = await this.adminProductService.getCategories();
      return { code: 200, msg: 'success', data: categories };
    } catch (error: any) {
      this.logger.error(`获取商品分类失败: ${error.message}`);
      return { code: 500, msg: '获取商品分类失败', data: [] };
    }
  }

  /**
   * 搜索1688商品
   * GET /api/admin/products/search-1688
   */
  @Get('search-1688')
  async search1688Products(
    @Query('keyword') keyword: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    this.logger.log(`搜索1688商品: keyword=${keyword}`);

    try {
      const result = await this.adminProductService.search1688Products(
        keyword || '',
        page ? parseInt(page) : 1,
        pageSize ? parseInt(pageSize) : 20
      );

      return {
        code: 200,
        msg: 'success',
        data: result.products,
        total: result.total,
      };
    } catch (error: any) {
      this.logger.error(`搜索1688商品失败: ${error.message}`);
      return { code: 500, msg: '搜索1688商品失败', data: [] };
    }
  }

  /**
   * 获取商品详情
   * GET /api/admin/products/:id
   */
  @Get(':id')
  async getProductById(@Param('id') id: string) {
    this.logger.log(`获取商品详情: id=${id}`);

    try {
      const product = await this.adminProductService.getProductById(id);
      if (!product) {
        return { code: 404, msg: '商品不存在', data: null };
      }
      return { code: 200, msg: 'success', data: product };
    } catch (error: any) {
      this.logger.error(`获取商品详情失败: ${error.message}`);
      return { code: 500, msg: '获取商品详情失败', data: null };
    }
  }

  /**
   * 创建商品
   * POST /api/admin/products
   */
  @Post()
  async createProduct(@Body() body: CreateProductParams) {
    this.logger.log(`创建商品: ${body.name}`);

    try {
      const product = await this.adminProductService.createProduct(body);
      return { code: 200, msg: '创建成功', data: product };
    } catch (error: any) {
      this.logger.error(`创建商品失败: ${error.message}`);
      return { code: 500, msg: '创建商品失败', data: null };
    }
  }

  /**
   * 从1688导入商品
   * POST /api/admin/products/import-1688
   */
  @Post('import-1688')
  async importFrom1688(
    @Body() body: { productId: string; category: string; stock?: number; markupRate?: number }
  ) {
    this.logger.log(`从1688导入商品: productId=${body.productId}`);

    try {
      const product = await this.adminProductService.importFrom1688(body);
      return { code: 200, msg: '导入成功', data: product };
    } catch (error: any) {
      this.logger.error(`导入商品失败: ${error.message}`);
      return { code: 500, msg: error.message || '导入商品失败', data: null };
    }
  }

  /**
   * 批量导入1688商品
   * POST /api/admin/products/batch-import-1688
   */
  @Post('batch-import-1688')
  async batchImportFrom1688(
    @Body()
    body: {
      items: {
        productId: string;
        category: string;
        stock?: number;
        markupRate?: number;
      }[];
    }
  ) {
    this.logger.log(`批量导入1688商品: ${body.items.length}个`);

    try {
      const result = await this.adminProductService.batchImportFrom1688(body.items);
      return {
        code: 200,
        msg: `成功导入${result.success}个，失败${result.failed}个`,
        data: result.products,
      };
    } catch (error: any) {
      this.logger.error(`批量导入商品失败: ${error.message}`);
      return { code: 500, msg: '批量导入商品失败', data: null };
    }
  }

  /**
   * 更新商品
   * PUT /api/admin/products/:id
   */
  @Put(':id')
  async updateProduct(@Param('id') id: string, @Body() body: Partial<CreateProductParams>) {
    this.logger.log(`更新商品: id=${id}`);

    try {
      const product = await this.adminProductService.updateProduct(id, body);
      return { code: 200, msg: '更新成功', data: product };
    } catch (error: any) {
      this.logger.error(`更新商品失败: ${error.message}`);
      return { code: 500, msg: '更新商品失败', data: null };
    }
  }

  /**
   * 切换商品状态
   * PUT /api/admin/products/:id/toggle-status
   */
  @Put(':id/toggle-status')
  async toggleProductStatus(@Param('id') id: string) {
    this.logger.log(`切换商品状态: id=${id}`);

    try {
      const product = await this.adminProductService.toggleProductStatus(id);
      return { code: 200, msg: '状态切换成功', data: product };
    } catch (error: any) {
      this.logger.error(`切换商品状态失败: ${error.message}`);
      return { code: 500, msg: '切换商品状态失败', data: null };
    }
  }

  /**
   * 调整商品价格和服务费
   * PUT /api/admin/products/:id/price
   */
  @Put(':id/price')
  async updateProductPrice(
    @Param('id') id: string,
    @Body()
    body: {
      price: number; // 新售价（单位：分）
      originalPrice?: number; // 新原价（单位：分）
      exchangeServiceFeeRate?: number; // 置换服务费率（如5表示5%）
      reason?: string; // 调价原因
    }
  ) {
    this.logger.log(
      `调整商品价格: id=${id}, price=${body.price}, feeRate=${body.exchangeServiceFeeRate}`
    );

    try {
      const product = await this.adminProductService.updateProductPrice(id, {
        price: body.price,
        originalPrice: body.originalPrice,
        exchangeServiceFeeRate: body.exchangeServiceFeeRate,
        reason: body.reason,
      });
      return { code: 200, msg: '调价成功', data: product };
    } catch (error: any) {
      this.logger.error(`调整商品价格失败: ${error.message}`);
      return { code: 500, msg: error.message || '调价失败', data: null };
    }
  }

  /**
   * 删除商品
   * DELETE /api/admin/products/:id
   */
  @Delete(':id')
  async deleteProduct(@Param('id') id: string) {
    this.logger.log(`删除商品: id=${id}`);

    try {
      await this.adminProductService.deleteProduct(id);
      return { code: 200, msg: '删除成功' };
    } catch (error: any) {
      this.logger.error(`删除商品失败: ${error.message}`);
      return { code: 500, msg: '删除商品失败' };
    }
  }
}
