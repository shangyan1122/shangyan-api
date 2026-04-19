"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminBanquetModule = void 0;
const common_1 = require("@nestjs/common");
const admin_banquet_controller_1 = require("./admin-banquet.controller");
const admin_banquet_service_1 = require("./admin-banquet.service");
let AdminBanquetModule = class AdminBanquetModule {
};
exports.AdminBanquetModule = AdminBanquetModule;
exports.AdminBanquetModule = AdminBanquetModule = __decorate([
    (0, common_1.Module)({
        controllers: [admin_banquet_controller_1.AdminBanquetController],
        providers: [admin_banquet_service_1.AdminBanquetService],
        exports: [admin_banquet_service_1.AdminBanquetService],
    })
], AdminBanquetModule);
//# sourceMappingURL=admin-banquet.module.js.map