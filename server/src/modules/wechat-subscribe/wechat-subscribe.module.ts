import { Module } from '@nestjs/common';
import { WechatSubscribeController } from './wechat-subscribe.controller';
import { WechatSubscribeService } from './wechat-subscribe.service';

@Module({
  controllers: [WechatSubscribeController],
  providers: [WechatSubscribeService],
  exports: [WechatSubscribeService],
})
export class WechatSubscribeModule {}
