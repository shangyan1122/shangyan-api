"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WechatSubscribeController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WechatSubscribeController = void 0;
const common_1 = require("@nestjs/common");
const wechat_subscribe_service_1 = require("./wechat-subscribe.service");
let WechatSubscribeController = WechatSubscribeController_1 = class WechatSubscribeController {
    constructor(subscribeService) {
        this.subscribeService = subscribeService;
        this.logger = new common_1.Logger(WechatSubscribeController_1.name);
    }
    async recordSubscription(body) {
        const { openid, templateId, subscribeStatus } = body;
        await this.subscribeService.recordSubscription({
            openid,
            templateId,
            subscribeStatus,
        });
        return {
            code: 200,
            msg: '记录成功',
        };
    }
    async checkSubscription(query) {
        const { openid, templateId } = query;
        const subscribed = await this.subscribeService.checkSubscription(openid, templateId);
        return {
            code: 200,
            data: { subscribed },
        };
    }
    async sendTestMessage(body) {
        const { openid, type, data } = body;
        this.logger.log(`发送测试订阅消息: openid=${openid}, type=${type}`);
        let result;
        switch (type) {
            case 'gift_reminder':
                result = await this.subscribeService.sendGiftReminder({
                    openid,
                    guestName: data.guestName || '测试宾客',
                    giftAmount: data.giftAmount || 10000,
                    giftDate: data.giftDate || new Date().toISOString().split('T')[0],
                    banquetName: data.banquetName || '测试宴会',
                    reminderContent: data.reminderContent || '这是一条测试提醒消息',
                });
                break;
            case 'return_gift':
                result = await this.subscribeService.sendReturnGiftNotify({
                    openid,
                    guestName: data.guestName || '测试宾客',
                    banquetName: data.banquetName || '测试宴会',
                    giftName: data.giftName || '测试礼品',
                    claimCode: data.claimCode || 'TEST123',
                });
                break;
            case 'payment_success':
                result = await this.subscribeService.sendPaymentSuccess({
                    openid,
                    banquetName: data.banquetName || '测试宴会',
                    guestName: data.guestName || '测试宾客',
                    amount: data.amount || 10000,
                    time: data.time || new Date().toISOString(),
                });
                break;
            case 'banquet_reminder':
                result = await this.subscribeService.sendBanquetReminder({
                    openid,
                    banquetName: data.banquetName || '测试宴会',
                    banquetType: data.banquetType || '婚宴',
                    eventTime: data.eventTime || new Date().toISOString(),
                    location: data.location || '测试酒店',
                });
                break;
            default:
                return {
                    code: 400,
                    msg: '不支持的消息类型',
                };
        }
        return {
            code: result.success ? 200 : 500,
            msg: result.success ? '发送成功' : '发送失败',
            data: result,
        };
    }
};
exports.WechatSubscribeController = WechatSubscribeController;
__decorate([
    (0, common_1.Post)('record'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WechatSubscribeController.prototype, "recordSubscription", null);
__decorate([
    (0, common_1.Get)('check'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WechatSubscribeController.prototype, "checkSubscription", null);
__decorate([
    (0, common_1.Post)('test'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WechatSubscribeController.prototype, "sendTestMessage", null);
exports.WechatSubscribeController = WechatSubscribeController = WechatSubscribeController_1 = __decorate([
    (0, common_1.Controller)('wechat-subscribe'),
    __metadata("design:paramtypes", [wechat_subscribe_service_1.WechatSubscribeService])
], WechatSubscribeController);
//# sourceMappingURL=wechat-subscribe.controller.js.map