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
var BanquetController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BanquetController = void 0;
const common_1 = require("@nestjs/common");
const banquet_service_1 = require("./banquet.service");
const gift_reminder_service_1 = require("../gift-reminder/gift-reminder.service");
const auth_guard_1 = require("../../common/guards/auth.guard");
let BanquetController = BanquetController_1 = class BanquetController {
    constructor(banquetService, giftReminderService) {
        this.banquetService = banquetService;
        this.giftReminderService = giftReminderService;
        this.logger = new common_1.Logger(BanquetController_1.name);
    }
    async getBanquets(status, req) {
        const hostOpenid = req.user?.openid;
        if (!hostOpenid) {
            return {
                code: 401,
                msg: '请先登录',
                data: [],
            };
        }
        this.logger.log(`获取宴会列表: openid=${hostOpenid}, status=${status}`);
        try {
            const data = await this.banquetService.getBanquets(hostOpenid, status);
            return {
                code: 200,
                msg: 'success',
                data: data.map((item) => ({
                    ...item,
                    guestCount: item.guestCount || 0,
                    totalAmount: item.totalAmount || 0,
                })),
            };
        }
        catch (error) {
            this.logger.error(`获取宴会列表失败: ${error.message}`);
            return {
                code: 500,
                msg: '获取宴会列表失败',
                data: [],
            };
        }
    }
    async getBanquetById(id, req) {
        this.logger.log(`获取宴会详情: id=${id}`);
        try {
            const data = await this.banquetService.getBanquetById(id);
            if (!data) {
                return {
                    code: 404,
                    msg: '宴会不存在',
                    data: null,
                };
            }
            return {
                code: 200,
                msg: 'success',
                data: data,
            };
        }
        catch (error) {
            this.logger.error(`获取宴会详情失败: ${error.message}`);
            return {
                code: 500,
                msg: '获取宴会详情失败',
                data: null,
            };
        }
    }
    async getBanquetQrcode(id, req) {
        this.logger.log(`获取宴会二维码: id=${id}`);
        try {
            const qrcodeData = await this.banquetService.getBanquetQrcode(id);
            return {
                code: 200,
                msg: 'success',
                data: qrcodeData,
            };
        }
        catch (error) {
            this.logger.error(`获取二维码失败: ${error.message}`);
            return {
                code: 500,
                msg: '获取二维码失败',
                data: null,
            };
        }
    }
    async createBanquet(body, req) {
        const hostOpenid = body.openid || req.headers['x-wx-openid'] || req.user?.openid || 'test_openid_123';
        this.logger.log(`创建宴会: openid=${hostOpenid}, type=${body.type}, name=${body.name}`);
        if (!body.type || !body.name || !body.event_time || !body.location) {
            return {
                code: 400,
                msg: '请填写完整的宴会信息',
                data: null,
            };
        }
        const validTypes = ['婚宴', '回门', '生日', '寿宴', '升学', '乔迁', '满月', '开锁'];
        if (!validTypes.includes(body.type)) {
            return {
                code: 400,
                msg: '宴会类型无效',
                data: null,
            };
        }
        try {
            const banquetData = {
                ...body,
                host_openid: hostOpenid,
                eventTime: body.event_time,
                returnRedPacket: body.return_red_packet || 0,
                returnGiftIds: body.return_gift_ids || [],
            };
            const data = await this.banquetService.createBanquet(banquetData);
            this.logger.log(`宴会创建成功: id=${data.id}`);
            this.giftReminderService
                .sendReminders(data.id, hostOpenid)
                .catch((err) => this.logger.error('发送人情提醒失败:', err));
            return {
                code: 200,
                msg: '创建成功',
                data: data,
            };
        }
        catch (error) {
            this.logger.error(`创建宴会失败: ${error.message}`);
            return {
                code: 500,
                msg: '创建宴会失败',
                data: null,
            };
        }
    }
    async updateBanquet(id, body, req) {
        const hostOpenid = req.user?.openid || 'test_openid_123';
        this.logger.log(`更新宴会: id=${id}, openid=${hostOpenid}`);
        try {
            const banquet = await this.banquetService.getBanquetById(id);
            if (!banquet) {
                return {
                    code: 404,
                    msg: '宴会不存在',
                    data: null,
                };
            }
            if (banquet.host_openid !== hostOpenid) {
                return {
                    code: 403,
                    msg: '无权限操作',
                    data: null,
                };
            }
            await this.banquetService.updateBanquet(id, body);
            return {
                code: 200,
                msg: '更新成功',
                data: null,
            };
        }
        catch (error) {
            this.logger.error(`更新宴会失败: ${error.message}`);
            return {
                code: 500,
                msg: '更新宴会失败',
                data: null,
            };
        }
    }
    async deleteBanquet(id, req) {
        const hostOpenid = req.user?.openid || 'test_openid_123';
        this.logger.log(`删除宴会: id=${id}, openid=${hostOpenid}`);
        try {
            const banquet = await this.banquetService.getBanquetById(id);
            if (!banquet) {
                return {
                    code: 404,
                    msg: '宴会不存在',
                    data: null,
                };
            }
            if (banquet.host_openid !== hostOpenid) {
                return {
                    code: 403,
                    msg: '无权限操作',
                    data: null,
                };
            }
            if (banquet.status !== 'draft') {
                return {
                    code: 400,
                    msg: '只能删除草稿状态的宴会',
                    data: null,
                };
            }
            await this.banquetService.deleteBanquet(id);
            return {
                code: 200,
                msg: '删除成功',
                data: null,
            };
        }
        catch (error) {
            this.logger.error(`删除宴会失败: ${error.message}`);
            return {
                code: 500,
                msg: '删除宴会失败',
                data: null,
            };
        }
    }
};
exports.BanquetController = BanquetController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BanquetController.prototype, "getBanquets", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BanquetController.prototype, "getBanquetById", null);
__decorate([
    (0, common_1.Get)(':id/qrcode'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BanquetController.prototype, "getBanquetQrcode", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BanquetController.prototype, "createBanquet", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], BanquetController.prototype, "updateBanquet", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BanquetController.prototype, "deleteBanquet", null);
exports.BanquetController = BanquetController = BanquetController_1 = __decorate([
    (0, common_1.Controller)('banquets'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [banquet_service_1.BanquetService,
        gift_reminder_service_1.GiftReminderService])
], BanquetController);
//# sourceMappingURL=banquet.controller.js.map