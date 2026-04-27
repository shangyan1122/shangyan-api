import { Controller, Get, Post, Put, Delete, Param, Query, Body, Logger, UseGuards } from '@nestjs/common'
import { AdminBanquetService } from './admin-banquet.service'
import { AdminGuard } from '@/common/guards/admin.guard'
import { RequirePermissions } from '@/common/guards/permission.guard'

@Controller('admin/banquets')
@UseGuards(AdminGuard)
export class AdminBanquetController {
  private readonly logger = new Logger(AdminBanquetController.name)

  constructor(private readonly adminBanquetService: AdminBanquetService) {}

  /**
   * 获取宴会列表
   */
  @Get()
  @RequirePermissions('banquet:read')
  async getBanquets(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    return this.adminBanquetService.getBanquets({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 10,
      type,
      status,
      search
    })
  }

  /**
   * 获取宴会详情
   */
  @Get(':id')
  @RequirePermissions('banquet:read')
  async getBanquetDetail(@Param('id') id: string) {
    return this.adminBanquetService.getBanquetDetail(id)
  }

  /**
   * 删除宴会
   */
  @Delete(':id')
  @RequirePermissions('banquet:write')
  async deleteBanquet(@Param('id') id: string) {
    this.logger.log(`删除宴会: banquetId=${id}`)
    return this.adminBanquetService.deleteBanquet(id)
  }

  /**
   * 审核宴会
   */
  @Put(':id/audit')
  @RequirePermissions('banquet:audit')
  async auditBanquet(
    @Param('id') id: string,
    @Body() body: { status: 'approved' | 'rejected'; remark?: string }
  ) {
    this.logger.log(`审核宴会: banquetId=${id}, status=${body.status}`)
    return this.adminBanquetService.auditBanquet(id, body)
  }
}
