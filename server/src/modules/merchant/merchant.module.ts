import { Module } from '@nestjs/common'
import { MerchantController } from './merchant.controller'
import { WechatPayModule } from '@/modules/wechat-pay/wechat-pay.module'

@Module({
  imports: [WechatPayModule],
  controllers: [MerchantController],
  providers: [],
  exports: []
})
export class MerchantModule {}
