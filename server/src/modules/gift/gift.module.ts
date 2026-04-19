import { Module } from '@nestjs/common';
import { GiftController } from './gift.controller';
import { GiftService } from './gift.service';
import { ReferralModule } from '../referral/referral.module';

@Module({
  imports: [ReferralModule],
  controllers: [GiftController],
  providers: [GiftService],
})
export class GiftModule {}
