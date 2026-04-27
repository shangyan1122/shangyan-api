import { Module } from '@nestjs/common'
import { ExcelExportController } from './excel-export.controller'
import { ExcelExportService } from './excel-export.service'
import { PaidFeaturesModule } from '../paid-features/paid-features.module'

@Module({
  imports: [PaidFeaturesModule],
  controllers: [ExcelExportController],
  providers: [ExcelExportService],
  exports: [ExcelExportService]
})
export class ExcelExportModule {}
