import { Controller, Get, Post, Put, Body, Query, Param, Request, Res, UseGuards, Header, Req } from '@nestjs/common'
import { Request as ExpressRequest } from 'express'
import { RecommendOfficerService } from './recommend-officer.service'
import { AdminGuard } from '@/common/guards/admin.guard'

@Controller('recommend-officer')
export class RecommendOfficerController {
  constructor(private readonly service: RecommendOfficerService) {}

  /**
   * 申请成为推荐官
   */
  @Post('apply')
  async apply(
    @Body() body: { realName: string; idCard?: string; phone?: string; openid?: string },
    @Req() req: ExpressRequest
  ) {
    const openid = req.user?.openid
    if (!openid) {
      return { code: 401, msg: '请先登录' }
    }

    if (!body.realName || body.realName.trim().length < 2) {
      return { code: 400, msg: '请输入真实姓名' }
    }

    return this.service.apply(openid, body.realName.trim(), body.idCard, body.phone)
  }

  /**
   * 获取推荐官状态
   */
  @Get('status')
  async getStatus(@Req() req: ExpressRequest) {
    const userOpenid = req.user?.openid
    if (!userOpenid) {
      return { code: 401, msg: '请先登录' }
    }
    return this.service.getStatus(userOpenid)
  }

  /**
   * 生成邀请码
   */
  @Post('invite-code/generate')
  async generateInviteCode(
    @Body() body: { officerId?: string },
    @Req() req: ExpressRequest
  ) {
    const openid = req.user?.openid
    if (!openid) {
      return { code: 401, msg: '请先登录' }
    }

    // 获取推荐官ID
    if (body.officerId) {
      return this.service.generateInviteCode(body.officerId)
    }

    // 通过 openid 获取推荐官ID
    const officerId = await this.service.getOfficerIdByOpenid(openid)

    if (!officerId) {
      return { code: 400, msg: '您还不是推荐官或审核未通过' }
    }

    return this.service.generateInviteCode(officerId)
  }

  /**
   * 验证邀请码
   */
  @Post('invite-code/validate')
  async validateInviteCode(@Body() body: { code: string }) {
    if (!body.code) {
      return { code: 400, msg: '请输入邀请码' }
    }
    return this.service.validateInviteCode(body.code)
  }

  /**
   * 使用邀请码
   */
  @Post('invite-code/use')
  async useInviteCode(
    @Body() body: { code: string; userId?: string },
    @Req() req: ExpressRequest
  ) {
    const openid = req.user?.openid
    if (!openid) {
      return { code: 401, msg: '请先登录' }
    }

    if (!body.code) {
      return { code: 400, msg: '请输入邀请码' }
    }

    // 获取用户ID
    const userId = body.userId || openid

    return this.service.useInviteCode(body.code, userId, openid)
  }

  /**
   * 获取邀请列表
   */
  @Get('invitees')
  async getInvitees(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Req() req?: ExpressRequest
  ) {
    const userOpenid = req?.user?.openid
    if (!userOpenid) {
      return { code: 401, msg: '请先登录' }
    }

    // 获取推荐官ID
    const officerId = await this.service.getOfficerIdByOpenid(userOpenid)

    if (!officerId) {
      return { code: 400, msg: '您还不是推荐官' }
    }

    return this.service.getInvitees(officerId, {
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20
    })
  }

  /**
   * 获取佣金记录
   */
  @Get('commissions')
  async getCommissions(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Req() req?: ExpressRequest
  ) {
    const userOpenid = req?.user?.openid
    if (!userOpenid) {
      return { code: 401, msg: '请先登录' }
    }

    // 获取推荐官ID
    const officerId = await this.service.getOfficerIdByOpenid(userOpenid)

    if (!officerId) {
      return { code: 400, msg: '您还不是推荐官' }
    }

    return this.service.getCommissionRecords(
      officerId,
      page ? parseInt(page) : 1,
      pageSize ? parseInt(pageSize) : 20
    )
  }

  /**
   * 申请提现
   */
  @Post('withdraw/apply')
  async applyWithdraw(
    @Body() body: { amount: number; accountType?: string; accountInfo?: string; officerId?: string },
    @Req() req?: ExpressRequest
  ) {
    const openid = req?.user?.openid
    if (!openid) {
      return { code: 401, msg: '请先登录' }
    }

    if (!body.amount || body.amount <= 0) {
      return { code: 400, msg: '请输入提现金额' }
    }

    // 获取推荐官ID
    const officerId = await this.service.getOfficerIdByOpenid(openid)

    if (!officerId) {
      return { code: 400, msg: '您还不是推荐官' }
    }

    return this.service.applyWithdraw(officerId, openid, body.amount, 'wechat', openid)
  }

  /**
   * 获取提现记录
   */
  @Get('withdraw/records')
  async getWithdrawRecords(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Req() req?: ExpressRequest
  ) {
    const userOpenid = req?.user?.openid
    if (!userOpenid) {
      return { code: 401, msg: '请先登录' }
    }

    // 获取推荐官ID
    const officerId = await this.service.getOfficerIdByOpenid(userOpenid)

    if (!officerId) {
      return { code: 400, msg: '您还不是推荐官' }
    }

    return this.service.getWithdrawRecords(
      officerId,
      page ? parseInt(page) : 1,
      pageSize ? parseInt(pageSize) : 20
    )
  }
}

@Controller('admin/recommend-officer')
@UseGuards(AdminGuard)
export class AdminRecommendOfficerController {
  constructor(private readonly service: RecommendOfficerService) {}

  /**
   * 获取推荐官列表
   */
  @Get()
  async getList(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string
  ) {
    return this.service.getList({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
      status
    })
  }

  /**
   * 获取推荐官详情
   */
  @Get(':id')
  async getDetail(@Param('id') id: string) {
    return this.service.getDetail(id)
  }

  /**
   * 审核推荐官
   */
  @Put(':id/audit')
  async auditOfficer(
    @Param('id') id: string,
    @Body() body: { status: 'approved' | 'rejected'; remark?: string }
  ) {
    return this.service.auditOfficer(id, body.status, body.remark)
  }

  /**
   * 更新推荐官信息
   */
  @Put(':id')
  async updateOfficer(
    @Param('id') id: string,
    @Body() body: {
      vip_commission_rate?: number
      mall_commission_rate?: number
      status?: string
      remark?: string
    }
  ) {
    return this.service.updateOfficer(id, body)
  }

  /**
   * 获取统计数据
   */
  @Get('stats')
  async getStats() {
    return this.service.getStats()
  }

  /**
   * 获取推荐官排行榜
   */
  @Get('ranking')
  async getRanking(
    @Query('limit') limit?: string,
    @Query('period') period?: 'week' | 'month' | 'all'
  ) {
    return this.service.getRanking({
      limit: limit ? parseInt(limit) : 10,
      period: period || 'all'
    })
  }

  /**
   * 获取所有佣金流水
   */
  @Get('commissions')
  async getAllCommissions(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('officerId') officerId?: string
  ) {
    return this.service.getAllCommissionRecords({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
      officerId
    })
  }

  /**
   * 审核提现申请
   */
  @Put('withdraw/:id/approve')
  async approveWithdraw(
    @Param('id') id: string,
    @Body() body: { remark?: string }
  ) {
    return this.service.approveWithdraw(id, body.remark)
  }

  /**
   * 拒绝提现申请
   */
  @Put('withdraw/:id/reject')
  async rejectWithdraw(
    @Param('id') id: string,
    @Body() body: { reason?: string }
  ) {
    return this.service.rejectWithdraw(id, body.reason)
  }

  /**
   * 导出佣金流水
   */
  @Get('commissions/export')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename=commissions.xlsx')
  async exportCommissions(
    @Query('type') type?: 'vip' | 'mall',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: any
  ) {
    const buffer = await this.service.exportCommissionsToExcel({ type, startDate, endDate })

    res?.send(buffer)
  }
}
