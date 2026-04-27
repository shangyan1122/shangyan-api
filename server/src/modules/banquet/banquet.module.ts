import { Module, forwardRef } from '@nestjs/common'
import { BanquetController } from './banquet.controller'
import { BanquetService } from './banquet.service'
import { AIModule } from '../ai/ai.module'
import { GiftReminderModule } from '../gift-reminder/gift-reminder.module'
import { PaidFeaturesModule } from '../paid-features/paid-features.module'
import { WechatSubscribeModule } from '../wechat-subscribe/wechat-subscribe.module'
import { WechatPayModule } from '../wechat-pay/wechat-pay.module'

@Module({
  imports: [
    AIModule,
    forwardRef(() => GiftReminderModule),
    PaidFeaturesModule,
    forwardRef(() => WechatSubscribeModule),
    WechatPayModule,
  ],
  controllers: [BanquetController],
  providers: [BanquetService],
  exports: [BanquetService],
})
export class BanquetModule {}
