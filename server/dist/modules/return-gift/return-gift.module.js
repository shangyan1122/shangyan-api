"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReturnGiftModule = void 0;
const common_1 = require("@nestjs/common");
const return_gift_controller_1 = require("./return-gift.controller");
const return_gift_service_1 = require("./return-gift.service");
const wechat_pay_module_1 = require("../wechat-pay/wechat-pay.module");
const wechat_subscribe_module_1 = require("../wechat-subscribe/wechat-subscribe.module");
let ReturnGiftModule = class ReturnGiftModule {
};
exports.ReturnGiftModule = ReturnGiftModule;
exports.ReturnGiftModule = ReturnGiftModule = __decorate([
    (0, common_1.Module)({
        imports: [wechat_pay_module_1.WechatPayModule, wechat_subscribe_module_1.WechatSubscribeModule],
        controllers: [return_gift_controller_1.ReturnGiftController],
        providers: [return_gift_service_1.ReturnGiftService],
        exports: [return_gift_service_1.ReturnGiftService],
    })
], ReturnGiftModule);
//# sourceMappingURL=return-gift.module.js.map