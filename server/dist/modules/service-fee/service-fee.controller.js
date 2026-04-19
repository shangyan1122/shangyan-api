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
exports.ServiceFeeController = void 0;
const common_1 = require("@nestjs/common");
const service_fee_service_1 = require("./service-fee.service");
const shopping_voucher_service_1 = require("./shopping-voucher.service");
let ServiceFeeController = class ServiceFeeController {
    constructor(serviceFeeService, voucherService) {
        this.serviceFeeService = serviceFeeService;
        this.voucherService = voucherService;
    }
    async calculateServiceFee(banquetId) {
        const statistics = await this.serviceFeeService.calculateBanquetServiceFee(banquetId);
        return {
            code: 200,
            msg: '统计成功',
            data: statistics,
        };
    }
    async issueVoucher(banquetId) {
        const voucher = await this.voucherService.issueVoucherOnBanquetEnd(banquetId);
        return {
            code: 200,
            msg: voucher ? '购物券发放成功' : '无需发放购物券',
            data: voucher,
        };
    }
    async getVoucherBalance(openid) {
        const balance = await this.voucherService.getUserVoucherBalance(openid);
        return {
            code: 200,
            msg: '获取成功',
            data: { balance },
        };
    }
    async getVoucherList(openid) {
        const vouchers = await this.voucherService.getUserVouchers(openid);
        return {
            code: 200,
            msg: '获取成功',
            data: vouchers,
        };
    }
    async useVoucher(body) {
        const result = await this.voucherService.useVoucher(body.openid, body.amount, body.orderId);
        return {
            code: result.success ? 200 : 400,
            msg: result.success ? '使用成功' : '购物券余额不足',
            data: result,
        };
    }
    async issueVoucherManually(body) {
        const voucher = await this.voucherService.issueVoucherManually(body.openid, body.amount, body.description);
        return {
            code: voucher ? 200 : 500,
            msg: voucher ? '发放成功' : '发放失败',
            data: voucher,
        };
    }
};
exports.ServiceFeeController = ServiceFeeController;
__decorate([
    (0, common_1.Post)('calculate/:banquetId'),
    __param(0, (0, common_1.Param)('banquetId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ServiceFeeController.prototype, "calculateServiceFee", null);
__decorate([
    (0, common_1.Post)('issue-voucher/:banquetId'),
    __param(0, (0, common_1.Param)('banquetId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ServiceFeeController.prototype, "issueVoucher", null);
__decorate([
    (0, common_1.Get)('voucher/balance'),
    __param(0, (0, common_1.Query)('openid')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ServiceFeeController.prototype, "getVoucherBalance", null);
__decorate([
    (0, common_1.Get)('voucher/list'),
    __param(0, (0, common_1.Query)('openid')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ServiceFeeController.prototype, "getVoucherList", null);
__decorate([
    (0, common_1.Post)('voucher/use'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ServiceFeeController.prototype, "useVoucher", null);
__decorate([
    (0, common_1.Post)('voucher/issue'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ServiceFeeController.prototype, "issueVoucherManually", null);
exports.ServiceFeeController = ServiceFeeController = __decorate([
    (0, common_1.Controller)('service-fee'),
    __metadata("design:paramtypes", [service_fee_service_1.ServiceFeeService,
        shopping_voucher_service_1.ShoppingVoucherService])
], ServiceFeeController);
//# sourceMappingURL=service-fee.controller.js.map