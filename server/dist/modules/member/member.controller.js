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
var MemberController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemberController = void 0;
const common_1 = require("@nestjs/common");
const member_service_1 = require("./member.service");
const common_2 = require("@nestjs/common");
let MemberController = MemberController_1 = class MemberController {
    constructor(memberService) {
        this.memberService = memberService;
        this.logger = new common_2.Logger(MemberController_1.name);
    }
    async getMemberStatus(openid) {
        this.logger.log(`获取会员状态: ${openid}`);
        try {
            const status = await this.memberService.getMemberStatus(openid);
            return {
                code: 200,
                msg: 'success',
                data: status,
            };
        }
        catch (error) {
            this.logger.error('获取会员状态失败:', error);
            return {
                code: 500,
                msg: '获取会员状态失败',
                data: null,
            };
        }
    }
    async createPurchase(body) {
        const { openid, featureId, amount, mockPay } = body;
        this.logger.log(`创建购买订单: ${openid} - ${featureId}, mockPay: ${mockPay}`);
        try {
            const paymentParams = await this.memberService.createPurchaseOrder(openid, featureId, amount, mockPay);
            return {
                code: 200,
                msg: '订单创建成功',
                data: paymentParams,
            };
        }
        catch (error) {
            this.logger.error('创建订单失败:', error);
            return {
                code: 400,
                msg: error.message || '创建订单失败',
                data: null,
            };
        }
    }
    async handlePaymentCallback(body) {
        this.logger.log('收到支付回调:', JSON.stringify(body));
        try {
            const { orderId } = body;
            const result = await this.memberService.handlePaymentSuccess(orderId);
            return {
                code: 200,
                msg: 'success',
                data: result,
            };
        }
        catch (error) {
            this.logger.error('处理支付回调失败:', error);
            return {
                code: 500,
                msg: '处理失败',
                data: null,
            };
        }
    }
    async checkFeature(openid, featureId) {
        this.logger.log(`检查功能解锁: ${openid} - ${featureId}`);
        try {
            const unlocked = await this.memberService.checkFeatureUnlocked(openid, featureId);
            return {
                code: 200,
                msg: 'success',
                data: { unlocked },
            };
        }
        catch (error) {
            this.logger.error('检查功能失败:', error);
            return {
                code: 500,
                msg: '检查失败',
                data: { unlocked: false },
            };
        }
    }
};
exports.MemberController = MemberController;
__decorate([
    (0, common_1.Get)('status'),
    __param(0, (0, common_1.Query)('openid')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MemberController.prototype, "getMemberStatus", null);
__decorate([
    (0, common_1.Post)('purchase'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MemberController.prototype, "createPurchase", null);
__decorate([
    (0, common_1.Post)('payment-callback'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MemberController.prototype, "handlePaymentCallback", null);
__decorate([
    (0, common_1.Get)('check-feature'),
    __param(0, (0, common_1.Query)('openid')),
    __param(1, (0, common_1.Query)('featureId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MemberController.prototype, "checkFeature", null);
exports.MemberController = MemberController = MemberController_1 = __decorate([
    (0, common_1.Controller)('member'),
    __metadata("design:paramtypes", [member_service_1.MemberService])
], MemberController);
//# sourceMappingURL=member.controller.js.map