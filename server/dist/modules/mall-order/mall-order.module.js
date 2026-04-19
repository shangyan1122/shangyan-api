"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MallOrderModule = void 0;
const common_1 = require("@nestjs/common");
const mall_order_controller_1 = require("./mall-order.controller");
const mall_order_service_1 = require("./mall-order.service");
let MallOrderModule = class MallOrderModule {
};
exports.MallOrderModule = MallOrderModule;
exports.MallOrderModule = MallOrderModule = __decorate([
    (0, common_1.Module)({
        controllers: [mall_order_controller_1.MallOrderController],
        providers: [mall_order_service_1.MallOrderService],
        exports: [mall_order_service_1.MallOrderService],
    })
], MallOrderModule);
//# sourceMappingURL=mall-order.module.js.map