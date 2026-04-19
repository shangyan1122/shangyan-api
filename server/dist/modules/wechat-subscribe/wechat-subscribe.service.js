"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var WechatSubscribeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WechatSubscribeService = void 0;
const common_1 = require("@nestjs/common");
const supabase_client_1 = require("../../storage/database/supabase-client");
const supabase = (0, supabase_client_1.getSupabaseClient)();
const SUBSCRIBE_TEMPLATE_IDS = {
    GIFT_REMINDER: process.env.WECHAT_TEMPLATE_GIFT_REMINDER || '',
    GUEST_BANQUET_NOTIFY: process.env.WECHAT_TEMPLATE_GUEST_BANQUET_NOTIFY || '',
    BANQUET_INVITATION: process.env.WECHAT_TEMPLATE_BANQUET_INVITATION || '',
    RETURN_GIFT_NOTIFY: process.env.WECHAT_TEMPLATE_RETURN_GIFT || '',
    PAYMENT_SUCCESS: process.env.WECHAT_TEMPLATE_PAYMENT_SUCCESS || '',
    BANQUET_REMINDER: process.env.WECHAT_TEMPLATE_BANQUET_REMINDER || '',
    STOCK_WARNING: process.env.WECHAT_TEMPLATE_STOCK_WARNING || '',
    DELIVERY_REMINDER: process.env.WECHAT_TEMPLATE_DELIVERY_REMINDER || '',
};
let WechatSubscribeService = WechatSubscribeService_1 = class WechatSubscribeService {
    constructor() {
        this.logger = new common_1.Logger(WechatSubscribeService_1.name);
        this.appId = process.env.WECHAT_APP_ID || '';
        this.appSecret = process.env.WECHAT_APP_SECRET || '';
        this.accessToken = null;
        this.tokenExpireTime = 0;
    }
    async getAccessToken() {
        if (this.accessToken && Date.now() < this.tokenExpireTime) {
            return this.accessToken;
        }
        if (!this.appId || !this.appSecret) {
            this.logger.warn('微信小程序配置不完整，无法获取access_token');
            return null;
        }
        try {
            const response = await fetch(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`);
            const data = await response.json();
            if (data.access_token) {
                this.accessToken = data.access_token;
                this.tokenExpireTime = Date.now() + (data.expires_in - 300) * 1000;
                return this.accessToken;
            }
            else {
                this.logger.error('获取access_token失败:', data);
                return null;
            }
        }
        catch (error) {
            this.logger.error('获取access_token异常:', error.message);
            return null;
        }
    }
    async sendSubscribeMessage(message) {
        const accessToken = await this.getAccessToken();
        if (!accessToken) {
            this.logger.warn('access_token获取失败，使用模拟发送');
            return { success: true };
        }
        try {
            const response = await fetch(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    touser: message.touser,
                    template_id: message.template_id,
                    page: message.page || 'pages/index/index',
                    data: message.data,
                    miniprogram_state: message.miniprogram_state || 'formal',
                    lang: message.lang || 'zh_CN',
                }),
            });
            const result = await response.json();
            if (result.errcode === 0) {
                this.logger.log(`订阅消息发送成功: openid=${message.touser}, template=${message.template_id}`);
                return { success: true };
            }
            else {
                this.logger.error(`订阅消息发送失败: ${JSON.stringify(result)}`);
                return { success: false, errcode: result.errcode, errmsg: result.errmsg };
            }
        }
        catch (error) {
            this.logger.error('发送订阅消息异常:', error.message);
            return { success: false, errmsg: error.message };
        }
    }
    async sendGiftReminder(params) {
        const { openid, guestName, giftAmount, giftDate, banquetName, reminderContent } = params;
        const templateId = SUBSCRIBE_TEMPLATE_IDS.GIFT_REMINDER;
        if (!templateId) {
            this.logger.warn('人情提醒模板ID未配置');
            return { success: false };
        }
        const result = await this.sendSubscribeMessage({
            touser: openid,
            template_id: templateId,
            page: 'pages/gift-ledger/index',
            data: {
                thing1: { value: guestName.substring(0, 20) },
                amount2: { value: `¥${(giftAmount / 100).toFixed(0)}` },
                time3: { value: giftDate },
                thing4: { value: banquetName.substring(0, 20) },
                thing5: { value: reminderContent.substring(0, 20) },
            },
        });
        return { success: result.success };
    }
    async sendReturnGiftNotify(params) {
        const { openid, guestName, banquetName, giftName, claimCode } = params;
        const templateId = SUBSCRIBE_TEMPLATE_IDS.RETURN_GIFT_NOTIFY;
        if (!templateId) {
            this.logger.warn('回礼通知模板ID未配置');
            return { success: false };
        }
        const result = await this.sendSubscribeMessage({
            touser: openid,
            template_id: templateId,
            page: 'pages/redemption/index',
            data: {
                thing1: { value: guestName.substring(0, 20) },
                thing2: { value: banquetName.substring(0, 20) },
                thing3: { value: giftName.substring(0, 20) },
                character_string4: { value: claimCode },
            },
        });
        return { success: result.success };
    }
    async sendGuestBanquetNotify(params) {
        const { openid, guestName, guestBanquetName, giftAmount, sourceBanquetName, tip } = params;
        const templateId = SUBSCRIBE_TEMPLATE_IDS.GUEST_BANQUET_NOTIFY;
        if (!templateId) {
            this.logger.warn('嘉宾办宴通知模板ID未配置，使用人情提醒模板替代');
            return this.sendGiftReminder({
                openid,
                guestName,
                giftAmount,
                giftDate: new Date().toLocaleDateString('zh-CN'),
                banquetName: sourceBanquetName,
                reminderContent: `${guestName}正在举办${guestBanquetName}`,
            });
        }
        const result = await this.sendSubscribeMessage({
            touser: openid,
            template_id: templateId,
            page: 'pages/index/index',
            data: {
                thing1: { value: guestName.substring(0, 20) },
                thing2: { value: guestBanquetName.substring(0, 20) },
                amount3: { value: `¥${(giftAmount / 100).toFixed(0)}` },
                thing4: { value: sourceBanquetName.substring(0, 20) },
                thing5: { value: (tip || '礼尚往来，记得送上祝福').substring(0, 20) },
            },
        });
        return { success: result.success };
    }
    async sendPaymentSuccess(params) {
        const { openid, banquetName, guestName, amount, time } = params;
        const templateId = SUBSCRIBE_TEMPLATE_IDS.PAYMENT_SUCCESS;
        if (!templateId) {
            this.logger.warn('支付成功通知模板ID未配置');
            return { success: false };
        }
        const result = await this.sendSubscribeMessage({
            touser: openid,
            template_id: templateId,
            page: 'pages/gift-ledger/index',
            data: {
                thing1: { value: banquetName.substring(0, 20) },
                thing2: { value: guestName.substring(0, 20) },
                amount3: { value: `¥${(amount / 100).toFixed(2)}` },
                time4: { value: time },
            },
        });
        return { success: result.success };
    }
    async sendBanquetReminder(params) {
        const { openid, banquetName, banquetType, eventTime, location } = params;
        const templateId = SUBSCRIBE_TEMPLATE_IDS.BANQUET_REMINDER;
        if (!templateId) {
            this.logger.warn('宴会提醒模板ID未配置');
            return { success: false };
        }
        const result = await this.sendSubscribeMessage({
            touser: openid,
            template_id: templateId,
            page: 'pages/index/index',
            data: {
                thing1: { value: banquetName.substring(0, 20) },
                thing2: { value: banquetType },
                time3: { value: eventTime },
                thing4: { value: location.substring(0, 20) },
            },
        });
        return { success: result.success };
    }
    async recordSubscription(params) {
        const { openid, templateId, subscribeStatus } = params;
        const { error } = await supabase.from('user_subscriptions').upsert({
            openid,
            template_id: templateId,
            subscribe_status: subscribeStatus,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'openid,template_id',
        });
        if (error) {
            this.logger.error('记录订阅状态失败:', error);
        }
    }
    async checkSubscription(openid, templateId) {
        const { data, error } = await supabase
            .from('user_subscriptions')
            .select('subscribe_status')
            .eq('openid', openid)
            .eq('template_id', templateId)
            .single();
        if (error || !data) {
            return false;
        }
        return data.subscribe_status === 'accept';
    }
    async batchSendSubscribeMessages(messages) {
        let success = 0;
        let failed = 0;
        for (const message of messages) {
            const result = await this.sendSubscribeMessage(message);
            if (result.success) {
                success++;
            }
            else {
                failed++;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        return { success, failed };
    }
    async sendStockWarning(params) {
        const { openid, banquetName, productName, totalCount, remainingCount, remainingPercentage } = params;
        const templateId = SUBSCRIBE_TEMPLATE_IDS.STOCK_WARNING;
        if (!templateId) {
            this.logger.warn('库存预警模板ID未配置');
            return { success: false };
        }
        const result = await this.sendSubscribeMessage({
            touser: openid,
            template_id: templateId,
            page: 'packageB/pages/return-gift/index',
            data: {
                thing1: { value: banquetName.substring(0, 20) },
                thing2: { value: productName.substring(0, 20) },
                number3: { value: `${remainingCount}/${totalCount}` },
                amount4: { value: `${remainingPercentage}%` },
                thing5: { value: '库存不足5%，请及时补货' },
            },
        });
        return { success: result.success };
    }
    async sendDeliveryReminder(params) {
        const { openid, banquetName, productName, claimedAt } = params;
        const templateId = SUBSCRIBE_TEMPLATE_IDS.DELIVERY_REMINDER;
        if (!templateId) {
            this.logger.warn('收货信息填写提醒模板ID未配置');
            return { success: false };
        }
        const result = await this.sendSubscribeMessage({
            touser: openid,
            template_id: templateId,
            page: 'packageB/pages/claim-return-gift/index',
            data: {
                thing1: { value: banquetName.substring(0, 20) },
                thing2: { value: productName.substring(0, 20) },
                time3: { value: claimedAt },
                thing4: { value: '您已领取回礼，请尽快填写收货信息以便发货' },
            },
        });
        return { success: result.success };
    }
};
exports.WechatSubscribeService = WechatSubscribeService;
exports.WechatSubscribeService = WechatSubscribeService = WechatSubscribeService_1 = __decorate([
    (0, common_1.Injectable)()
], WechatSubscribeService);
//# sourceMappingURL=wechat-subscribe.service.js.map