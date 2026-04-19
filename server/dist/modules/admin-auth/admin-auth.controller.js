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
var AdminAuthController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAuthController = void 0;
const common_1 = require("@nestjs/common");
const admin_auth_service_1 = require("./admin-auth.service");
let AdminAuthController = AdminAuthController_1 = class AdminAuthController {
    constructor(adminAuthService) {
        this.adminAuthService = adminAuthService;
        this.logger = new common_1.Logger(AdminAuthController_1.name);
    }
    async sendCode(body) {
        const { phone } = body;
        if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
            return { code: 400, msg: '请输入正确的手机号', data: null };
        }
        return this.adminAuthService.sendLoginCode(phone);
    }
    async login(body) {
        const { phone, code } = body;
        if (!phone || !code) {
            return { code: 400, msg: '请输入手机号和验证码', data: null };
        }
        if (!/^1[3-9]\d{9}$/.test(phone)) {
            return { code: 400, msg: '手机号格式不正确', data: null };
        }
        if (code.length !== 6) {
            return { code: 400, msg: '验证码为6位数字', data: null };
        }
        return this.adminAuthService.login(phone, code);
    }
    async getProfile(auth) {
        if (!auth || !auth.startsWith('Bearer ')) {
            return { code: 401, msg: '未授权', data: null };
        }
        const token = auth.substring(7);
        const decoded = this.adminAuthService.verifyToken(token);
        if (!decoded) {
            return { code: 401, msg: 'Token无效', data: null };
        }
        return this.adminAuthService.getProfile(decoded.id);
    }
};
exports.AdminAuthController = AdminAuthController;
__decorate([
    (0, common_1.Post)('send-code'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "sendCode", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "login", null);
__decorate([
    (0, common_1.Get)('profile'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "getProfile", null);
exports.AdminAuthController = AdminAuthController = AdminAuthController_1 = __decorate([
    (0, common_1.Controller)('admin/auth'),
    __metadata("design:paramtypes", [admin_auth_service_1.AdminAuthService])
], AdminAuthController);
//# sourceMappingURL=admin-auth.controller.js.map