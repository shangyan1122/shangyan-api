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
var GiftExchangeController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GiftExchangeController = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const gift_exchange_service_1 = require("./gift-exchange.service");
let GiftExchangeController = GiftExchangeController_1 = class GiftExchangeController {
    constructor(exchangeService) {
        this.exchangeService = exchangeService;
        this.logger = new common_2.Logger(GiftExchangeController_1.name);
    }
    async previewExchange(body) {
        try {
            const result = await this.exchangeService.previewExchange(body.sourceItems, body.targetItems);
            return { code: 200, msg: 'success', data: result };
        }
        catch (error) {
            return { code: 500, msg: error.message, data: null };
        }
    }
    async createExchange(body) {
        this.logger.log(`创建置换: user=${body.userOpenid}, type=${body.exchangeType}`);
        try {
            const result = await this.exchangeService.createExchange(body);
            return { code: 200, msg: 'success', data: result };
        }
        catch (error) {
            this.logger.error(`创建置换失败: ${error.message}`);
            return { code: 500, msg: error.message, data: null };
        }
    }
    async getAvailableGifts(openid) {
        try {
            const gifts = await this.exchangeService.getUserAvailableGifts(openid);
            return { code: 200, msg: 'success', data: gifts };
        }
        catch (error) {
            return { code: 500, msg: '获取失败', data: [] };
        }
    }
    async getExchangeRecords(openid, page, pageSize) {
        try {
            const result = await this.exchangeService.getUserExchanges(openid, parseInt(page || '1'), parseInt(pageSize || '10'));
            return { code: 200, msg: 'success', data: result };
        }
        catch (error) {
            return { code: 500, msg: '获取失败', data: { records: [], total: 0 } };
        }
    }
    async getExchangeById(id) {
        try {
            const result = await this.exchangeService.getExchangeById(id);
            if (!result) {
                return { code: 404, msg: '置换记录不存在', data: null };
            }
            return { code: 200, msg: 'success', data: result };
        }
        catch (error) {
            return { code: 500, msg: '获取失败', data: null };
        }
    }
    async handleDiffPaymentSuccess(body) {
        try {
            const success = await this.exchangeService.handleDiffPaymentSuccess(body.exchangeNo, body.transactionId);
            return { code: 200, msg: 'success', data: { success } };
        }
        catch (error) {
            return { code: 500, msg: error.message, data: { success: false } };
        }
    }
    async completeExchange(body) {
        try {
            const success = await this.exchangeService.completeExchange(body.exchangeId);
            return { code: 200, msg: 'success', data: { success } };
        }
        catch (error) {
            return { code: 500, msg: error.message, data: { success: false } };
        }
    }
    async cancelExchange(body) {
        try {
            const success = await this.exchangeService.cancelExchange(body.exchangeId);
            return { code: 200, msg: 'success', data: { success } };
        }
        catch (error) {
            return { code: 500, msg: error.message, data: { success: false } };
        }
    }
};
exports.GiftExchangeController = GiftExchangeController;
__decorate([
    (0, common_1.Post)('preview'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GiftExchangeController.prototype, "previewExchange", null);
__decorate([
    (0, common_1.Post)('create'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GiftExchangeController.prototype, "createExchange", null);
__decorate([
    (0, common_1.Get)('available-gifts'),
    __param(0, (0, common_1.Query)('openid')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GiftExchangeController.prototype, "getAvailableGifts", null);
__decorate([
    (0, common_1.Get)('records'),
    __param(0, (0, common_1.Query)('openid')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], GiftExchangeController.prototype, "getExchangeRecords", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GiftExchangeController.prototype, "getExchangeById", null);
__decorate([
    (0, common_1.Post)('diff-payment-success'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GiftExchangeController.prototype, "handleDiffPaymentSuccess", null);
__decorate([
    (0, common_1.Post)('complete'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GiftExchangeController.prototype, "completeExchange", null);
__decorate([
    (0, common_1.Post)('cancel'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GiftExchangeController.prototype, "cancelExchange", null);
exports.GiftExchangeController = GiftExchangeController = GiftExchangeController_1 = __decorate([
    (0, common_1.Controller)('gift-exchange'),
    __metadata("design:paramtypes", [gift_exchange_service_1.GiftExchangeService])
], GiftExchangeController);
//# sourceMappingURL=gift-exchange.controller.js.map