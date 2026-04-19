import { Module, forwardRef } from '@nestjs/common';
import { GiftReminderController } from './gift-reminder.controller';
import { GiftReminderService } from './gift-reminder.service';
import { WechatSubscribeModule } from '../wechat-subscribe/wechat-subscribe.module';

@Module({
  imports: [forwardRef(() => WechatSubscribeModule)],
  controllers: [GiftReminderController],
  providers: [GiftReminderService],
  exports: [GiftReminderService],
})
export class GiftReminderModule {}
