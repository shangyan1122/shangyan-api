import { Module } from '@nestjs/common'
import { ReturnGiftController } from './return-gift.controller'
import { ReturnGiftService } from './return-gift.service'
import { WechatSubscribeModule } from '../wechat-subscribe/wechat-subscribe.module'
import { WechatPayModule } from '../wechat-pay/wechat-pay.module'

@Module({
  imports: [WechatSubscribeModule, WechatPayModule],
  controllers: [ReturnGiftController],
  providers: [ReturnGiftService],
  exports: [ReturnGiftService],
})
export class ReturnGiftModule {}
