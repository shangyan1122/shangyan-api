import { Module } from '@nestjs/common';
import { RecommendOfficerService } from './recommend-officer.service';
import {
  RecommendOfficerController,
  AdminRecommendOfficerController,
} from './recommend-officer.controller';

@Module({
  controllers: [RecommendOfficerController, AdminRecommendOfficerController],
  providers: [RecommendOfficerService],
  exports: [RecommendOfficerService],
})
export class RecommendOfficerModule {}
