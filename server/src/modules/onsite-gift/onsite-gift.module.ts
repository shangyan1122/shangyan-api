import { Module } from '@nestjs/common';
import { OnsiteGiftController } from './onsite-gift.controller';

@Module({
  controllers: [OnsiteGiftController],
  providers: [],
  exports: [],
})
export class OnsiteGiftModule {}
