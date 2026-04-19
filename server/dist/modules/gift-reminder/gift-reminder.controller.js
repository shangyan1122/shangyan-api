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
var GiftReminderController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GiftReminderController = void 0;
const common_1 = require("@nestjs/common");
const gift_reminder_service_1 = require("./gift-reminder.service");
const common_2 = require("@nestjs/common");
let GiftReminderController = GiftReminderController_1 = class GiftReminderController {
    constructor(giftReminderService) {
        this.giftReminderService = giftReminderService;
        this.logger = new common_2.Logger(GiftReminderController_1.name);
    }
    async createReminder(body) {
        this.logger.log(`创建提醒: ${body.openid} - ${body.guestName}`);
        try {
            const reminder = await this.giftReminderService.createReminder(body);
            return {
                code: 200,
                msg: '创建成功',
                data: reminder,
            };
        }
        catch (error) {
            this.logger.error('创建提醒失败:', error);
            return {
                code: 500,
                msg: error.message || '创建失败',
                data: null,
            };
        }
    }
    async getReminders(openid) {
        this.logger.log(`获取提醒列表: ${openid}`);
        try {
            const reminders = await this.giftReminderService.getUserReminders(openid);
            return {
                code: 200,
                msg: 'success',
                data: reminders,
            };
        }
        catch (error) {
            this.logger.error('获取提醒列表失败:', error);
            return {
                code: 500,
                msg: '获取失败',
                data: [],
            };
        }
    }
    async updateReminder(body) {
        this.logger.log(`更新提醒: ${body.id}`);
        try {
            await this.giftReminderService.updateReminder(body);
            return {
                code: 200,
                msg: '更新成功',
                data: null,
            };
        }
        catch (error) {
            this.logger.error('更新提醒失败:', error);
            return {
                code: 500,
                msg: error.message || '更新失败',
                data: null,
            };
        }
    }
    async deleteReminder(body) {
        this.logger.log(`删除提醒: ${body.id}`);
        try {
            await this.giftReminderService.deleteReminder(body.id, body.openid);
            return {
                code: 200,
                msg: '删除成功',
                data: null,
            };
        }
        catch (error) {
            this.logger.error('删除提醒失败:', error);
            return {
                code: 500,
                msg: error.message || '删除失败',
                data: null,
            };
        }
    }
};
exports.GiftReminderController = GiftReminderController;
__decorate([
    (0, common_1.Post)('create'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GiftReminderController.prototype, "createReminder", null);
__decorate([
    (0, common_1.Get)('list'),
    __param(0, (0, common_1.Query)('openid')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GiftReminderController.prototype, "getReminders", null);
__decorate([
    (0, common_1.Put)('update'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GiftReminderController.prototype, "updateReminder", null);
__decorate([
    (0, common_1.Delete)('delete'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GiftReminderController.prototype, "deleteReminder", null);
exports.GiftReminderController = GiftReminderController = GiftReminderController_1 = __decorate([
    (0, common_1.Controller)('gift-reminder'),
    __metadata("design:paramtypes", [gift_reminder_service_1.GiftReminderService])
], GiftReminderController);
//# sourceMappingURL=gift-reminder.controller.js.map