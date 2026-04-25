import { Module } from '@nestjs/common';
import { AdminBanquetController } from './admin-banquet.controller';
import { AdminBanquetService } from './admin-banquet.service';
import { AdminAuthModule } from '@/modules/admin-auth/admin-auth.module';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminBanquetController],
  providers: [AdminBanquetService],
  exports: [AdminBanquetService],
})
export class AdminBanquetModule {}
