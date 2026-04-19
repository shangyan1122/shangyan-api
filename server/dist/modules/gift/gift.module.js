"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GiftModule = void 0;
const common_1 = require("@nestjs/common");
const gift_controller_1 = require("./gift.controller");
const gift_service_1 = require("./gift.service");
const referral_module_1 = require("../referral/referral.module");
let GiftModule = class GiftModule {
};
exports.GiftModule = GiftModule;
exports.GiftModule = GiftModule = __decorate([
    (0, common_1.Module)({
        imports: [referral_module_1.ReferralModule],
        controllers: [gift_controller_1.GiftController],
        providers: [gift_service_1.GiftService],
    })
], GiftModule);
//# sourceMappingURL=gift.module.js.map