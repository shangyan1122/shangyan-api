import { Module } from '@nestjs/common';
import { ReturnGiftController } from './return-gift.controller';
import { ReturnGiftService } from './return-gift.service';
import { WechatPayModule } from '../wechat-pay/wechat-pay.module';
import { WechatSubscribeModule } from '../wechat-subscribe/wechat-subscribe.module';

@Module({
  imports: [WechatPayModule, WechatSubscribeModule],
  controllers: [ReturnGiftController],
  providers: [ReturnGiftService],
  exports: [ReturnGiftService],
})
export class ReturnGiftModule {}
