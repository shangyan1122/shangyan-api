import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WechatConfigService } from './services/wechat-config.service';
import { TencentSmsService } from './services/tencent-sms.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [WechatConfigService, TencentSmsService],
  exports: [ConfigModule, WechatConfigService, TencentSmsService],
})
export class CommonModule {}
