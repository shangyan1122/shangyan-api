import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [ReferralController],
  providers: [ReferralService],
  exports: [ReferralService],
})
export class ReferralModule {}
