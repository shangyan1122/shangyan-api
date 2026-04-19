import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { GiftExchangeService, CreateExchangeDto } from './gift-exchange.service';

/**
 * 商品置换控制器
 */
@Controller('gift-exchange')
export class GiftExchangeController {
  private readonly logger = new Logger(GiftExchangeController.name);

  constructor(private readonly exchangeService: GiftExchangeService) {}

  /**
   * 预览置换方案
   */
  @Post('preview')
  async previewExchange(@Body() body: { sourceItems: any[]; targetItems: any[] }) {
    try {
      const result = await this.exchangeService.previewExchange(body.sourceItems, body.targetItems);
      return { code: 200, msg: 'success', data: result };
    } catch (error: any) {
      return { code: 500, msg: error.message, data: null };
    }
  }

  /**
   * 创建置换申请
   */
  @Post('create')
  async createExchange(@Body() body: CreateExchangeDto) {
    this.logger.log(`创建置换: user=${body.userOpenid}, type=${body.exchangeType}`);

    try {
      const result = await this.exchangeService.createExchange(body);
      return { code: 200, msg: 'success', data: result };
    } catch (error: any) {
      this.logger.error(`创建置换失败: ${error.message}`);
      return { code: 500, msg: error.message, data: null };
    }
  }

  /**
   * 获取用户可用回礼
   */
  @Get('available-gifts')
  async getAvailableGifts(@Query('openid') openid: string) {
    try {
      const gifts = await this.exchangeService.getUserAvailableGifts(openid);
      return { code: 200, msg: 'success', data: gifts };
    } catch (error: any) {
      return { code: 500, msg: '获取失败', data: [] };
    }
  }

  /**
   * 获取置换记录
   */
  @Get('records')
  async getExchangeRecords(
    @Query('openid') openid: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    try {
      const result = await this.exchangeService.getUserExchanges(
        openid,
        parseInt(page || '1'),
        parseInt(pageSize || '10')
      );
      return { code: 200, msg: 'success', data: result };
    } catch (error: any) {
      return { code: 500, msg: '获取失败', data: { records: [], total: 0 } };
    }
  }

  /**
   * 获取置换详情
   */
  @Get(':id')
  async getExchangeById(@Param('id') id: string) {
    try {
      const result = await this.exchangeService.getExchangeById(id);
      if (!result) {
        return { code: 404, msg: '置换记录不存在', data: null };
      }
      return { code: 200, msg: 'success', data: result };
    } catch (error: any) {
      return { code: 500, msg: '获取失败', data: null };
    }
  }

  /**
   * 差价支付成功回调
   */
  @Post('diff-payment-success')
  async handleDiffPaymentSuccess(@Body() body: { exchangeNo: string; transactionId: string }) {
    try {
      const success = await this.exchangeService.handleDiffPaymentSuccess(
        body.exchangeNo,
        body.transactionId
      );
      return { code: 200, msg: 'success', data: { success } };
    } catch (error: any) {
      return { code: 500, msg: error.message, data: { success: false } };
    }
  }

  /**
   * 完成置换
   */
  @Post('complete')
  async completeExchange(@Body() body: { exchangeId: string }) {
    try {
      const success = await this.exchangeService.completeExchange(body.exchangeId);
      return { code: 200, msg: 'success', data: { success } };
    } catch (error: any) {
      return { code: 500, msg: error.message, data: { success: false } };
    }
  }

  /**
   * 取消置换
   */
  @Post('cancel')
  async cancelExchange(@Body() body: { exchangeId: string }) {
    try {
      const success = await this.exchangeService.cancelExchange(body.exchangeId);
      return { code: 200, msg: 'success', data: { success } };
    } catch (error: any) {
      return { code: 500, msg: error.message, data: { success: false } };
    }
  }
}
