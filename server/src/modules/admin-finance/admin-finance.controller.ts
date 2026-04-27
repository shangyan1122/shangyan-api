import { Controller, Get, Post, Param, Query, Logger, UseGuards } from '@nestjs/common'
import { AdminFinanceService } from './admin-finance.service'
import { AdminGuard } from '@/common/guards/admin.guard'
import { RequirePermissions } from '@/common/guards/permission.guard'

@Controller('admin/finance')
@UseGuards(AdminGuard)
export class AdminFinanceController {
  private readonly logger = new Logger(AdminFinanceController.name)

  constructor(private readonly adminFinanceService: AdminFinanceService) {}

  /**
   * 获取财务统计
   */
  @Get('stats')
  @RequirePermissions('finance:read')
  async getStats() {
    return this.adminFinanceService.getStats()
  }

  /**
   * 获取交易流水
   */
  @Get('transactions')
  @RequirePermissions('finance:read')
  async getTransactions(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.adminFinanceService.getTransactions({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 10,
      type,
      category,
      startDate,
      endDate
    })
  }

  /**
   * 审核通过提现
   */
  @Post('withdraw/:id/approve')
  @RequirePermissions('finance:write')
  async approveWithdraw(@Param('id') id: string) {
    this.logger.log(`审核通过提现: recordId=${id}`)
    return this.adminFinanceService.approveWithdraw(id)
  }

  /**
   * 拒绝提现
   */
  @Post('withdraw/:id/reject')
  @RequirePermissions('finance:write')
  async rejectWithdraw(@Param('id') id: string) {
    this.logger.log(`拒绝提现: recordId=${id}`)
    return this.adminFinanceService.rejectWithdraw(id)
  }
}
