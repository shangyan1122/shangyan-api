import { Module } from '@nestjs/common'
import { AdminReturnGiftController } from './admin-return-gift.controller'
import { AdminReturnGiftService } from './admin-return-gift.service'
import { CommonModule } from '@/common/common.module'
import { AdminAuthModule } from '@/modules/admin-auth/admin-auth.module'

@Module({
  imports: [CommonModule, AdminAuthModule],
  controllers: [AdminReturnGiftController],
  providers: [AdminReturnGiftService],
  exports: [AdminReturnGiftService]
})
export class AdminReturnGiftModule {}
