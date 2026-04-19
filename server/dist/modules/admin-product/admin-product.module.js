"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminProductModule = void 0;
const common_1 = require("@nestjs/common");
const admin_product_controller_1 = require("./admin-product.controller");
const admin_product_service_1 = require("./admin-product.service");
let AdminProductModule = class AdminProductModule {
};
exports.AdminProductModule = AdminProductModule;
exports.AdminProductModule = AdminProductModule = __decorate([
    (0, common_1.Module)({
        controllers: [admin_product_controller_1.AdminProductController],
        providers: [admin_product_service_1.AdminProductService],
        exports: [admin_product_service_1.AdminProductService],
    })
], AdminProductModule);
//# sourceMappingURL=admin-product.module.js.map