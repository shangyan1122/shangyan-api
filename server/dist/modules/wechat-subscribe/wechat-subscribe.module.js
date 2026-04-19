"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WechatSubscribeModule = void 0;
const common_1 = require("@nestjs/common");
const wechat_subscribe_controller_1 = require("./wechat-subscribe.controller");
const wechat_subscribe_service_1 = require("./wechat-subscribe.service");
let WechatSubscribeModule = class WechatSubscribeModule {
};
exports.WechatSubscribeModule = WechatSubscribeModule;
exports.WechatSubscribeModule = WechatSubscribeModule = __decorate([
    (0, common_1.Module)({
        controllers: [wechat_subscribe_controller_1.WechatSubscribeController],
        providers: [wechat_subscribe_service_1.WechatSubscribeService],
        exports: [wechat_subscribe_service_1.WechatSubscribeService],
    })
], WechatSubscribeModule);
//# sourceMappingURL=wechat-subscribe.module.js.map