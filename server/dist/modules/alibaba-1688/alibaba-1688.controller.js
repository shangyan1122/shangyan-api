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
var Alibaba1688Controller_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Alibaba1688Controller = void 0;
const common_1 = require("@nestjs/common");
const alibaba_1688_service_1 = require("./alibaba-1688.service");
let Alibaba1688Controller = Alibaba1688Controller_1 = class Alibaba1688Controller {
    constructor(alibaba1688Service) {
        this.alibaba1688Service = alibaba1688Service;
        this.logger = new common_1.Logger(Alibaba1688Controller_1.name);
    }
    async getConfig() {
        try {
            const config = await this.alibaba1688Service.getConfig();
            if (config) {
                const safeConfig = {
                    ...config,
                    app_secret: config.app_secret ? '******' : '',
                    access_token: config.access_token ? '******' : '',
                };
                return { code: 200, msg: '获取成功', data: safeConfig };
            }
            return { code: 200, msg: '获取成功', data: config };
        }
        catch (error) {
            this.logger.error('获取配置失败:', error);
            return { code: 500, msg: error.message, data: null };
        }
    }
    async saveConfig(body) {
        try {
            this.logger.log('保存1688配置');
            const config = await this.alibaba1688Service.saveConfig(body);
            return { code: 200, msg: '保存成功', data: config };
        }
        catch (error) {
            this.logger.error('保存配置失败:', error);
            return { code: 500, msg: error.message, data: null };
        }
    }
    async updateConfig(id, body) {
        try {
            const config = await this.alibaba1688Service.updateConfig(id, body);
            return { code: 200, msg: '更新成功', data: config };
        }
        catch (error) {
            this.logger.error('更新配置失败:', error);
            return { code: 500, msg: error.message, data: null };
        }
    }
    async toggleDropship(body) {
        try {
            await this.alibaba1688Service.toggleDropship(body.enabled);
            return { code: 200, msg: body.enabled ? '代发已开启' : '代发已关闭' };
        }
        catch (error) {
            this.logger.error('切换代发开关失败:', error);
            return { code: 500, msg: error.message };
        }
    }
    async getStatus() {
        try {
            const enabled = await this.alibaba1688Service.isDropshipEnabled();
            return { code: 200, msg: '获取成功', data: { enabled } };
        }
        catch (error) {
            this.logger.error('获取状态失败:', error);
            return { code: 500, msg: error.message, data: { enabled: false } };
        }
    }
    async getOrders(banquetId, status, limit, offset) {
        try {
            const result = await this.alibaba1688Service.getDropshipOrders({
                banquetId,
                status,
                limit: limit ? parseInt(limit) : 20,
                offset: offset ? parseInt(offset) : 0,
            });
            return { code: 200, msg: '获取成功', data: result };
        }
        catch (error) {
            this.logger.error('获取订单列表失败:', error);
            return { code: 500, msg: error.message, data: { orders: [], total: 0 } };
        }
    }
    async getOrderById(id) {
        try {
            const order = await this.alibaba1688Service.getDropshipOrderById(id);
            return { code: 200, msg: '获取成功', data: order };
        }
        catch (error) {
            this.logger.error('获取订单详情失败:', error);
            return { code: 500, msg: error.message, data: null };
        }
    }
    async syncLogistics(id) {
        try {
            await this.alibaba1688Service.syncLogistics(id);
            return { code: 200, msg: '同步成功' };
        }
        catch (error) {
            this.logger.error('同步物流失败:', error);
            return { code: 500, msg: error.message };
        }
    }
    async syncAllLogistics() {
        try {
            await this.alibaba1688Service.syncAllPendingLogistics();
            return { code: 200, msg: '同步完成' };
        }
        catch (error) {
            this.logger.error('批量同步物流失败:', error);
            return { code: 500, msg: error.message };
        }
    }
    async getStats(banquetId) {
        try {
            const stats = await this.alibaba1688Service.getDropshipStats(banquetId);
            return { code: 200, msg: '获取成功', data: stats };
        }
        catch (error) {
            this.logger.error('获取统计失败:', error);
            return { code: 500, msg: error.message, data: null };
        }
    }
};
exports.Alibaba1688Controller = Alibaba1688Controller;
__decorate([
    (0, common_1.Get)('config'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Alibaba1688Controller.prototype, "getConfig", null);
__decorate([
    (0, common_1.Post)('config'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], Alibaba1688Controller.prototype, "saveConfig", null);
__decorate([
    (0, common_1.Post)('config/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], Alibaba1688Controller.prototype, "updateConfig", null);
__decorate([
    (0, common_1.Post)('toggle'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], Alibaba1688Controller.prototype, "toggleDropship", null);
__decorate([
    (0, common_1.Get)('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Alibaba1688Controller.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)('orders'),
    __param(0, (0, common_1.Query)('banquetId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], Alibaba1688Controller.prototype, "getOrders", null);
__decorate([
    (0, common_1.Get)('orders/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], Alibaba1688Controller.prototype, "getOrderById", null);
__decorate([
    (0, common_1.Post)('orders/:id/sync-logistics'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], Alibaba1688Controller.prototype, "syncLogistics", null);
__decorate([
    (0, common_1.Post)('sync-all-logistics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Alibaba1688Controller.prototype, "syncAllLogistics", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, common_1.Query)('banquetId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], Alibaba1688Controller.prototype, "getStats", null);
exports.Alibaba1688Controller = Alibaba1688Controller = Alibaba1688Controller_1 = __decorate([
    (0, common_1.Controller)('alibaba-1688'),
    __metadata("design:paramtypes", [alibaba_1688_service_1.Alibaba1688Service])
], Alibaba1688Controller);
//# sourceMappingURL=alibaba-1688.controller.js.map