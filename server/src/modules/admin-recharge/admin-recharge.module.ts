import { Module } from '@nestjs/common'
import { AdminRechargeController } from './admin-recharge.controller'
import { AdminRechargeService } from './admin-recharge.service'
import { AdminAuthModule } from '../admin-auth/admin-auth.module'

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminRechargeController],
  providers: [AdminRechargeService],
  exports: [AdminRechargeService]
})
export class AdminRechargeModule {}
