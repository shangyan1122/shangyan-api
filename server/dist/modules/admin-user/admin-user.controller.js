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
var AdminUserController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminUserController = void 0;
const common_1 = require("@nestjs/common");
const admin_user_service_1 = require("./admin-user.service");
let AdminUserController = AdminUserController_1 = class AdminUserController {
    constructor(adminUserService) {
        this.adminUserService = adminUserService;
        this.logger = new common_1.Logger(AdminUserController_1.name);
    }
    async getUsers(page, pageSize, isVip, search) {
        return this.adminUserService.getUsers({
            page: page ? parseInt(page) : 1,
            pageSize: pageSize ? parseInt(pageSize) : 10,
            isVip: isVip === 'true' ? true : isVip === 'false' ? false : undefined,
            search,
        });
    }
    async getUserDetail(id) {
        return this.adminUserService.getUserDetail(id);
    }
    async setVipStatus(id, body) {
        this.logger.log(`设置VIP: userId=${id}, isVip=${body.isVip}`);
        return this.adminUserService.setVipStatus(id, body.isVip, body.expireDays);
    }
};
exports.AdminUserController = AdminUserController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('pageSize')),
    __param(2, (0, common_1.Query)('isVip')),
    __param(3, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminUserController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminUserController.prototype, "getUserDetail", null);
__decorate([
    (0, common_1.Post)(':id/vip'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminUserController.prototype, "setVipStatus", null);
exports.AdminUserController = AdminUserController = AdminUserController_1 = __decorate([
    (0, common_1.Controller)('admin/users'),
    __metadata("design:paramtypes", [admin_user_service_1.AdminUserService])
], AdminUserController);
//# sourceMappingURL=admin-user.controller.js.map