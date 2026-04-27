import { Module } from '@nestjs/common'
import { AdminUserController } from './admin-user.controller'
import { AdminUserService } from './admin-user.service'
import { CommonModule } from '@/common/common.module'
import { AdminAuthModule } from '@/modules/admin-auth/admin-auth.module'

@Module({
  imports: [CommonModule, AdminAuthModule],
  controllers: [AdminUserController],
  providers: [AdminUserService],
  exports: [AdminUserService]
})
export class AdminUserModule {}
