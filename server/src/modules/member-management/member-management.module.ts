import { Module } from '@nestjs/common'
import { AdminAuthModule } from '@/modules/admin-auth/admin-auth.module'
import { MemberManagementController } from './member-management.controller'
import { MemberManagementService } from './member-management.service'

@Module({
  imports: [AdminAuthModule],
  controllers: [MemberManagementController],
  providers: [MemberManagementService],
  exports: [MemberManagementService]
})
export class MemberManagementModule {}
