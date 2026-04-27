import { Module, forwardRef } from '@nestjs/common'
import { GiftReminderController } from './gift-reminder.controller'
import { GiftReminderService } from './gift-reminder.service'
import { WechatSubscribeModule } from '../wechat-subscribe/wechat-subscribe.module'
import { PaidFeaturesModule } from '../paid-features/paid-features.module'
import { TencentSmsService } from '@/services/tencent-sms.service'

@Module({
  imports: [
    forwardRef(() => WechatSubscribeModule),
    PaidFeaturesModule
  ],
  controllers: [GiftReminderController],
  providers: [GiftReminderService, TencentSmsService],
  exports: [GiftReminderService]
})
export class GiftReminderModule {}
