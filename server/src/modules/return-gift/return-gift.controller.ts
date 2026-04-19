import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common';
import { ReturnGiftService, ReturnGiftSetting, GuestReturnGift } from './return-gift.service';

@Controller('return-gift')
export class ReturnGiftController {
  constructor(private readonly returnGiftService: ReturnGiftService) {}

  /**
   * 保存回礼设置
   * POST /api/return-gift/settings
   */
  @Post('settings')
  async saveSettings(@Body() body: any) {
    const { banquet_id, ...settings } = body;

    const result = await this.returnGiftService.saveReturnGiftSettings(banquet_id, settings);

    return {
      code: 200,
      msg: '保存成功',
      data: result,
    };
  }

  /**
   * 获取回礼设置
   * GET /api/return-gift/settings/:banquetId
   */
  @Get('settings/:banquetId')
  async getSettings(@Param('banquetId') banquetId: string) {
    const result = await this.returnGiftService.getReturnGiftSettings(banquetId);

    return {
      code: 200,
      msg: '获取成功',
      data: result,
    };
  }

  /**
   * 触发回礼（随礼成功后调用）
   * POST /api/return-gift/trigger
   */
  @Post('trigger')
  async triggerReturnGift(@Body() body: { gift_record_id: string }) {
    const result = await this.returnGiftService.triggerReturnGift(body.gift_record_id);

    return {
      code: 200,
      msg: '回礼已触发',
      data: result,
    };
  }

  /**
   * 获取嘉宾回礼记录
   * GET /api/return-gift/guest/:giftRecordId
   */
  @Get('guest/:giftRecordId')
  async getGuestReturnGift(@Param('giftRecordId') giftRecordId: string) {
    const result = await this.returnGiftService.getGuestReturnGift(giftRecordId);

    return {
      code: 200,
      msg: '获取成功',
      data: result,
    };
  }

  /**
   * 领取商城礼品
   * POST /api/return-gift/claim-mall
   */
  @Post('claim-mall')
  async claimMallGift(
    @Body()
    body: {
      return_gift_id: string;
      claim_type: 'delivery' | 'exchange';
      delivery_info?: { name: string; phone: string; address: string };
    }
  ) {
    const result = await this.returnGiftService.claimMallGift(
      body.return_gift_id,
      body.claim_type,
      body.delivery_info
    );

    return {
      code: 200,
      msg: '领取成功',
      data: result,
    };
  }

  /**
   * 领取现场礼品
   * POST /api/return-gift/claim-onsite
   */
  @Post('claim-onsite')
  async claimOnsiteGift(@Body() body: { return_gift_id: string }) {
    const result = await this.returnGiftService.claimOnsiteGift(body.return_gift_id);

    return {
      code: 200,
      msg: '领取成功',
      data: result,
    };
  }

  /**
   * 核销现场礼品
   * POST /api/return-gift/exchange
   */
  @Post('exchange')
  async exchangeOnsiteGift(@Body() body: { exchange_code: string }) {
    const result = await this.returnGiftService.exchangeOnsiteGift(body.exchange_code);

    return {
      code: 200,
      msg: '核销成功',
      data: result,
    };
  }

  /**
   * 核销现场礼品（带身份验证）
   * POST /api/return-gift/exchange-with-auth
   * 只有主办方指定的工作人员微信号才能核销
   */
  @Post('exchange-with-auth')
  async exchangeOnsiteGiftWithAuth(
    @Body() body: { exchange_code: string; verifier_wechat: string; verifier_openid?: string }
  ) {
    const result = await this.returnGiftService.exchangeOnsiteGiftWithAuth(
      body.exchange_code,
      body.verifier_wechat,
      body.verifier_openid
    );

    return {
      code: 200,
      msg: '核销成功',
      data: result,
    };
  }

  /**
   * 获取未领取礼品统计
   * GET /api/return-gift/unclaimed-stats/:banquetId
   */
  @Get('unclaimed-stats/:banquetId')
  async getUnclaimedStats(@Param('banquetId') banquetId: string) {
    const result = await this.returnGiftService.getUnclaimedGiftsStats(banquetId);

    return {
      code: 200,
      msg: '获取成功',
      data: result,
    };
  }

  /**
   * 退还未领取礼品
   * POST /api/return-gift/refund-unclaimed
   */
  @Post('refund-unclaimed')
  async refundUnclaimedGifts(@Body() body: { banquet_id: string }) {
    const result = await this.returnGiftService.refundUnclaimedGifts(body.banquet_id);

    return {
      code: 200,
      msg: result.message,
      data: result,
    };
  }

  /**
   * 手动触发自动确认发货（供定时任务或管理后台调用）
   * POST /api/return-gift/auto-ship
   */
  @Post('auto-ship')
  async autoShip() {
    const result = await this.returnGiftService.autoConfirmShipment();

    return {
      code: result.success ? 200 : 500,
      msg: result.message,
      data: { count: result.count },
    };
  }

  /**
   * 获取待发货订单列表
   * GET /api/return-gift/pending-ship
   */
  @Get('pending-ship')
  async getPendingShipOrders() {
    const result = await this.returnGiftService.getPendingShipOrders();

    return {
      code: result.success ? 200 : 500,
      msg: result.success ? '获取成功' : result.message,
      data: result.data,
    };
  }

  /**
   * 手动触发收货信息填写提醒（供定时任务调用）
   * POST /api/return-gift/send-delivery-reminders
   */
  @Post('send-delivery-reminders')
  async sendDeliveryReminders() {
    const result = await this.returnGiftService.sendDeliveryReminderNotices();

    return {
      code: result.success ? 200 : 500,
      msg: result.message,
      data: { count: result.count },
    };
  }

  /**
   * 获取未填写收货信息的订单列表
   * GET /api/return-gift/pending-delivery
   */
  @Get('pending-delivery')
  async getPendingDeliveryRecords(@Query('banquetId') banquetId?: string) {
    const result = await this.returnGiftService.getPendingDeliveryRecords(banquetId);

    return {
      code: result.success ? 200 : 500,
      msg: result.success ? '获取成功' : result.message,
      data: result.data,
    };
  }

  /**
   * 更新收货信息（嘉宾补充填写）
   * POST /api/return-gift/update-delivery
   */
  @Post('update-delivery')
  async updateDeliveryInfo(
    @Body()
    body: {
      return_gift_id: string;
      recipient_name: string;
      recipient_phone: string;
      recipient_address: string;
    }
  ) {
    const result = await this.returnGiftService.updateDeliveryInfo(
      body.return_gift_id,
      body.recipient_name,
      body.recipient_phone,
      body.recipient_address
    );

    return {
      code: result.success ? 200 : 500,
      msg: result.message,
      data: result.data,
    };
  }
}
