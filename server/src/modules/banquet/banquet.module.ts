import { Module, forwardRef } from '@nestjs/common';
import { BanquetController } from './banquet.controller';
import { BanquetService } from './banquet.service';
import { AiService } from '../ai/ai.service';
import { GiftReminderModule } from '../gift-reminder/gift-reminder.module';
import { GiftReminderService } from '../gift-reminder/gift-reminder.service';
import { WechatSubscribeModule } from '../wechat-subscribe/wechat-subscribe.module';
import { WechatConfigService } from '@/common/services/wechat-config.service';

@Module({
  imports: [forwardRef(() => GiftReminderModule), forwardRef(() => WechatSubscribeModule)],
  controllers: [BanquetController],
  providers: [BanquetService, AiService, WechatConfigService, GiftReminderService],
  exports: [BanquetService],
})
export class BanquetModule {}
