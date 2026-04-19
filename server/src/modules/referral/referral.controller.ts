import { Controller, Get, Post, Body, Query, Request } from '@nestjs/common';
import { ReferralService } from './referral.service';

@Controller('referral')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  /**
   * 获取分销统计数据
   */
  @Get('stats')
  async getStats(@Query('openid') openid: string, @Request() req: any) {
    const userOpenid = openid || req.headers['x-wx-openid'] || 'test_openid_123';
    return this.referralService.getReferralStats(userOpenid);
  }

  /**
   * 获取邀请列表
   */
  @Get('invitees')
  async getInvitees(@Query('openid') openid: string, @Request() req: any) {
    const userOpenid = openid || req.headers['x-wx-openid'] || 'test_openid_123';
    return this.referralService.getInvitees(userOpenid);
  }

  /**
   * 生成/获取邀请码
   */
  @Get('code')
  async getReferralCode(@Query('openid') openid: string, @Request() req: any) {
    const userOpenid = openid || req.headers['x-wx-openid'] || 'test_openid_123';
    return this.referralService.getOrCreateReferralCode(userOpenid);
  }

  /**
   * 绑定邀请关系（通过邀请码）
   */
  @Post('bind')
  async bindReferrer(@Body() body: { openid?: string; code: string }, @Request() req: any) {
    const userOpenid = body.openid || req.headers['x-wx-openid'] || 'test_openid_123';
    return this.referralService.bindReferrer(userOpenid, body.code);
  }

  /**
   * 扫码随礼时自动绑定上下级
   * 规则1+5：自由人随礼时绑定主办方为上级
   */
  @Post('bind-on-gift')
  async bindOnGift(
    @Body() body: { guestOpenid?: string; hostOpenid: string; banquetId: string },
    @Request() req: any
  ) {
    const guestOpenid = body.guestOpenid || req.headers['x-wx-openid'] || 'test_openid_123';
    return this.referralService.bindOnGift(guestOpenid, body.hostOpenid, body.banquetId);
  }

  /**
   * 检查用户是否是自由人
   */
  @Get('is-free')
  async checkIsFree(@Query('openid') openid: string, @Request() req: any) {
    const userOpenid = openid || req.headers['x-wx-openid'] || 'test_openid_123';
    const isFree = await this.referralService.isFreePerson(userOpenid);
    return { code: 200, msg: 'success', data: { isFreePerson: isFree } };
  }

  /**
   * 计算佣金（内部调用）
   */
  @Post('calculate-commission')
  async calculateCommission(
    @Body()
    body: {
      openid: string;
      amount: number;
      paymentId: string;
      type: 'vip' | 'mall' | 'gift';
    }
  ) {
    return this.referralService.calculateCommission(
      body.openid,
      body.amount,
      body.paymentId,
      body.type
    );
  }

  /**
   * 自由人创建宴会处理（内部调用）
   */
  @Post('free-person-create-banquet')
  async handleFreePersonCreateBanquet(@Body() body: { openid: string }) {
    await this.referralService.handleFreePersonCreateBanquet(body.openid);
    return { code: 200, msg: 'success' };
  }

  /**
   * 获取佣金明细
   */
  @Get('commissions')
  async getCommissions(@Query('openid') openid: string, @Request() req: any) {
    const userOpenid = openid || req.headers['x-wx-openid'] || 'test_openid_123';
    return this.referralService.getCommissionHistory(userOpenid);
  }

  /**
   * 定时任务：检测过期关系
   * 规则3：过期后变成自由人
   */
  @Post('check-expired')
  async checkExpired() {
    const result = await this.referralService.checkExpiredRelations();
    return { code: 200, msg: 'success', data: result };
  }

  /**
   * 用户登录/注册（确保用户存在）
   */
  @Post('login')
  async login(
    @Body() body: { openid?: string; nickname?: string; avatar?: string },
    @Request() req: any
  ) {
    const userOpenid = body.openid || req.headers['x-wx-openid'] || 'test_openid_123';
    const userId = await this.referralService.ensureUserExists(
      userOpenid,
      body.nickname,
      body.avatar
    );
    return { code: 200, msg: 'success', data: { userId } };
  }
}
