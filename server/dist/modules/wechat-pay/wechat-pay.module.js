"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WechatPayModule = void 0;
const common_1 = require("@nestjs/common");
const wechat_pay_controller_1 = require("./wechat-pay.controller");
const wechat_pay_service_1 = require("./wechat-pay.service");
const member_module_1 = require("../member/member.module");
let WechatPayModule = class WechatPayModule {
};
exports.WechatPayModule = WechatPayModule;
exports.WechatPayModule = WechatPayModule = __decorate([
    (0, common_1.Module)({
        imports: [member_module_1.MemberModule],
        controllers: [wechat_pay_controller_1.WechatPayController],
        providers: [wechat_pay_service_1.WechatPayService],
        exports: [wechat_pay_service_1.WechatPayService],
    })
], WechatPayModule);
//# sourceMappingURL=wechat-pay.module.js.map