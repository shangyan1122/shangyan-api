import { Module } from '@nestjs/common'
import { AdminRecommendOfficerController } from './admin-recommend-officer.controller'
import { AdminRecommendOfficerService } from './admin-recommend-officer.service'
import { CommonModule } from '@/common/common.module'
import { AdminAuthModule } from '@/modules/admin-auth/admin-auth.module'

@Module({
  imports: [CommonModule, AdminAuthModule],
  controllers: [AdminRecommendOfficerController],
  providers: [AdminRecommendOfficerService],
  exports: [AdminRecommendOfficerService]
})
export class AdminRecommendOfficerModule {}
