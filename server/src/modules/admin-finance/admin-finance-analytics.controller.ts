import { Controller, Get, Query, Logger, UseGuards } from '@nestjs/common'
import { AdminFinanceService } from './admin-finance.service'
import { AdminGuard } from '@/common/guards/admin.guard'
import { RequirePermissions } from '@/common/guards/permission.guard'

@Controller('admin/finance-analytics')
@UseGuards(AdminGuard)
export class AdminFinanceAnalyticsController {
  private readonly logger = new Logger(AdminFinanceAnalyticsController.name)

  constructor(private readonly adminFinanceService: AdminFinanceService) {}

  /**
   * 获取财务趋势数据
   */
  @Get('trends')
  @RequirePermissions('finance:read')
  async getFinanceTrends(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.adminFinanceService.getFinanceTrends({
      startDate: startDate || this.getDefaultStartDate(),
      endDate: endDate || this.getDefaultEndDate()
    })
  }

  /**
   * 按宴会统计收益
   */
  @Get('banquet-revenue')
  @RequirePermissions('finance:read')
  async getBanquetRevenueStats(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('banquetType') banquetType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortField') sortField?: string,
    @Query('sortOrder') sortOrder?: string
  ) {
    return this.adminFinanceService.getBanquetRevenueStats({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 10,
      search,
      banquetType,
      startDate,
      endDate,
      sortField: sortField || 'totalRevenue',
      sortOrder: sortOrder || 'desc'
    })
  }

  /**
   * 获取付费功能使用率
   */
  @Get('feature-usage')
  @RequirePermissions('finance:read')
  async getFeatureUsage(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.adminFinanceService.getFeatureUsage({
      startDate: startDate || this.getDefaultStartDate(),
      endDate: endDate || this.getDefaultEndDate()
    })
  }

  private getDefaultStartDate(): string {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  }

  private getDefaultEndDate(): string {
    return new Date().toISOString().split('T')[0]
  }
}
