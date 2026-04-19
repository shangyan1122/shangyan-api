"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const common_module_1 = require("./common/common.module");
const auth_module_1 = require("./modules/auth/auth.module");
const banquet_module_1 = require("./modules/banquet/banquet.module");
const upload_module_1 = require("./modules/upload/upload.module");
const gift_module_1 = require("./modules/gift/gift.module");
const ai_module_1 = require("./modules/ai/ai.module");
const payment_module_1 = require("./modules/payment/payment.module");
const user_module_1 = require("./modules/user/user.module");
const withdraw_module_1 = require("./modules/withdraw/withdraw.module");
const partner_module_1 = require("./modules/partner/partner.module");
const mall_module_1 = require("./modules/mall/mall.module");
const referral_module_1 = require("./modules/referral/referral.module");
const return_gift_module_1 = require("./modules/return-gift/return-gift.module");
const member_module_1 = require("./modules/member/member.module");
const gift_reminder_module_1 = require("./modules/gift-reminder/gift-reminder.module");
const wechat_pay_module_1 = require("./modules/wechat-pay/wechat-pay.module");
const excel_export_module_1 = require("./modules/excel-export/excel-export.module");
const ai_cover_module_1 = require("./modules/ai-cover/ai-cover.module");
const gift_product_module_1 = require("./modules/gift-product/gift-product.module");
const onsite_gift_module_1 = require("./modules/onsite-gift/onsite-gift.module");
const merchant_module_1 = require("./modules/merchant/merchant.module");
const test_module_1 = require("./modules/test/test.module");
const mall_order_module_1 = require("./modules/mall-order/mall-order.module");
const gift_exchange_module_1 = require("./modules/gift-exchange/gift-exchange.module");
const alibaba_1688_module_1 = require("./modules/alibaba-1688/alibaba-1688.module");
const service_fee_module_1 = require("./modules/service-fee/service-fee.module");
const paid_features_module_1 = require("./modules/paid-features/paid-features.module");
const wechat_subscribe_module_1 = require("./modules/wechat-subscribe/wechat-subscribe.module");
const admin_product_module_1 = require("./modules/admin-product/admin-product.module");
const recommend_officer_module_1 = require("./modules/recommend-officer/recommend-officer.module");
const admin_auth_module_1 = require("./modules/admin-auth/admin-auth.module");
const admin_order_module_1 = require("./modules/admin-order/admin-order.module");
const admin_user_module_1 = require("./modules/admin-user/admin-user.module");
const admin_banquet_module_1 = require("./modules/admin-banquet/admin-banquet.module");
const admin_finance_module_1 = require("./modules/admin-finance/admin-finance.module");
const admin_stats_module_1 = require("./modules/admin-stats/admin-stats.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            schedule_1.ScheduleModule.forRoot(),
            common_module_1.CommonModule,
            auth_module_1.AuthModule,
            banquet_module_1.BanquetModule,
            upload_module_1.UploadModule,
            gift_module_1.GiftModule,
            ai_module_1.AIModule,
            payment_module_1.PaymentModule,
            user_module_1.UserModule,
            withdraw_module_1.WithdrawModule,
            partner_module_1.PartnerModule,
            mall_module_1.MallModule,
            referral_module_1.ReferralModule,
            return_gift_module_1.ReturnGiftModule,
            gift_reminder_module_1.GiftReminderModule,
            member_module_1.MemberModule,
            wechat_pay_module_1.WechatPayModule,
            excel_export_module_1.ExcelExportModule,
            ai_cover_module_1.AICoverModule,
            gift_product_module_1.GiftProductModule,
            onsite_gift_module_1.OnsiteGiftModule,
            merchant_module_1.MerchantModule,
            test_module_1.TestModule,
            mall_order_module_1.MallOrderModule,
            gift_exchange_module_1.GiftExchangeModule,
            alibaba_1688_module_1.Alibaba1688Module,
            service_fee_module_1.ServiceFeeModule,
            paid_features_module_1.PaidFeaturesModule,
            wechat_subscribe_module_1.WechatSubscribeModule,
            admin_product_module_1.AdminProductModule,
            recommend_officer_module_1.RecommendOfficerModule,
            admin_auth_module_1.AdminAuthModule,
            admin_order_module_1.AdminOrderModule,
            admin_user_module_1.AdminUserModule,
            admin_banquet_module_1.AdminBanquetModule,
            admin_finance_module_1.AdminFinanceModule,
            admin_stats_module_1.AdminStatsModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map