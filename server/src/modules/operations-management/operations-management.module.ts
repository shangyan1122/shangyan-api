import { Module } from '@nestjs/common'
import { AdminAuthModule } from '@/modules/admin-auth/admin-auth.module'
import { OperationsManagementController } from './operations-management.controller'
import { OperationsManagementService } from './operations-management.service'

@Module({
  imports: [AdminAuthModule],
  controllers: [OperationsManagementController],
  providers: [OperationsManagementService],
  exports: [OperationsManagementService]
})
export class OperationsManagementModule {}
