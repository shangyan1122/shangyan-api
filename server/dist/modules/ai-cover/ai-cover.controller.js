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
var AICoverController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AICoverController = void 0;
const common_1 = require("@nestjs/common");
const ai_cover_service_1 = require("./ai-cover.service");
const common_2 = require("@nestjs/common");
let AICoverController = AICoverController_1 = class AICoverController {
    constructor(aiCoverService) {
        this.aiCoverService = aiCoverService;
        this.logger = new common_2.Logger(AICoverController_1.name);
    }
    async generateCover(body) {
        this.logger.log(`生成宴会封面: ${body.banquetName}`);
        try {
            const coverUrl = await this.aiCoverService.generateBanquetCover(body);
            return {
                code: 200,
                msg: '生成成功',
                data: { url: coverUrl },
            };
        }
        catch (error) {
            this.logger.error('生成宴会封面失败:', error);
            return {
                code: 500,
                msg: error.message || '生成失败',
                data: null,
            };
        }
    }
    async generateInvitation(body) {
        this.logger.log(`生成邀请函封面: ${body.banquetName}`);
        try {
            const coverUrl = await this.aiCoverService.generateInvitationCover(body);
            return {
                code: 200,
                msg: '生成成功',
                data: { url: coverUrl },
            };
        }
        catch (error) {
            this.logger.error('生成邀请函封面失败:', error);
            return {
                code: 500,
                msg: error.message || '生成失败',
                data: null,
            };
        }
    }
};
exports.AICoverController = AICoverController;
__decorate([
    (0, common_1.Post)('generate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AICoverController.prototype, "generateCover", null);
__decorate([
    (0, common_1.Post)('invitation'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AICoverController.prototype, "generateInvitation", null);
exports.AICoverController = AICoverController = AICoverController_1 = __decorate([
    (0, common_1.Controller)('ai-cover'),
    __metadata("design:paramtypes", [ai_cover_service_1.AICoverService])
], AICoverController);
//# sourceMappingURL=ai-cover.controller.js.map