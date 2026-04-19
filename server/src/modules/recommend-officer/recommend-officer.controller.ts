import { Controller, Get, Post, Put, Body, Query, Param, Request } from '@nestjs/common';
import { RecommendOfficerService } from './recommend-officer.service';

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

@Controller('admin/recommend-officer')
export class AdminRecommendOfficerController {
  constructor(private readonly service: RecommendOfficerService) {}

  /**
   * 获取推荐官列表
   */
  @Get('list')
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
   * 获取推荐官详情
   */
  @Get('detail/:id')
  async getDetail(@Param('id') id: string) {
    return this.service.getDetail(id);
  }

  /**
   * 更新推荐官信息
   */
  @Put('update/:id')
  async updateOfficer(
    @Param('id') id: string,
    @Body()
    body: {
      vipCommissionRate?: number;
      mallCommissionRate?: number;
      status?: string;
      remark?: string;
    }
  ) {
    return this.service.updateOfficer(id, body);
  }
}
