import { Controller, Get, Post, Put, Delete, Query, Param, Body, Logger, UseGuards } from '@nestjs/common'
import { AdminRecommendOfficerService } from './admin-recommend-officer.service'
import { AdminGuard } from '@/common/guards/admin.guard'
import { RequirePermissions } from '@/common/guards/permission.guard'

/**
 * 推荐官管理控制器
 */
@Controller('admin/recommend-officers')
@UseGuards(AdminGuard)
export class AdminRecommendOfficerController {
  private readonly logger = new Logger(AdminRecommendOfficerController.name)

  constructor(private readonly adminRecommendOfficerService: AdminRecommendOfficerService) {}

  /**
   * 获取推荐官列表
   */
  @Get()
  @RequirePermissions('recommend-officer:read')
  async getRecommendOfficers(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.adminRecommendOfficerService.getRecommendOfficers({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
      status,
      keyword,
      startDate,
      endDate
    })
  }

  /**
   * 获取推荐官详情
   */
  @Get(':id')
  @RequirePermissions('recommend-officer:read')
  async getRecommendOfficerDetail(@Param('id') id: string) {
    return this.adminRecommendOfficerService.getRecommendOfficerDetail(id)
  }

  /**
   * 审核推荐官
   */
  @Put(':id/audit')
  @RequirePermissions('recommend-officer:audit')
  async auditRecommendOfficer(
    @Param('id') id: string,
    @Body() body: { approved: boolean; remark?: string }
  ) {
    this.logger.log(`审核推荐官: id=${id}, approved=${body.approved}`)
    return this.adminRecommendOfficerService.auditRecommendOfficer(id, body.approved, body.remark)
  }

  /**
   * 设置佣金比例
   */
  @Put(':id/commission')
  @RequirePermissions('recommend-officer:write')
  async setCommission(
    @Param('id') id: string,
    @Body() body: {
      vipCommissionRate?: number
      mallCommissionRate?: number
      remark?: string
    }
  ) {
    this.logger.log(`设置佣金: id=${id}`)
    return this.adminRecommendOfficerService.setCommission(id, body)
  }

  /**
   * 获取推荐官统计
   */
  @Get('stats/overview')
  @RequirePermissions('recommend-officer:read')
  async getRecommendOfficerStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.adminRecommendOfficerService.getRecommendOfficerStats({ startDate, endDate })
  }

  /**
   * 获取推荐官排行榜
   */
  @Get('rankings')
  @RequirePermissions('recommend-officer:read')
  async getRecommendOfficerRankings(
    @Query('period') period?: string // week, month, all
  ) {
    return this.adminRecommendOfficerService.getRecommendOfficerRankings(period || 'all')
  }

  /**
   * 获取推荐官邀请记录
   */
  @Get(':id/invites')
  @RequirePermissions('recommend-officer:read')
  async getInviteRecords(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    return this.adminRecommendOfficerService.getInviteRecords(id, {
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20
    })
  }

  /**
   * 获取推荐官收益记录
   */
  @Get(':id/earnings')
  @RequirePermissions('recommend-officer:read')
  async getEarnings(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.adminRecommendOfficerService.getEarnings(id, {
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
      startDate,
      endDate
    })
  }

  /**
   * 冻结/解冻推荐官
   */
  @Put(':id/freeze')
  @RequirePermissions('recommend-officer:write')
  async freezeRecommendOfficer(
    @Param('id') id: string,
    @Body() body: { frozen: boolean; reason?: string }
  ) {
    this.logger.log(`${body.frozen ? '冻结' : '解冻'}推荐官: id=${id}`)
    return this.adminRecommendOfficerService.freezeRecommendOfficer(id, body.frozen, body.reason)
  }

  /**
   * 批量审核推荐官
   */
  @Post('batch-audit')
  @RequirePermissions('recommend-officer:audit')
  async batchAudit(
    @Body() body: {
      ids: string[]
      approved: boolean
      remark?: string
    }
  ) {
    this.logger.log(`批量审核推荐官: count=${body.ids.length}`)
    return this.adminRecommendOfficerService.batchAudit(body.ids, body.approved, body.remark)
  }
}
