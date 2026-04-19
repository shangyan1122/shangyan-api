import { Module } from '@nestjs/common';
import { AICoverController } from './ai-cover.controller';
import { AICoverService } from './ai-cover.service';

@Module({
  controllers: [AICoverController],
  providers: [AICoverService],
  exports: [AICoverService],
})
export class AICoverModule {}
