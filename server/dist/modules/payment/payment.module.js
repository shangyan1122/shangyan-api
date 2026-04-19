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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const payment_controller_1 = require("./payment.controller");
const payment_service_1 = require("./payment.service");
const gift_service_1 = require("../gift/gift.service");
const referral_service_1 = require("../referral/referral.service");
const return_gift_module_1 = require("../return-gift/return-gift.module");
const profit_sharing_module_1 = require("../profit-sharing/profit-sharing.module");
const profit_sharing_service_1 = require("../profit-sharing/profit-sharing.service");
let PaymentModule = class PaymentModule {
    constructor(moduleRef, paymentService) {
        this.moduleRef = moduleRef;
        this.paymentService = paymentService;
    }
    onModuleInit() {
        const profitSharingService = this.moduleRef.get(profit_sharing_service_1.ProfitSharingService, { strict: false });
        this.paymentService.setProfitSharingService(profitSharingService);
    }
};
exports.PaymentModule = PaymentModule;
exports.PaymentModule = PaymentModule = __decorate([
    (0, common_1.Module)({
        imports: [return_gift_module_1.ReturnGiftModule, profit_sharing_module_1.ProfitSharingModule],
        controllers: [payment_controller_1.PaymentController],
        providers: [payment_service_1.PaymentService, gift_service_1.GiftService, referral_service_1.ReferralService],
        exports: [payment_service_1.PaymentService],
    }),
    __metadata("design:paramtypes", [core_1.ModuleRef,
        payment_service_1.PaymentService])
], PaymentModule);
//# sourceMappingURL=payment.module.js.map