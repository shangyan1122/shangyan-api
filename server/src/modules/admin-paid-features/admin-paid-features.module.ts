import { Module } from '@nestjs/common'
import { AdminPaidFeaturesController } from './admin-paid-features.controller'
import { AdminPaidFeaturesService } from './admin-paid-features.service'
import { AdminAuthModule } from '../admin-auth/admin-auth.module'

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminPaidFeaturesController],
  providers: [AdminPaidFeaturesService],
  exports: [AdminPaidFeaturesService]
})
export class AdminPaidFeaturesModule {}
