import { Module } from '@nestjs/common';
import { AdminProductController } from './admin-product.controller';
import { AdminProductService } from './admin-product.service';
import { AdminAuthModule } from '@/modules/admin-auth/admin-auth.module';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminProductController],
  providers: [AdminProductService],
  exports: [AdminProductService],
})
export class AdminProductModule {}
