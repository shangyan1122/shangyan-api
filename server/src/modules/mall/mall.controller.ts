import { Controller, Get, Post, Body, Query, Param, Logger } from '@nestjs/common';
import { MallService } from './mall.service';

@Controller('mall')
export class MallController {
  private readonly logger = new Logger(MallController.name);

  constructor(private readonly mallService: MallService) {}

  /**
   * 获取商品列表
   */
  @Get('products')
  async getProducts(
    @Query('category') category?: string,
    @Query('scene_category') sceneCategory?: string,
    @Query('price_tier') priceTier?: string,
    @Query('limit') limit?: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20'
  ) {
    const result = await this.mallService.getProducts(
      category,
      parseInt(page),
      parseInt(pageSize),
      sceneCategory,
      priceTier,
      limit ? parseInt(limit) : undefined
    );

    return {
      code: 200,
      msg: 'success',
      data: result,
    };
  }

  /**
   * 获取地方特产
   */
  @Get('specialties')
  async getSpecialties(@Query('region') region?: string) {
    const specialties = await this.mallService.getSpecialties(region);

    return {
      code: 200,
      msg: 'success',
      data: { specialties },
    };
  }

  /**
   * 获取热门商品
   */
  @Get('hot')
  async getHotProducts(@Query('limit') limit: string = '6') {
    const products = await this.mallService.getHotProducts(parseInt(limit));

    return {
      code: 200,
      msg: 'success',
      data: products,
    };
  }

  /**
   * 获取推荐商品
   */
  @Get('recommended')
  async getRecommendedProducts(@Query('limit') limit: string = '6') {
    const products = await this.mallService.getRecommendedProducts(parseInt(limit));

    return {
      code: 200,
      msg: 'success',
      data: products,
    };
  }

  /**
   * 获取排行榜商品
   */
  @Get('rank')
  async getRankedProducts(@Query('limit') limit: string = '10') {
    const products = await this.mallService.getRankedProducts(parseInt(limit));

    return {
      code: 200,
      msg: 'success',
      data: products,
    };
  }

  /**
   * 获取商品详情
   */
  @Get('product/:id')
  async getProduct(@Param('id') id: string) {
    const product = await this.mallService.getProductById(id);

    if (!product) {
      return {
        code: 404,
        msg: '商品不存在',
        data: null,
      };
    }

    return {
      code: 200,
      msg: 'success',
      data: product,
    };
  }

  /**
   * 添加到购物车
   */
  @Post('cart/add')
  async addToCart(@Body() body: { openid?: string; productId: string; quantity?: number }) {
    const userOpenid = body.openid || 'test_user_openid';
    const { productId, quantity = 1 } = body;

    try {
      const item = await this.mallService.addToCart(userOpenid, productId, quantity);

      return {
        code: 200,
        msg: '已加入购物车',
        data: {
          id: item.id,
          quantity: item.quantity,
        },
      };
    } catch (error) {
      return {
        code: 400,
        msg: error.message || '添加失败',
        data: null,
      };
    }
  }

  /**
   * 获取购物车
   */
  @Get('cart')
  async getCart(@Query('openid') openid?: string) {
    const userOpenid = openid || 'test_user_openid';

    const items = await this.mallService.getCart(userOpenid);

    // 计算总价
    let totalAmount = 0;
    const cartItems = items.map((item) => {
      const product = item.product as any;
      const subtotal = product?.price * item.quantity || 0;
      totalAmount += subtotal;
      return {
        ...item,
        product,
        subtotal,
      };
    });

    return {
      code: 200,
      msg: 'success',
      data: {
        items: cartItems,
        totalAmount,
        itemCount: items.length,
      },
    };
  }

  /**
   * 更新购物车商品数量
   */
  @Post('cart/update')
  async updateCart(@Body() body: { openid?: string; cartItemId: string; quantity: number }) {
    const userOpenid = body.openid || 'test_user_openid';
    const { cartItemId, quantity } = body;

    try {
      await this.mallService.updateCartQuantity(userOpenid, cartItemId, quantity);

      return {
        code: 200,
        msg: '更新成功',
        data: null,
      };
    } catch (error) {
      return {
        code: 400,
        msg: error.message || '更新失败',
        data: null,
      };
    }
  }

  /**
   * 清空购物车
   */
  @Post('cart/clear')
  async clearCart(@Body() body: { openid?: string }) {
    const userOpenid = body.openid || 'test_user_openid';

    await this.mallService.clearCart(userOpenid);

    return {
      code: 200,
      msg: '购物车已清空',
      data: null,
    };
  }

  /**
   * 获取购物车商品数量
   */
  @Get('cart/count')
  async getCartCount(@Query('openid') openid?: string) {
    const userOpenid = openid || 'test_user_openid';

    const count = await this.mallService.getCartCount(userOpenid);

    return {
      code: 200,
      msg: 'success',
      data: { count },
    };
  }

  /**
   * 获取用户未邮寄的回礼礼品
   */
  @Get('user-return-gifts')
  async getUserReturnGifts(@Query('openid') openid: string) {
    if (!openid) {
      return {
        code: 400,
        msg: '缺少openid参数',
        data: null,
      };
    }

    const gifts = await this.mallService.getUserReturnGifts(openid);

    return {
      code: 200,
      msg: 'success',
      data: gifts,
    };
  }

  /**
   * 礼品置换
   * 用未邮寄的商城回礼礼品兑换新礼品，收取10%手续费
   */
  @Post('exchange')
  async exchangeGift(
    @Body()
    body: {
      openid: string;
      returnGiftIds: string[]; // 要置换的回礼礼品ID列表
      targetProductId: string; // 目标礼品ID
      diffAmount: number; // 需要补的差价（分）
    }
  ) {
    const { openid, returnGiftIds, targetProductId, diffAmount } = body;

    if (!openid || !returnGiftIds?.length || !targetProductId) {
      return {
        code: 400,
        msg: '参数错误',
        data: null,
      };
    }

    try {
      const result = await this.mallService.exchangeGifts(
        openid,
        returnGiftIds,
        targetProductId,
        diffAmount
      );

      return {
        code: 200,
        msg: '置换成功',
        data: result,
      };
    } catch (error: any) {
      this.logger.error(`礼品置换失败: ${error.message}`);
      return {
        code: 400,
        msg: error.message || '置换失败',
        data: null,
      };
    }
  }

  /**
   * 获取用户兑换记录
   */
  @Get('exchanges')
  async getExchangeRecords(@Query('openid') openid: string) {
    if (!openid) {
      return {
        code: 400,
        msg: '缺少openid参数',
        data: null,
      };
    }

    const records = await this.mallService.getExchangeRecords(openid);

    return {
      code: 200,
      msg: 'success',
      data: records,
    };
  }
}
