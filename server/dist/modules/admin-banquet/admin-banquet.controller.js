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
var AdminBanquetController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminBanquetController = void 0;
const common_1 = require("@nestjs/common");
const admin_banquet_service_1 = require("./admin-banquet.service");
let AdminBanquetController = AdminBanquetController_1 = class AdminBanquetController {
    constructor(adminBanquetService) {
        this.adminBanquetService = adminBanquetService;
        this.logger = new common_1.Logger(AdminBanquetController_1.name);
    }
    async getBanquets(page, pageSize, type, status, search) {
        return this.adminBanquetService.getBanquets({
            page: page ? parseInt(page) : 1,
            pageSize: pageSize ? parseInt(pageSize) : 10,
            type,
            status,
            search,
        });
    }
    async getBanquetDetail(id) {
        return this.adminBanquetService.getBanquetDetail(id);
    }
    async deleteBanquet(id) {
        this.logger.log(`删除宴会: banquetId=${id}`);
        return this.adminBanquetService.deleteBanquet(id);
    }
};
exports.AdminBanquetController = AdminBanquetController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('pageSize')),
    __param(2, (0, common_1.Query)('type')),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminBanquetController.prototype, "getBanquets", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminBanquetController.prototype, "getBanquetDetail", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminBanquetController.prototype, "deleteBanquet", null);
exports.AdminBanquetController = AdminBanquetController = AdminBanquetController_1 = __decorate([
    (0, common_1.Controller)('admin/banquets'),
    __metadata("design:paramtypes", [admin_banquet_service_1.AdminBanquetService])
], AdminBanquetController);
//# sourceMappingURL=admin-banquet.controller.js.map