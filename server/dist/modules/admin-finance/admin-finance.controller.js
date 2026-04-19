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
var AdminFinanceController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminFinanceController = void 0;
const common_1 = require("@nestjs/common");
const admin_finance_service_1 = require("./admin-finance.service");
let AdminFinanceController = AdminFinanceController_1 = class AdminFinanceController {
    constructor(adminFinanceService) {
        this.adminFinanceService = adminFinanceService;
        this.logger = new common_1.Logger(AdminFinanceController_1.name);
    }
    async getStats() {
        return this.adminFinanceService.getStats();
    }
    async getTransactions(page, pageSize, type, category, startDate, endDate) {
        return this.adminFinanceService.getTransactions({
            page: page ? parseInt(page) : 1,
            pageSize: pageSize ? parseInt(pageSize) : 10,
            type,
            category,
            startDate,
            endDate,
        });
    }
    async approveWithdraw(id) {
        this.logger.log(`审核通过提现: recordId=${id}`);
        return this.adminFinanceService.approveWithdraw(id);
    }
    async rejectWithdraw(id) {
        this.logger.log(`拒绝提现: recordId=${id}`);
        return this.adminFinanceService.rejectWithdraw(id);
    }
};
exports.AdminFinanceController = AdminFinanceController;
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminFinanceController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('transactions'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('pageSize')),
    __param(2, (0, common_1.Query)('type')),
    __param(3, (0, common_1.Query)('category')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminFinanceController.prototype, "getTransactions", null);
__decorate([
    (0, common_1.Post)('withdraw/:id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminFinanceController.prototype, "approveWithdraw", null);
__decorate([
    (0, common_1.Post)('withdraw/:id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminFinanceController.prototype, "rejectWithdraw", null);
exports.AdminFinanceController = AdminFinanceController = AdminFinanceController_1 = __decorate([
    (0, common_1.Controller)('admin/finance'),
    __metadata("design:paramtypes", [admin_finance_service_1.AdminFinanceService])
], AdminFinanceController);
//# sourceMappingURL=admin-finance.controller.js.map