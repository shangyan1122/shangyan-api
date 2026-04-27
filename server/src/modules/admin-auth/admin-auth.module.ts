import { Module } from '@nestjs/common'
import { AdminAuthController } from './admin-auth.controller'
import { AdminAuthService } from './admin-auth.service'
import { TencentSmsService } from '@/services/tencent-sms.service'

@Module({
  controllers: [AdminAuthController],
  providers: [
    AdminAuthService,
    TencentSmsService
  ],
  exports: [AdminAuthService]
})
export class AdminAuthModule {}
