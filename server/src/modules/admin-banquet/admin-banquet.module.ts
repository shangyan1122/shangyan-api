import { Module } from '@nestjs/common';
import { AdminBanquetController } from './admin-banquet.controller';
import { AdminBanquetService } from './admin-banquet.service';

@Module({
  controllers: [AdminBanquetController],
  providers: [AdminBanquetService],
  exports: [AdminBanquetService],
})
export class AdminBanquetModule {}
