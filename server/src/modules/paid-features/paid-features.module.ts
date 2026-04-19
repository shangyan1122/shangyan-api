import { Module } from '@nestjs/common';
import { PaidFeaturesController } from './paid-features.controller';
import { PaidFeaturesService } from './paid-features.service';

@Module({
  controllers: [PaidFeaturesController],
  providers: [PaidFeaturesService],
  exports: [PaidFeaturesService],
})
export class PaidFeaturesModule {}
