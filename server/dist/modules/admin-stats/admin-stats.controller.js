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
exports.AdminStatsController = void 0;
const common_1 = require("@nestjs/common");
const admin_stats_service_1 = require("./admin-stats.service");
let AdminStatsController = class AdminStatsController {
    constructor(adminStatsService) {
        this.adminStatsService = adminStatsService;
    }
    async getStats(startDate, endDate) {
        return this.adminStatsService.getStats({ startDate, endDate });
    }
    async getGiftRankings() {
        return this.adminStatsService.getGiftRankings();
    }
    async getBanquetRankings() {
        return this.adminStatsService.getBanquetRankings();
    }
    async getSalesRankings() {
        return this.adminStatsService.getSalesRankings();
    }
    async getDailyTrend() {
        return this.adminStatsService.getDailyTrend();
    }
};
exports.AdminStatsController = AdminStatsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminStatsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('gift-rankings'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminStatsController.prototype, "getGiftRankings", null);
__decorate([
    (0, common_1.Get)('banquet-rankings'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminStatsController.prototype, "getBanquetRankings", null);
__decorate([
    (0, common_1.Get)('sales-rankings'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminStatsController.prototype, "getSalesRankings", null);
__decorate([
    (0, common_1.Get)('daily-trend'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminStatsController.prototype, "getDailyTrend", null);
exports.AdminStatsController = AdminStatsController = __decorate([
    (0, common_1.Controller)('admin/stats'),
    __metadata("design:paramtypes", [admin_stats_service_1.AdminStatsService])
], AdminStatsController);
//# sourceMappingURL=admin-stats.controller.js.map