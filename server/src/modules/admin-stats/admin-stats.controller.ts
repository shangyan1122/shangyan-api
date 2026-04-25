import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminStatsService } from './admin-stats.service';
import { AdminAuthGuard } from '@/common/guards/admin-auth.guard';

@Controller('admin/stats')
@UseGuards(AdminAuthGuard)
export class AdminStatsController {
  constructor(private readonly adminStatsService: AdminStatsService) {}

  /**
   * 获取数据统计概览
   */
  @Get()
  async getStats(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.adminStatsService.getStats({ startDate, endDate });
  }

  /**
   * 获取随礼排行榜
   */
  @Get('gift-rankings')
  async getGiftRankings() {
    return this.adminStatsService.getGiftRankings();
  }

  /**
   * 获取宴会排行榜
   */
  @Get('banquet-rankings')
  async getBanquetRankings() {
    return this.adminStatsService.getBanquetRankings();
  }

  /**
   * 获取商品销售排行
   */
  @Get('sales-rankings')
  async getSalesRankings() {
    return this.adminStatsService.getSalesRankings();
  }

  /**
   * 获取近7日趋势
   */
  @Get('daily-trend')
  async getDailyTrend() {
    return this.adminStatsService.getDailyTrend();
  }
}
