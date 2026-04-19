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
var UserController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const common_1 = require("@nestjs/common");
const user_service_1 = require("./user.service");
let UserController = UserController_1 = class UserController {
    constructor(userService) {
        this.userService = userService;
        this.logger = new common_1.Logger(UserController_1.name);
    }
    async getUserStats(req) {
        const openid = req.user?.openid || 'test_openid_123';
        this.logger.log(`获取用户统计: openid=${openid}`);
        try {
            const stats = await this.userService.getUserStats(openid);
            return {
                code: 200,
                message: 'success',
                data: {
                    totalBanquets: stats.totalBanquets || 0,
                    totalGifts: stats.totalGifts || 0,
                    totalAmount: stats.totalAmount || 0,
                },
            };
        }
        catch (error) {
            this.logger.error(`获取用户统计失败: ${error.message}`);
            return {
                code: 500,
                message: '获取统计数据失败',
                data: {
                    totalBanquets: 0,
                    totalGifts: 0,
                    totalAmount: 0,
                },
            };
        }
    }
    async getGiftLedger(page = '1', pageSize = '20', req) {
        const openid = req.user?.openid || 'test_openid_123';
        const pageNum = parseInt(page) || 1;
        const pageSizeNum = Math.min(parseInt(pageSize) || 20, 100);
        this.logger.log(`获取礼账: openid=${openid}, page=${pageNum}, pageSize=${pageSizeNum}`);
        try {
            const result = await this.userService.getGiftLedger(openid, pageNum, pageSizeNum);
            return {
                code: 200,
                message: 'success',
                data: result,
            };
        }
        catch (error) {
            this.logger.error(`获取礼账失败: ${error.message}`);
            return {
                code: 500,
                message: '获取礼账失败',
                data: {
                    records: [],
                    total: 0,
                    page: pageNum,
                    pageSize: pageSizeNum,
                },
            };
        }
    }
    async getMyGifts(req) {
        const openid = req.user?.openid || 'test_guest_openid';
        this.logger.log(`获取我的随礼记录: openid=${openid}`);
        try {
            const records = await this.userService.getGuestGifts(openid);
            return {
                code: 200,
                message: 'success',
                data: records,
            };
        }
        catch (error) {
            this.logger.error(`获取随礼记录失败: ${error.message}`);
            return {
                code: 500,
                message: '获取随礼记录失败',
                data: [],
            };
        }
    }
    async getMyBanquets(openid, req) {
        const userOpenid = openid || req.user?.openid || '';
        this.logger.log(`获取我参加的宴会: openid=${userOpenid}`);
        try {
            const banquets = await this.userService.getGuestBanquets(userOpenid);
            return {
                code: 200,
                message: 'success',
                data: banquets,
            };
        }
        catch (error) {
            this.logger.error(`获取宴会列表失败: ${error.message}`);
            return {
                code: 500,
                message: '获取宴会列表失败',
                data: [],
            };
        }
    }
    async getUserInfo(openid, req) {
        const userOpenid = openid || req.user?.openid;
        if (!userOpenid) {
            return {
                code: 401,
                message: '未登录',
                data: null,
            };
        }
        try {
            const userInfo = await this.userService.getUserInfo(userOpenid);
            return {
                code: 200,
                message: 'success',
                data: userInfo,
            };
        }
        catch (error) {
            this.logger.error(`获取用户信息失败: ${error.message}`);
            return {
                code: 500,
                message: '获取用户信息失败',
                data: null,
            };
        }
    }
    async updateUserInfo(body, req) {
        const openid = req.user?.openid;
        if (!openid) {
            return {
                code: 401,
                message: '未登录',
                data: null,
            };
        }
        const { nickname, avatar } = body;
        if (!nickname && !avatar) {
            return {
                code: 400,
                message: '没有需要更新的内容',
                data: null,
            };
        }
        try {
            await this.userService.updateUserInfo(openid, { nickname, avatar });
            return {
                code: 200,
                message: '更新成功',
                data: null,
            };
        }
        catch (error) {
            this.logger.error(`更新用户信息失败: ${error.message}`);
            return {
                code: 500,
                message: '更新失败',
                data: null,
            };
        }
    }
    async activateVip(body, req) {
        const openid = body.openid || req.user?.openid;
        if (!openid) {
            return {
                code: 401,
                message: '未登录',
                data: null,
            };
        }
        const months = body.months || 12;
        try {
            const result = await this.userService.activateVip(openid, months);
            return {
                code: result.code,
                message: result.msg,
                data: result.data,
            };
        }
        catch (error) {
            this.logger.error(`开通VIP失败: ${error.message}`);
            return {
                code: 500,
                message: '开通VIP失败',
                data: null,
            };
        }
    }
};
exports.UserController = UserController;
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getUserStats", null);
__decorate([
    (0, common_1.Get)('gift-ledger'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('pageSize')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getGiftLedger", null);
__decorate([
    (0, common_1.Get)('my-gifts'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getMyGifts", null);
__decorate([
    (0, common_1.Get)('my-banquets'),
    __param(0, (0, common_1.Query)('openid')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getMyBanquets", null);
__decorate([
    (0, common_1.Get)('info'),
    __param(0, (0, common_1.Query)('openid')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getUserInfo", null);
__decorate([
    (0, common_1.Post)('update'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updateUserInfo", null);
__decorate([
    (0, common_1.Post)('vip/activate'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "activateVip", null);
exports.UserController = UserController = UserController_1 = __decorate([
    (0, common_1.Controller)('user'),
    __metadata("design:paramtypes", [user_service_1.UserService])
], UserController);
//# sourceMappingURL=user.controller.js.map