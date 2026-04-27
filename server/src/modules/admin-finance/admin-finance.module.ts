import { Module } from '@nestjs/common'
import { AdminFinanceController } from './admin-finance.controller'
import { AdminFinanceAnalyticsController } from './admin-finance-analytics.controller'
import { AdminFinanceExportController } from './admin-finance-export.controller'
import { AdminFinanceService } from './admin-finance.service'
import { AdminAuthModule } from '@/modules/admin-auth/admin-auth.module'

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminFinanceController, AdminFinanceAnalyticsController, AdminFinanceExportController],
  providers: [AdminFinanceService],
  exports: [AdminFinanceService]
})
export class AdminFinanceModule {}
