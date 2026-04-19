import { Module } from '@nestjs/common';
import { ProfitSharingService } from './profit-sharing.service';

@Module({
  providers: [ProfitSharingService],
  exports: [ProfitSharingService],
})
export class ProfitSharingModule {}
