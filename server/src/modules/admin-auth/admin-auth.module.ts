import { Module } from '@nestjs/common'
import { AdminAuthController } from './admin-auth.controller'
import { AdminAuthService } from './admin-auth.service'
import { SmsService } from '@/services/sms.service'
import { TencentSmsService } from '@/services/tencent-sms.service'

@Module({
  controllers: [AdminAuthController],
  providers: [
    AdminAuthService,
    SmsService,
    {
      provide: 'ISmsService',
      useClass: TencentSmsService // 使用腾讯云短信服务
    }
  ],
  exports: [AdminAuthService]
})
export class AdminAuthModule {}
