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
var WithdrawController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawController = void 0;
const common_1 = require("@nestjs/common");
const withdraw_service_1 = require("./withdraw.service");
const auth_guard_1 = require("../../common/guards/auth.guard");
let WithdrawController = WithdrawController_1 = class WithdrawController {
    constructor(withdrawService) {
        this.withdrawService = withdrawService;
        this.logger = new common_1.Logger(WithdrawController_1.name);
    }
    async getBalance(req) {
        const openid = req.user?.openid;
        if (!openid) {
            return {
                code: 401,
                msg: '请先登录',
                data: null,
            };
        }
        this.logger.log(`查询余额: openid=${openid}`);
        const balance = await this.withdrawService.getAvailableBalance(openid);
        return {
            code: 200,
            msg: 'success',
            data: {
                balance,
                balanceYuan: (balance / 100).toFixed(2),
            },
        };
    }
    async applyWithdraw(body, req) {
        const openid = req.user?.openid;
        if (!openid) {
            return {
                code: 401,
                msg: '请先登录',
                data: null,
            };
        }
        const { amount } = body;
        if (!amount || amount <= 0) {
            return {
                code: 400,
                msg: '提现金额必须大于0',
                data: null,
            };
        }
        const amountInCents = Math.floor(amount * 100);
        if (amountInCents < 10000) {
            return {
                code: 400,
                msg: '最低提现金额为100元',
                data: null,
            };
        }
        if (amountInCents > 2000000) {
            return {
                code: 400,
                msg: '单次提现金额不能超过20000元',
                data: null,
            };
        }
        this.logger.log(`申请提现: openid=${openid}, amount=${amountInCents}分`);
        const result = await this.withdrawService.applyWithdraw(openid, amountInCents);
        if (result.success) {
            return {
                code: 200,
                msg: '提现申请成功',
                data: { withdrawId: result.withdrawId },
            };
        }
        else {
            return {
                code: 400,
                msg: result.errorMsg || '提现失败',
                data: null,
            };
        }
    }
    async getRecords(page = '1', pageSize = '20', req) {
        const openid = req.user?.openid;
        if (!openid) {
            return {
                code: 401,
                msg: '请先登录',
                data: null,
            };
        }
        const result = await this.withdrawService.getWithdrawRecords(openid, parseInt(page), parseInt(pageSize));
        return {
            code: 200,
            msg: 'success',
            data: result,
        };
    }
    async getDetail(id, req) {
        const openid = req.user?.openid;
        if (!openid) {
            return {
                code: 401,
                msg: '请先登录',
                data: null,
            };
        }
        const detail = await this.withdrawService.getWithdrawDetail(id);
        if (!detail) {
            return {
                code: 404,
                msg: '提现记录不存在',
                data: null,
            };
        }
        if (detail.host_openid !== openid) {
            return {
                code: 403,
                msg: '无权查看此提现记录',
                data: null,
            };
        }
        return {
            code: 200,
            msg: 'success',
            data: detail,
        };
    }
};
exports.WithdrawController = WithdrawController;
__decorate([
    (0, common_1.Get)('balance'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WithdrawController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Post)('apply'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WithdrawController.prototype, "applyWithdraw", null);
__decorate([
    (0, common_1.Get)('records'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('pageSize')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], WithdrawController.prototype, "getRecords", null);
__decorate([
    (0, common_1.Get)('detail'),
    __param(0, (0, common_1.Query)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WithdrawController.prototype, "getDetail", null);
exports.WithdrawController = WithdrawController = WithdrawController_1 = __decorate([
    (0, common_1.Controller)('withdraw'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [withdraw_service_1.WithdrawService])
], WithdrawController);
//# sourceMappingURL=withdraw.controller.js.map