"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcelExportModule = void 0;
const common_1 = require("@nestjs/common");
const excel_export_controller_1 = require("./excel-export.controller");
const excel_export_service_1 = require("./excel-export.service");
let ExcelExportModule = class ExcelExportModule {
};
exports.ExcelExportModule = ExcelExportModule;
exports.ExcelExportModule = ExcelExportModule = __decorate([
    (0, common_1.Module)({
        controllers: [excel_export_controller_1.ExcelExportController],
        providers: [excel_export_service_1.ExcelExportService],
        exports: [excel_export_service_1.ExcelExportService],
    })
], ExcelExportModule);
//# sourceMappingURL=excel-export.module.js.map