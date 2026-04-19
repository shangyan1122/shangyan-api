"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceFeeModule = void 0;
const common_1 = require("@nestjs/common");
const service_fee_controller_1 = require("./service-fee.controller");
const service_fee_service_1 = require("./service-fee.service");
const shopping_voucher_service_1 = require("./shopping-voucher.service");
let ServiceFeeModule = class ServiceFeeModule {
};
exports.ServiceFeeModule = ServiceFeeModule;
exports.ServiceFeeModule = ServiceFeeModule = __decorate([
    (0, common_1.Module)({
        controllers: [service_fee_controller_1.ServiceFeeController],
        providers: [service_fee_service_1.ServiceFeeService, shopping_voucher_service_1.ShoppingVoucherService],
        exports: [service_fee_service_1.ServiceFeeService, shopping_voucher_service_1.ShoppingVoucherService],
    })
], ServiceFeeModule);
//# sourceMappingURL=service-fee.module.js.map