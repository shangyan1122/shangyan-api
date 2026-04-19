import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ExcelExportService } from './excel-export.service';
import { Logger } from '@nestjs/common';

@Controller('excel-export')
export class ExcelExportController {
  private readonly logger = new Logger(ExcelExportController.name);

  constructor(private readonly excelExportService: ExcelExportService) {}

  /**
   * 导出礼账
   */
  @Post('gift-ledger')
  async exportGiftLedger(
    @Body() body: { openid: string; banquetId?: string; startDate?: string; endDate?: string }
  ) {
    this.logger.log(`导出礼账: ${body.openid}`);

    try {
      const fileUrl = await this.excelExportService.exportGiftLedger(body);

      return {
        code: 200,
        msg: '导出成功',
        data: { url: fileUrl },
      };
    } catch (error) {
      this.logger.error('导出礼账失败:', error);
      return {
        code: 500,
        msg: error.message || '导出失败',
        data: null,
      };
    }
  }

  /**
   * 导出宴会报告
   */
  @Post('banquet-report')
  async exportBanquetReport(@Body() body: { openid: string; banquetId: string }) {
    this.logger.log(`导出宴会报告: ${body.banquetId}`);

    try {
      const fileUrl = await this.excelExportService.exportBanquetReport(body);

      return {
        code: 200,
        msg: '导出成功',
        data: { url: fileUrl },
      };
    } catch (error) {
      this.logger.error('导出宴会报告失败:', error);
      return {
        code: 500,
        msg: error.message || '导出失败',
        data: null,
      };
    }
  }
}
