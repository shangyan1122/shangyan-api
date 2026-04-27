import { Module, forwardRef } from '@nestjs/common'
import { PaidFeaturesController } from './paid-features.controller'
import { PaidFeaturesService } from './paid-features.service'
import { WechatPayModule } from '@/modules/wechat-pay/wechat-pay.module'
import { GiftReminderModule } from '../gift-reminder/gift-reminder.module'

@Module({
  imports: [WechatPayModule, forwardRef(() => GiftReminderModule)],
  controllers: [PaidFeaturesController],
  providers: [PaidFeaturesService],
  exports: [PaidFeaturesService]
})
export class PaidFeaturesModule {}
