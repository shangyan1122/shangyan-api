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
exports.PartnerController = void 0;
const common_1 = require("@nestjs/common");
const partner_service_1 = require("./partner.service");
let PartnerController = class PartnerController {
    constructor(partnerService) {
        this.partnerService = partnerService;
    }
    async apply(body) {
        const { companyName, contactName, phone, email, businessType, description } = body;
        if (!companyName || !contactName || !phone) {
            return {
                code: 400,
                msg: '请填写完整信息',
                data: null,
            };
        }
        if (!/^1[3-9]\d{9}$/.test(phone)) {
            return {
                code: 400,
                msg: '请输入正确的手机号',
                data: null,
            };
        }
        const exists = await this.partnerService.checkPhoneExists(phone);
        if (exists) {
            return {
                code: 400,
                msg: '该手机号已提交过申请',
                data: null,
            };
        }
        try {
            const application = await this.partnerService.submitApplication({
                companyName,
                contactName,
                phone,
                email,
                businessType,
                description,
            });
            return {
                code: 200,
                msg: '提交成功',
                data: {
                    id: application.id,
                    status: application.status,
                },
            };
        }
        catch (error) {
            return {
                code: 500,
                msg: '提交失败，请稍后重试',
                data: null,
            };
        }
    }
    async getStatus(id) {
        const application = await this.partnerService.getApplicationById(id);
        if (!application) {
            return {
                code: 404,
                msg: '申请不存在',
                data: null,
            };
        }
        return {
            code: 200,
            msg: 'success',
            data: {
                id: application.id,
                companyName: application.company_name,
                status: application.status,
                createdAt: application.created_at,
                reviewedAt: application.reviewed_at,
                reviewerNote: application.reviewer_note,
            },
        };
    }
    async getList(page = '1', pageSize = '20', status) {
        const result = await this.partnerService.getApplications(parseInt(page), parseInt(pageSize), status);
        return {
            code: 200,
            msg: 'success',
            data: result,
        };
    }
    async review(body) {
        const { id, status, note } = body;
        if (!id || !status) {
            return {
                code: 400,
                msg: '参数错误',
                data: null,
            };
        }
        try {
            const application = await this.partnerService.reviewApplication(id, status, note);
            return {
                code: 200,
                msg: '审核成功',
                data: {
                    id: application.id,
                    status: application.status,
                },
            };
        }
        catch (error) {
            return {
                code: 500,
                msg: '审核失败',
                data: null,
            };
        }
    }
};
exports.PartnerController = PartnerController;
__decorate([
    (0, common_1.Post)('apply'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "apply", null);
__decorate([
    (0, common_1.Get)('status/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)('list'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('pageSize')),
    __param(2, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "getList", null);
__decorate([
    (0, common_1.Post)('review'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PartnerController.prototype, "review", null);
exports.PartnerController = PartnerController = __decorate([
    (0, common_1.Controller)('partner'),
    __metadata("design:paramtypes", [partner_service_1.PartnerService])
], PartnerController);
//# sourceMappingURL=partner.controller.js.map