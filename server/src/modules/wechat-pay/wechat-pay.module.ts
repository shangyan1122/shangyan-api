import { Module } from '@nestjs/common';
import { WechatPayController } from './wechat-pay.controller';
import { WechatPayService } from './wechat-pay.service';
import { MemberModule } from '../member/member.module';

@Module({
  imports: [MemberModule],
  controllers: [WechatPayController],
  providers: [WechatPayService],
  exports: [WechatPayService],
})
export class WechatPayModule {}
