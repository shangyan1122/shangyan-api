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
exports.ReferralController = void 0;
const common_1 = require("@nestjs/common");
const referral_service_1 = require("./referral.service");
let ReferralController = class ReferralController {
    constructor(referralService) {
        this.referralService = referralService;
    }
    async getStats(openid, req) {
        const userOpenid = openid || req.headers['x-wx-openid'] || 'test_openid_123';
        return this.referralService.getReferralStats(userOpenid);
    }
    async getInvitees(openid, req) {
        const userOpenid = openid || req.headers['x-wx-openid'] || 'test_openid_123';
        return this.referralService.getInvitees(userOpenid);
    }
    async getReferralCode(openid, req) {
        const userOpenid = openid || req.headers['x-wx-openid'] || 'test_openid_123';
        return this.referralService.getOrCreateReferralCode(userOpenid);
    }
    async bindReferrer(body, req) {
        const userOpenid = body.openid || req.headers['x-wx-openid'] || 'test_openid_123';
        return this.referralService.bindReferrer(userOpenid, body.code);
    }
    async bindOnGift(body, req) {
        const guestOpenid = body.guestOpenid || req.headers['x-wx-openid'] || 'test_openid_123';
        return this.referralService.bindOnGift(guestOpenid, body.hostOpenid, body.banquetId);
    }
    async checkIsFree(openid, req) {
        const userOpenid = openid || req.headers['x-wx-openid'] || 'test_openid_123';
        const isFree = await this.referralService.isFreePerson(userOpenid);
        return { code: 200, msg: 'success', data: { isFreePerson: isFree } };
    }
    async calculateCommission(body) {
        return this.referralService.calculateCommission(body.openid, body.amount, body.paymentId, body.type);
    }
    async handleFreePersonCreateBanquet(body) {
        await this.referralService.handleFreePersonCreateBanquet(body.openid);
        return { code: 200, msg: 'success' };
    }
    async getCommissions(openid, req) {
        const userOpenid = openid || req.headers['x-wx-openid'] || 'test_openid_123';
        return this.referralService.getCommissionHistory(userOpenid);
    }
    async checkExpired() {
        const result = await this.referralService.checkExpiredRelations();
        return { code: 200, msg: 'success', data: result };
    }
    async login(body, req) {
        const userOpenid = body.openid || req.headers['x-wx-openid'] || 'test_openid_123';
        const userId = await this.referralService.ensureUserExists(userOpenid, body.nickname, body.avatar);
        return { code: 200, msg: 'success', data: { userId } };
    }
};
exports.ReferralController = ReferralController;
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, common_1.Query)('openid')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('invitees'),
    __param(0, (0, common_1.Query)('openid')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "getInvitees", null);
__decorate([
    (0, common_1.Get)('code'),
    __param(0, (0, common_1.Query)('openid')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "getReferralCode", null);
__decorate([
    (0, common_1.Post)('bind'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "bindReferrer", null);
__decorate([
    (0, common_1.Post)('bind-on-gift'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "bindOnGift", null);
__decorate([
    (0, common_1.Get)('is-free'),
    __param(0, (0, common_1.Query)('openid')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "checkIsFree", null);
__decorate([
    (0, common_1.Post)('calculate-commission'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "calculateCommission", null);
__decorate([
    (0, common_1.Post)('free-person-create-banquet'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "handleFreePersonCreateBanquet", null);
__decorate([
    (0, common_1.Get)('commissions'),
    __param(0, (0, common_1.Query)('openid')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "getCommissions", null);
__decorate([
    (0, common_1.Post)('check-expired'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "checkExpired", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "login", null);
exports.ReferralController = ReferralController = __decorate([
    (0, common_1.Controller)('referral'),
    __metadata("design:paramtypes", [referral_service_1.ReferralService])
], ReferralController);
//# sourceMappingURL=referral.controller.js.map