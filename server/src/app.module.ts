import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { CommonModule } from '@/common/common.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { BanquetModule } from '@/modules/banquet/banquet.module';
import { UploadModule } from '@/modules/upload/upload.module';
import { GiftModule } from '@/modules/gift/gift.module';
import { AIModule } from '@/modules/ai/ai.module';
import { PaymentModule } from '@/modules/payment/payment.module';
import { UserModule } from '@/modules/user/user.module';
import { WithdrawModule } from '@/modules/withdraw/withdraw.module';
import { PartnerModule } from '@/modules/partner/partner.module';
import { MallModule } from '@/modules/mall/mall.module';
import { ReferralModule } from '@/modules/referral/referral.module';
import { ReturnGiftModule } from '@/modules/return-gift/return-gift.module';
import { MemberModule } from '@/modules/member/member.module';
import { GiftReminderModule } from '@/modules/gift-reminder/gift-reminder.module';
import { WechatPayModule } from '@/modules/wechat-pay/wechat-pay.module';
import { ExcelExportModule } from '@/modules/excel-export/excel-export.module';
import { AICoverModule } from '@/modules/ai-cover/ai-cover.module';
import { GiftProductModule } from '@/modules/gift-product/gift-product.module';
import { OnsiteGiftModule } from '@/modules/onsite-gift/onsite-gift.module';
import { MerchantModule } from '@/modules/merchant/merchant.module';
import { TestModule } from '@/modules/test/test.module';
import { MallOrderModule } from '@/modules/mall-order/mall-order.module';
import { GiftExchangeModule } from '@/modules/gift-exchange/gift-exchange.module';
import { Alibaba1688Module } from '@/modules/alibaba-1688/alibaba-1688.module';
import { ServiceFeeModule } from '@/modules/service-fee/service-fee.module';
import { PaidFeaturesModule } from '@/modules/paid-features/paid-features.module';
import { WechatSubscribeModule } from '@/modules/wechat-subscribe/wechat-subscribe.module';
import { AdminProductModule } from '@/modules/admin-product/admin-product.module';
import { RecommendOfficerModule } from '@/modules/recommend-officer/recommend-officer.module';
import { AdminAuthModule } from '@/modules/admin-auth/admin-auth.module';
import { AdminOrderModule } from '@/modules/admin-order/admin-order.module';
import { AdminUserModule } from '@/modules/admin-user/admin-user.module';
import { AdminBanquetModule } from '@/modules/admin-banquet/admin-banquet.module';
import { AdminFinanceModule } from '@/modules/admin-finance/admin-finance.module';
import { AdminStatsModule } from '@/modules/admin-stats/admin-stats.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CommonModule,
    AuthModule,
    BanquetModule,
    UploadModule,
    GiftModule,
    AIModule,
    PaymentModule,
    UserModule,
    WithdrawModule,
    PartnerModule,
    MallModule,
    ReferralModule,
    ReturnGiftModule,
    GiftReminderModule,
    MemberModule,
    WechatPayModule,
    ExcelExportModule,
    AICoverModule,
    GiftProductModule,
    OnsiteGiftModule,
    MerchantModule,
    TestModule,
    MallOrderModule,
    GiftExchangeModule,
    Alibaba1688Module,
    ServiceFeeModule,
    PaidFeaturesModule,
    WechatSubscribeModule,
    AdminProductModule,
    RecommendOfficerModule,
    AdminAuthModule,
    AdminOrderModule,
    AdminUserModule,
    AdminBanquetModule,
    AdminFinanceModule,
    AdminStatsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
