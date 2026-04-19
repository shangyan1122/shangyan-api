import { Module } from '@nestjs/common';
import { GiftProductController } from './gift-product.controller';

@Module({
  controllers: [GiftProductController],
  providers: [],
  exports: [],
})
export class GiftProductModule {}
