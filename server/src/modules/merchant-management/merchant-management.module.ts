import { Module } from '@nestjs/common'
import { AdminAuthModule } from '@/modules/admin-auth/admin-auth.module'
import { MerchantManagementController } from './merchant-management.controller'
import { MerchantManagementService } from './merchant-management.service'

@Module({
  imports: [AdminAuthModule],
  controllers: [MerchantManagementController],
  providers: [MerchantManagementService],
  exports: [MerchantManagementService]
})
export class MerchantManagementModule {}
