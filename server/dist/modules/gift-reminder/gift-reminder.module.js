"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GiftReminderModule = void 0;
const common_1 = require("@nestjs/common");
const gift_reminder_controller_1 = require("./gift-reminder.controller");
const gift_reminder_service_1 = require("./gift-reminder.service");
const wechat_subscribe_module_1 = require("../wechat-subscribe/wechat-subscribe.module");
let GiftReminderModule = class GiftReminderModule {
};
exports.GiftReminderModule = GiftReminderModule;
exports.GiftReminderModule = GiftReminderModule = __decorate([
    (0, common_1.Module)({
        imports: [(0, common_1.forwardRef)(() => wechat_subscribe_module_1.WechatSubscribeModule)],
        controllers: [gift_reminder_controller_1.GiftReminderController],
        providers: [gift_reminder_service_1.GiftReminderService],
        exports: [gift_reminder_service_1.GiftReminderService],
    })
], GiftReminderModule);
//# sourceMappingURL=gift-reminder.module.js.map