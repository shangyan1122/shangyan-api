import { Module } from '@nestjs/common'
import { AdminGiftRecordController } from './admin-gift-record.controller'
import { AdminGiftRecordService } from './admin-gift-record.service'
import { CommonModule } from '@/common/common.module'
import { AdminAuthModule } from '@/modules/admin-auth/admin-auth.module'

@Module({
  imports: [CommonModule, AdminAuthModule],
  controllers: [AdminGiftRecordController],
  providers: [AdminGiftRecordService],
  exports: [AdminGiftRecordService]
})
export class AdminGiftRecordModule {}
