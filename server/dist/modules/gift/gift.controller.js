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
exports.GiftController = void 0;
const common_1 = require("@nestjs/common");
const gift_service_1 = require("./gift.service");
const referral_service_1 = require("../referral/referral.service");
const auth_guard_1 = require("../../common/guards/auth.guard");
let GiftController = class GiftController {
    constructor(giftService, referralService) {
        this.giftService = giftService;
        this.referralService = referralService;
    }
    async checkGuest(body) {
        const exists = await this.giftService.checkGuestExists(body.banquetId, body.guestOpenid);
        return {
            code: 200,
            message: 'success',
            data: { exists },
        };
    }
    async createGiftRecord(body) {
        const exists = await this.giftService.checkGuestExists(body.banquetId, body.guestOpenid);
        if (exists) {
            return {
                code: 400,
                message: '您已经随礼过了',
                data: null,
            };
        }
        const data = await this.giftService.createGiftRecord({
            banquet_id: body.banquetId,
            guest_openid: body.guestOpenid,
            guest_name: body.guestName,
            amount: body.amount,
            blessing: body.blessing,
            payment_status: 'pending',
        });
        try {
            const banquet = await this.giftService.getBanquetInfo(body.banquetId);
            if (banquet && banquet.host_openid !== body.guestOpenid) {
                await this.referralService.bindOnGift(body.guestOpenid, banquet.host_openid, body.banquetId);
            }
        }
        catch (error) {
            console.error('绑定上下级关系失败:', error);
        }
        return {
            code: 200,
            message: 'success',
            data: data,
        };
    }
    async supplementGiftRecord(body, req) {
        const hostOpenid = req.user?.openid;
        if (!hostOpenid) {
            return {
                code: 401,
                message: '请先登录',
                data: null,
            };
        }
        try {
            const isHost = await this.giftService.verifyHostPermission(body.banquetId, hostOpenid);
            if (!isHost) {
                return {
                    code: 403,
                    message: '无权限补录，只有宴会主办方可以补录',
                    data: null,
                };
            }
            const data = await this.giftService.supplementGiftRecord({
                banquet_id: body.banquetId,
                guest_name: body.guestName,
                guest_phone: body.guestPhone,
                amount: body.amount,
                blessing: body.blessing,
                gift_time: body.giftTime,
                is_supplement: true,
                payment_status: 'completed',
                guest_openid: `supplement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            });
            return {
                code: 200,
                message: '补录成功',
                data: data,
            };
        }
        catch (error) {
            return {
                code: 500,
                message: error.message || '补录失败',
                data: null,
            };
        }
    }
    async batchSupplementGiftRecords(body) {
        try {
            const isHost = await this.giftService.verifyHostPermission(body.banquetId, body.hostOpenid);
            if (!isHost) {
                return {
                    code: 403,
                    message: '无权限补录，只有宴会主办方可以补录',
                    data: null,
                };
            }
            const results = await this.giftService.batchSupplementGiftRecords(body.banquetId, body.records);
            return {
                code: 200,
                message: `成功补录 ${results.success} 条，失败 ${results.failed} 条`,
                data: {
                    success: results.success,
                    failed: results.failed,
                    records: results.records,
                },
            };
        }
        catch (error) {
            return {
                code: 500,
                message: error.message || '批量补录失败',
                data: null,
            };
        }
    }
    async getSupplementRecords(body) {
        try {
            const isHost = await this.giftService.verifyHostPermission(body.banquetId, body.hostOpenid);
            if (!isHost) {
                return {
                    code: 403,
                    message: '无权限查看',
                    data: null,
                };
            }
            const records = await this.giftService.getSupplementRecords(body.banquetId);
            return {
                code: 200,
                message: 'success',
                data: { records },
            };
        }
        catch (error) {
            return {
                code: 500,
                message: error.message || '获取失败',
                data: null,
            };
        }
    }
    async deleteSupplementRecord(body) {
        try {
            const result = await this.giftService.deleteSupplementRecord(body.id, body.hostOpenid);
            return {
                code: 200,
                message: '删除成功',
                data: result,
            };
        }
        catch (error) {
            return {
                code: 500,
                message: error.message || '删除失败',
                data: null,
            };
        }
    }
};
exports.GiftController = GiftController;
__decorate([
    (0, common_1.Post)('check'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GiftController.prototype, "checkGuest", null);
__decorate([
    (0, common_1.Post)('create'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GiftController.prototype, "createGiftRecord", null);
__decorate([
    (0, common_1.Post)('supplement'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GiftController.prototype, "supplementGiftRecord", null);
__decorate([
    (0, common_1.Post)('supplement/batch'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GiftController.prototype, "batchSupplementGiftRecords", null);
__decorate([
    (0, common_1.Post)('supplement/list'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GiftController.prototype, "getSupplementRecords", null);
__decorate([
    (0, common_1.Post)('supplement/delete'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GiftController.prototype, "deleteSupplementRecord", null);
exports.GiftController = GiftController = __decorate([
    (0, common_1.Controller)('gifts'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [gift_service_1.GiftService,
        referral_service_1.ReferralService])
], GiftController);
//# sourceMappingURL=gift.controller.js.map