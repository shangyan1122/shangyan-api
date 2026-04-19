import { Controller, Post, Body, Get, Query, Logger } from '@nestjs/common';
import { WechatSubscribeService } from './wechat-subscribe.service';

@Controller('wechat-subscribe')
export class WechatSubscribeController {
  private readonly logger = new Logger(WechatSubscribeController.name);

  constructor(private readonly subscribeService: WechatSubscribeService) {}

  /**
   * 记录用户订阅状态
   * 前端调用 wx.requestSubscribeMessage 后，将结果传给后端记录
   */
  @Post('record')
  async recordSubscription(
    @Body()
    body: {
      openid: string;
      templateId: string;
      subscribeStatus: 'accept' | 'reject' | 'ban';
    }
  ) {
    const { openid, templateId, subscribeStatus } = body;

    await this.subscribeService.recordSubscription({
      openid,
      templateId,
      subscribeStatus,
    });

    return {
      code: 200,
      msg: '记录成功',
    };
  }

  /**
   * 检查用户订阅状态
   */
  @Get('check')
  async checkSubscription(@Query() query: { openid: string; templateId: string }) {
    const { openid, templateId } = query;

    const subscribed = await this.subscribeService.checkSubscription(openid, templateId);

    return {
      code: 200,
      data: { subscribed },
    };
  }

  /**
   * 发送测试订阅消息
   * 仅用于开发测试
   */
  @Post('test')
  async sendTestMessage(
    @Body()
    body: {
      openid: string;
      type: 'gift_reminder' | 'return_gift' | 'payment_success' | 'banquet_reminder';
      data: any;
    }
  ) {
    const { openid, type, data } = body;

    this.logger.log(`发送测试订阅消息: openid=${openid}, type=${type}`);

    let result: { success: boolean };

    switch (type) {
      case 'gift_reminder':
        result = await this.subscribeService.sendGiftReminder({
          openid,
          guestName: data.guestName || '测试宾客',
          giftAmount: data.giftAmount || 10000,
          giftDate: data.giftDate || new Date().toISOString().split('T')[0],
          banquetName: data.banquetName || '测试宴会',
          reminderContent: data.reminderContent || '这是一条测试提醒消息',
        });
        break;

      case 'return_gift':
        result = await this.subscribeService.sendReturnGiftNotify({
          openid,
          guestName: data.guestName || '测试宾客',
          banquetName: data.banquetName || '测试宴会',
          giftName: data.giftName || '测试礼品',
          claimCode: data.claimCode || 'TEST123',
        });
        break;

      case 'payment_success':
        result = await this.subscribeService.sendPaymentSuccess({
          openid,
          banquetName: data.banquetName || '测试宴会',
          guestName: data.guestName || '测试宾客',
          amount: data.amount || 10000,
          time: data.time || new Date().toISOString(),
        });
        break;

      case 'banquet_reminder':
        result = await this.subscribeService.sendBanquetReminder({
          openid,
          banquetName: data.banquetName || '测试宴会',
          banquetType: data.banquetType || '婚宴',
          eventTime: data.eventTime || new Date().toISOString(),
          location: data.location || '测试酒店',
        });
        break;

      default:
        return {
          code: 400,
          msg: '不支持的消息类型',
        };
    }

    return {
      code: result.success ? 200 : 500,
      msg: result.success ? '发送成功' : '发送失败',
      data: result,
    };
  }
}
