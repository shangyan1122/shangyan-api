import { Module } from '@nestjs/common';
import { AdminProductController } from './admin-product.controller';
import { AdminProductService } from './admin-product.service';

@Module({
  controllers: [AdminProductController],
  providers: [AdminProductService],
  exports: [AdminProductService],
})
export class AdminProductModule {}
