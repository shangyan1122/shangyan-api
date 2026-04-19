import { Module } from '@nestjs/common';
import { GiftExchangeController } from './gift-exchange.controller';
import { GiftExchangeService } from './gift-exchange.service';

@Module({
  controllers: [GiftExchangeController],
  providers: [GiftExchangeService],
  exports: [GiftExchangeService],
})
export class GiftExchangeModule {}
