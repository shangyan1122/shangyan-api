import { Module } from '@nestjs/common';
import { AdminFinanceController } from './admin-finance.controller';
import { AdminFinanceService } from './admin-finance.service';

@Module({
  controllers: [AdminFinanceController],
  providers: [AdminFinanceService],
  exports: [AdminFinanceService],
})
export class AdminFinanceModule {}
