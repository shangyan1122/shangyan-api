import { Controller, Get, Post, Put, Query, Body, Logger, UseGuards, Res } from '@nestjs/common'
import { Response } from 'express'
import { AdminFinanceService } from './admin-finance.service'
import { AdminGuard } from '@/common/guards/admin.guard'
import { RequirePermissions } from '@/common/guards/permission.guard'

@Controller('admin/finance')
@UseGuards(AdminGuard)
export class AdminFinanceExportController {
  private readonly logger = new Logger(AdminFinanceExportController.name)

  constructor(private readonly adminFinanceService: AdminFinanceService) {}

  /**
   * 导出财务报表
   */
  @Get('export')
  @RequirePermissions('finance:export')
  async exportFinance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('fields') fields?: string,
    @Res() res?: Response
  ) {
    try {
      const result = await this.adminFinanceService.exportFinance({
        startDate,
        endDate,
        fields: fields?.split(',') || []
      })

      if (res) {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        res.setHeader('Content-Disposition', `attachment; filename=finance_report_${Date.now()}.xlsx`)
        res.send(result)
      }

      return result
    } catch (error: any) {
      this.logger.error(`导出财务报表失败: ${error.message}`)
      return { code: 500, msg: '导出失败', data: null }
    }
  }

  /**
   * 获取数据预警配置
   */
  @Get('alerts')
  @RequirePermissions('finance:read')
  async getAlerts() {
    return this.adminFinanceService.getAlerts()
  }

  /**
   * 更新数据预警配置
   */
  @Put('alerts')
  @RequirePermissions('finance:write')
  async updateAlerts(@Body() body: any) {
    return this.adminFinanceService.updateAlerts(body)
  }

  /**
   * 获取字段配置
   */
  @Get('field-config')
  @RequirePermissions('finance:read')
  async getFieldConfig() {
    return this.adminFinanceService.getFieldConfig()
  }

  /**
   * 保存字段配置
   */
  @Post('field-config')
  @RequirePermissions('finance:write')
  async saveFieldConfig(@Body() body: any) {
    return this.adminFinanceService.saveFieldConfig(body)
  }

  /**
   * 获取导出历史
   */
  @Get('export-history')
  @RequirePermissions('finance:read')
  async getExportHistory(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    return this.adminFinanceService.getExportHistory({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 10
    })
  }
}
