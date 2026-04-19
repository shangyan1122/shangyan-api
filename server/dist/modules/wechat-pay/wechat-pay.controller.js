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
var WechatPayController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WechatPayController = void 0;
const common_1 = require("@nestjs/common");
const wechat_pay_service_1 = require("./wechat-pay.service");
const member_service_1 = require("../member/member.service");
let WechatPayController = WechatPayController_1 = class WechatPayController {
    constructor(wechatPayService, memberService) {
        this.wechatPayService = wechatPayService;
        this.memberService = memberService;
        this.logger = new common_1.Logger(WechatPayController_1.name);
    }
    async createOrder(body) {
        this.logger.log(`创建支付订单: ${body.orderId}`);
        const result = await this.wechatPayService.createJsapiOrder(body);
        if (result.success) {
            return {
                code: 200,
                msg: '订单创建成功',
                data: result.data,
            };
        }
        return {
            code: 400,
            msg: result.message,
            data: null,
        };
    }
    async queryOrder(body) {
        this.logger.log(`查询订单: ${body.orderId}`);
        const result = await this.wechatPayService.queryOrder(body.orderId);
        if (result.success) {
            return {
                code: 200,
                msg: 'success',
                data: result.data,
            };
        }
        return {
            code: 400,
            msg: result.message,
            data: null,
        };
    }
    async refund(body) {
        this.logger.log(`申请退款: ${body.orderId}`);
        const result = await this.wechatPayService.refund(body);
        if (result.success) {
            return {
                code: 200,
                msg: '退款申请成功',
                data: result.data,
            };
        }
        return {
            code: 400,
            msg: result.message,
            data: null,
        };
    }
    async handleNotify(headers, req) {
        this.logger.log('收到支付回调通知');
        const body = req.body;
        const isValid = this.wechatPayService.verifyNotify(headers, JSON.stringify(body));
        if (!isValid) {
            this.logger.error('支付回调签名验证失败');
            return { code: 'FAIL', message: '签名验证失败' };
        }
        const decryptData = this.wechatPayService.decryptNotify(body.resource);
        if (!decryptData) {
            this.logger.error('解密回调数据失败');
            return { code: 'FAIL', message: '解密失败' };
        }
        this.logger.log('支付成功:', JSON.stringify(decryptData));
        try {
            const { out_trade_no, transaction_id } = decryptData;
            await this.memberService.handlePaymentSuccess(out_trade_no);
            return { code: 'SUCCESS', message: '成功' };
        }
        catch (error) {
            this.logger.error('处理支付回调失败:', error);
            return { code: 'FAIL', message: '处理失败' };
        }
    }
};
exports.WechatPayController = WechatPayController;
__decorate([
    (0, common_1.Post)('create'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WechatPayController.prototype, "createOrder", null);
__decorate([
    (0, common_1.Post)('query'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WechatPayController.prototype, "queryOrder", null);
__decorate([
    (0, common_1.Post)('refund'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WechatPayController.prototype, "refund", null);
__decorate([
    (0, common_1.Post)('notify'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WechatPayController.prototype, "handleNotify", null);
exports.WechatPayController = WechatPayController = WechatPayController_1 = __decorate([
    (0, common_1.Controller)('wechat-pay'),
    __metadata("design:paramtypes", [wechat_pay_service_1.WechatPayService,
        member_service_1.MemberService])
], WechatPayController);
//# sourceMappingURL=wechat-pay.controller.js.map