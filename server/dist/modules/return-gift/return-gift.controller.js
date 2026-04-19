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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReturnGiftController = void 0;
const common_1 = require("@nestjs/common");
const return_gift_service_1 = require("./return-gift.service");
let ReturnGiftController = class ReturnGiftController {
    constructor(returnGiftService) {
        this.returnGiftService = returnGiftService;
    }
    async saveSettings(body) {
        const { banquet_id, ...settings } = body;
        const result = await this.returnGiftService.saveReturnGiftSettings(banquet_id, settings);
        return {
            code: 200,
            msg: '保存成功',
            data: result,
        };
    }
    async getSettings(banquetId) {
        const result = await this.returnGiftService.getReturnGiftSettings(banquetId);
        return {
            code: 200,
            msg: '获取成功',
            data: result,
        };
    }
    async triggerReturnGift(body) {
        const result = await this.returnGiftService.triggerReturnGift(body.gift_record_id);
        return {
            code: 200,
            msg: '回礼已触发',
            data: result,
        };
    }
    async getGuestReturnGift(giftRecordId) {
        const result = await this.returnGiftService.getGuestReturnGift(giftRecordId);
        return {
            code: 200,
            msg: '获取成功',
            data: result,
        };
    }
    async claimMallGift(body) {
        const result = await this.returnGiftService.claimMallGift(body.return_gift_id, body.claim_type, body.delivery_info);
        return {
            code: 200,
            msg: '领取成功',
            data: result,
        };
    }
    async claimOnsiteGift(body) {
        const result = await this.returnGiftService.claimOnsiteGift(body.return_gift_id);
        return {
            code: 200,
            msg: '领取成功',
            data: result,
        };
    }
    async exchangeOnsiteGift(body) {
        const result = await this.returnGiftService.exchangeOnsiteGift(body.exchange_code);
        return {
            code: 200,
            msg: '核销成功',
            data: result,
        };
    }
    async exchangeOnsiteGiftWithAuth(body) {
        const result = await this.returnGiftService.exchangeOnsiteGiftWithAuth(body.exchange_code, body.verifier_wechat, body.verifier_openid);
        return {
            code: 200,
            msg: '核销成功',
            data: result,
        };
    }
    async getUnclaimedStats(banquetId) {
        const result = await this.returnGiftService.getUnclaimedGiftsStats(banquetId);
        return {
            code: 200,
            msg: '获取成功',
            data: result,
        };
    }
    async refundUnclaimedGifts(body) {
        const result = await this.returnGiftService.refundUnclaimedGifts(body.banquet_id);
        return {
            code: 200,
            msg: result.message,
            data: result,
        };
    }
    async autoShip() {
        const result = await this.returnGiftService.autoConfirmShipment();
        return {
            code: result.success ? 200 : 500,
            msg: result.message,
            data: { count: result.count },
        };
    }
    async getPendingShipOrders() {
        const result = await this.returnGiftService.getPendingShipOrders();
        return {
            code: result.success ? 200 : 500,
            msg: result.success ? '获取成功' : result.message,
            data: result.data,
        };
    }
    async sendDeliveryReminders() {
        const result = await this.returnGiftService.sendDeliveryReminderNotices();
        return {
            code: result.success ? 200 : 500,
            msg: result.message,
            data: { count: result.count },
        };
    }
    async getPendingDeliveryRecords(banquetId) {
        const result = await this.returnGiftService.getPendingDeliveryRecords(banquetId);
        return {
            code: result.success ? 200 : 500,
            msg: result.success ? '获取成功' : result.message,
            data: result.data,
        };
    }
    async updateDeliveryInfo(body) {
        const result = await this.returnGiftService.updateDeliveryInfo(body.return_gift_id, body.recipient_name, body.recipient_phone, body.recipient_address);
        return {
            code: result.success ? 200 : 500,
            msg: result.message,
            data: result.data,
        };
    }
};
exports.ReturnGiftController = ReturnGiftController;
__decorate([
    (0, common_1.Post)('settings'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReturnGiftController.prototype, "saveSettings", null);
__decorate([
    (0, common_1.Get)('settings/:banquetId'),
    __param(0, (0, common_1.Param)('banquetId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReturnGiftController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Post)('trigger'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReturnGiftController.prototype, "triggerReturnGift", null);
__decorate([
    (0, common_1.Get)('guest/:giftRecordId'),
    __param(0, (0, common_1.Param)('giftRecordId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReturnGiftController.prototype, "getGuestReturnGift", null);
__decorate([
    (0, common_1.Post)('claim-mall'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReturnGiftController.prototype, "claimMallGift", null);
__decorate([
    (0, common_1.Post)('claim-onsite'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReturnGiftController.prototype, "claimOnsiteGift", null);
__decorate([
    (0, common_1.Post)('exchange'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReturnGiftController.prototype, "exchangeOnsiteGift", null);
__decorate([
    (0, common_1.Post)('exchange-with-auth'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReturnGiftController.prototype, "exchangeOnsiteGiftWithAuth", null);
__decorate([
    (0, common_1.Get)('unclaimed-stats/:banquetId'),
    __param(0, (0, common_1.Param)('banquetId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReturnGiftController.prototype, "getUnclaimedStats", null);
__decorate([
    (0, common_1.Post)('refund-unclaimed'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReturnGiftController.prototype, "refundUnclaimedGifts", null);
__decorate([
    (0, common_1.Post)('auto-ship'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReturnGiftController.prototype, "autoShip", null);
__decorate([
    (0, common_1.Get)('pending-ship'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReturnGiftController.prototype, "getPendingShipOrders", null);
__decorate([
    (0, common_1.Post)('send-delivery-reminders'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReturnGiftController.prototype, "sendDeliveryReminders", null);
__decorate([
    (0, common_1.Get)('pending-delivery'),
    __param(0, (0, common_1.Query)('banquetId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReturnGiftController.prototype, "getPendingDeliveryRecords", null);
__decorate([
    (0, common_1.Post)('update-delivery'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReturnGiftController.prototype, "updateDeliveryInfo", null);
exports.ReturnGiftController = ReturnGiftController = __decorate([
    (0, common_1.Controller)('return-gift'),
    __metadata("design:paramtypes", [return_gift_service_1.ReturnGiftService])
], ReturnGiftController);
//# sourceMappingURL=return-gift.controller.js.map