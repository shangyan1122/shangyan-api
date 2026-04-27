import { Module, forwardRef } from '@nestjs/common'
import { WechatPayController } from './wechat-pay.controller'
import { WechatPayService } from './wechat-pay.service'
import { PaidFeaturesModule } from '../paid-features/paid-features.module'

@Module({
  imports: [forwardRef(() => PaidFeaturesModule)],
  controllers: [WechatPayController],
  providers: [WechatPayService],
  exports: [WechatPayService]
})
export class WechatPayModule {}
