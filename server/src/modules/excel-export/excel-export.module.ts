import { Module } from '@nestjs/common';
import { ExcelExportController } from './excel-export.controller';
import { ExcelExportService } from './excel-export.service';

@Module({
  controllers: [ExcelExportController],
  providers: [ExcelExportService],
  exports: [ExcelExportService],
})
export class ExcelExportModule {}
