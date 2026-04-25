import { Controller, Get, Post, Delete, Param, Query, Logger, UseGuards } from '@nestjs/common';
import { AdminBanquetService } from './admin-banquet.service';
import { AdminAuthGuard } from '@/common/guards/admin-auth.guard';

@Controller('admin/banquets')
@UseGuards(AdminAuthGuard)
export class AdminBanquetController {
  private readonly logger = new Logger(AdminBanquetController.name);

  constructor(private readonly adminBanquetService: AdminBanquetService) {}

  /**
   * 获取宴会列表
   */
  @Get()
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
      search,
    });
  }

  /**
   * 获取宴会详情
   */
  @Get(':id')
  async getBanquetDetail(@Param('id') id: string) {
    return this.adminBanquetService.getBanquetDetail(id);
  }

  /**
   * 删除宴会
   */
  @Delete(':id')
  async deleteBanquet(@Param('id') id: string) {
    this.logger.log(`删除宴会: banquetId=${id}`);
    return this.adminBanquetService.deleteBanquet(id);
  }
}
