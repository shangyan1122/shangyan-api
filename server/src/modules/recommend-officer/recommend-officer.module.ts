import { Module } from '@nestjs/common';
import { RecommendOfficerService } from './recommend-officer.service';
import {
  RecommendOfficerController,
  AdminRecommendOfficerController,
} from './recommend-officer.controller';
import { AdminAuthModule } from '@/modules/admin-auth/admin-auth.module';

@Module({
  imports: [AdminAuthModule],
  controllers: [RecommendOfficerController, AdminRecommendOfficerController],
  providers: [RecommendOfficerService],
  exports: [RecommendOfficerService],
})
export class RecommendOfficerModule {}
