import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { AdminGuard } from '@/common/guards/admin.guard'
import { MemberManagementService } from './member-management.service'

@Controller('admin/members')
@UseGuards(AdminGuard)
export class MemberManagementController {
  constructor(private readonly memberManagementService: MemberManagementService) {}

  /**
   * 获取会员列表（分页）
   */
  @Get()
  async getMemberList(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('level') level?: string,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    return this.memberManagementService.getMemberList({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      level,
      status,
      search
    })
  }

  /**
   * 获取会员详情
   */
  @Get(':id')
  async getMemberDetail(@Param('id') id: string) {
    return this.memberManagementService.getMemberDetail(id)
  }

  /**
   * 修改会员等级
   */
  @Put(':id/level')
  async updateMemberLevel(
    @Param('id') id: string,
    @Body() body: { level: string; reason?: string }
  ) {
    return this.memberManagementService.updateMemberLevel(id, body)
  }

  /**
   * 修改会员积分
   */
  @Put(':id/points')
  async updateMemberPoints(
    @Param('id') id: string,
    @Body() body: { points: number; reason?: string }
  ) {
    return this.memberManagementService.updateMemberPoints(id, body)
  }

  /**
   * 冻结/解冻会员
   */
  @Put(':id/status')
  async updateMemberStatus(
    @Param('id') id: string,
    @Body() body: { status: 'active' | 'frozen'; reason?: string }
  ) {
    return this.memberManagementService.updateMemberStatus(id, body)
  }

  /**
   * 获取会员统计概览
   */
  @Get('stats/overview')
  async getMemberStats() {
    return this.memberManagementService.getMemberStats()
  }

  /**
   * 获取会员等级分布
   */
  @Get('stats/level-distribution')
  async getLevelDistribution() {
    return this.memberManagementService.getLevelDistribution()
  }

  /**
   * 获取会员增长趋势
   */
  @Get('stats/growth-trend')
  async getGrowthTrend(@Query('days') days: string = '30') {
    return this.memberManagementService.getGrowthTrend(parseInt(days))
  }
}
