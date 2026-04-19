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
var PaidFeaturesController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaidFeaturesController = void 0;
const common_1 = require("@nestjs/common");
const paid_features_service_1 = require("./paid-features.service");
let PaidFeaturesController = PaidFeaturesController_1 = class PaidFeaturesController {
    constructor(paidFeaturesService) {
        this.paidFeaturesService = paidFeaturesService;
        this.logger = new common_1.Logger(PaidFeaturesController_1.name);
    }
    async getPaidFeaturesStatus(openid) {
        this.logger.log(`获取付费功能状态: ${openid}`);
        try {
            const status = await this.paidFeaturesService.getPaidFeaturesStatus(openid);
            return {
                code: 200,
                msg: 'success',
                data: status,
            };
        }
        catch (error) {
            this.logger.error('获取付费功能状态失败:', error);
            return {
                code: 500,
                msg: '获取状态失败',
                data: null,
            };
        }
    }
    async getBanquetPaidFeatures(banquetId) {
        this.logger.log(`获取宴会付费功能状态: ${banquetId}`);
        try {
            const status = await this.paidFeaturesService.getBanquetPaidFeatures(banquetId);
            return {
                code: 200,
                msg: 'success',
                data: status,
            };
        }
        catch (error) {
            this.logger.error('获取宴会付费功能状态失败:', error);
            return {
                code: 500,
                msg: '获取状态失败',
                data: null,
            };
        }
    }
    async createPayment(body) {
        const { openid, banquetId, feature, amount } = body;
        this.logger.log(`创建支付订单: ${openid} - ${feature} - ${amount}`);
        try {
            const result = await this.paidFeaturesService.createPaymentOrder(openid, banquetId, feature, amount);
            return {
                code: 200,
                msg: '订单创建成功',
                data: result,
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
            const { orderId, transactionId } = body;
            const result = await this.paidFeaturesService.handlePaymentSuccess(orderId, transactionId);
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
    async checkFeature(banquetId, feature) {
        try {
            const enabled = await this.paidFeaturesService.checkFeatureEnabled(banquetId, feature);
            return {
                code: 200,
                msg: 'success',
                data: { enabled },
            };
        }
        catch (error) {
            this.logger.error('检查功能状态失败:', error);
            return {
                code: 500,
                msg: '检查失败',
                data: { enabled: false },
            };
        }
    }
    async enableAIPage(body) {
        try {
            const result = await this.paidFeaturesService.enableAIPage(body.banquetId);
            return {
                code: 200,
                msg: '开通成功',
                data: result,
            };
        }
        catch (error) {
            this.logger.error('开通AI页面失败:', error);
            return {
                code: 400,
                msg: error.message || '开通失败',
                data: null,
            };
        }
    }
};
exports.PaidFeaturesController = PaidFeaturesController;
__decorate([
    (0, common_1.Get)('status'),
    __param(0, (0, common_1.Query)('openid')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaidFeaturesController.prototype, "getPaidFeaturesStatus", null);
__decorate([
    (0, common_1.Get)('banquet-status'),
    __param(0, (0, common_1.Query)('banquetId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaidFeaturesController.prototype, "getBanquetPaidFeatures", null);
__decorate([
    (0, common_1.Post)('pay'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaidFeaturesController.prototype, "createPayment", null);
__decorate([
    (0, common_1.Post)('payment-callback'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaidFeaturesController.prototype, "handlePaymentCallback", null);
__decorate([
    (0, common_1.Get)('check'),
    __param(0, (0, common_1.Query)('banquetId')),
    __param(1, (0, common_1.Query)('feature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PaidFeaturesController.prototype, "checkFeature", null);
__decorate([
    (0, common_1.Post)('enable-ai-page'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaidFeaturesController.prototype, "enableAIPage", null);
exports.PaidFeaturesController = PaidFeaturesController = PaidFeaturesController_1 = __decorate([
    (0, common_1.Controller)('paid-features'),
    __metadata("design:paramtypes", [paid_features_service_1.PaidFeaturesService])
], PaidFeaturesController);
//# sourceMappingURL=paid-features.controller.js.map