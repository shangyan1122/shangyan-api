import { Controller, Get, Post, Put, Body, Query, Param, Request, UseGuards } from '@nestjs/common';
import { RecommendOfficerService } from './recommend-officer.service';
import { AdminAuthGuard } from '@/common/guards/admin-auth.guard';

@Controller('recommend-officer')
export class RecommendOfficerController {
  constructor(private readonly service: RecommendOfficerService) {}

  /**
   * 申请成为推荐官
   */
  @Post('apply')
  async apply(
    @Body() body: { realName: string; idCard?: string; phone?: string; openid?: string },
    @Request() req: any
  ) {
    const openid = body.openid || req.headers['x-wx-openid'] || 'test_openid_123';

    if (!body.realName || body.realName.trim().length < 2) {
      return { code: 400, msg: '请输入真实姓名' };
    }

    return this.service.apply(openid, body.realName.trim(), body.idCard, body.phone);
  }

  /**
   * 获取推荐官状态
   */
  @Get('status')
  async getStatus(@Query('openid') openid: string, @Request() req: any) {
    const userOpenid = openid || req.headers['x-wx-openid'] || 'test_openid_123';
    return this.service.getStatus(userOpenid);
  }

  /**
   * 获取邀请列表
   */
  @Get('invitees')
  async getInvitees(@Query('openid') openid: string, @Request() req: any) {
    const userOpenid = openid || req.headers['x-wx-openid'] || 'test_openid_123';
    return this.service.getInvitees(userOpenid);
  }

  /**
   * 绑定用户到推荐官（通过推荐链接进入时调用）
   */
  @Post('bind')
  async bindUser(@Body() body: { officerId: string; openid?: string }, @Request() req: any) {
    const userOpenid = body.openid || req.headers['x-wx-openid'] || 'test_openid_123';

    if (!body.officerId) {
      return { code: 400, msg: '缺少推荐官ID' };
    }

    // 获取用户ID
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('openid', userOpenid)
      .single();

    if (!user) {
      return { code: 400, msg: '用户不存在' };
    }

    return this.service.bindUser(body.officerId, user.id);
  }
}

@Controller('admin/recommend-officers')
@UseGuards(AdminAuthGuard)
export class AdminRecommendOfficerController {
  constructor(private readonly service: RecommendOfficerService) {}

  /**
   * 获取推荐官列表
   */
  @Get()
  async getList(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string
  ) {
    return this.service.getList({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
      status,
      keyword,
    });
  }

  /**
   * 获取推荐官统计
   */
  @Get('stats')
  async getStats() {
    return this.service.getStats();
  }

  /**
   * 获取推荐官排行榜
   */
  @Get('ranking')
  async getRanking(@Query('period') period: string = 'all') {
    return this.service.getRanking(period);
  }

  /**
   * 获取推荐官详情
   */
  @Get(':id')
  async getDetail(@Param('id') id: string) {
    return this.service.getDetail(id);
  }

  /**
   * 审核推荐官
   */
  @Put(':id/audit')
  async auditOfficer(
    @Param('id') id: string,
    @Body() body: { status: 'approved' | 'rejected'; remark?: string }
  ) {
    return this.service.auditOfficer(id, body.status, body.remark);
  }

  /**
   * 更新推荐官信息
   */
  @Put(':id')
  async updateOfficer(
    @Param('id') id: string,
    @Body()
    body: {
      vip_commission_rate?: number;
      mall_commission_rate?: number;
      status?: string;
      remark?: string;
    }
  ) {
    return this.service.updateOfficer(id, body);
  }
}
