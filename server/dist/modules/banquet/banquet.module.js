"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BanquetModule = void 0;
const common_1 = require("@nestjs/common");
const banquet_controller_1 = require("./banquet.controller");
const banquet_service_1 = require("./banquet.service");
const ai_service_1 = require("../ai/ai.service");
const gift_reminder_module_1 = require("../gift-reminder/gift-reminder.module");
const gift_reminder_service_1 = require("../gift-reminder/gift-reminder.service");
const wechat_subscribe_module_1 = require("../wechat-subscribe/wechat-subscribe.module");
const wechat_config_service_1 = require("../../common/services/wechat-config.service");
let BanquetModule = class BanquetModule {
};
exports.BanquetModule = BanquetModule;
exports.BanquetModule = BanquetModule = __decorate([
    (0, common_1.Module)({
        imports: [(0, common_1.forwardRef)(() => gift_reminder_module_1.GiftReminderModule), (0, common_1.forwardRef)(() => wechat_subscribe_module_1.WechatSubscribeModule)],
        controllers: [banquet_controller_1.BanquetController],
        providers: [banquet_service_1.BanquetService, ai_service_1.AiService, wechat_config_service_1.WechatConfigService, gift_reminder_service_1.GiftReminderService],
        exports: [banquet_service_1.BanquetService],
    })
], BanquetModule);
//# sourceMappingURL=banquet.module.js.map