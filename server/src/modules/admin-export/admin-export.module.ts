import { Module } from '@nestjs/common'
import { AdminExportController } from './admin-export.controller'
import { CommonModule } from '@/common/common.module'
import { AdminAuthModule } from '@/modules/admin-auth/admin-auth.module'
import { ExcelService } from '@/services/excel.service'
import { OperationLogService } from '@/services/operation-log.service'

@Module({
  imports: [CommonModule, AdminAuthModule],
  controllers: [AdminExportController],
  providers: [ExcelService, OperationLogService],
  exports: [ExcelService, OperationLogService]
})
export class AdminExportModule {}
