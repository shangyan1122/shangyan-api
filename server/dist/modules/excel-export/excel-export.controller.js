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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ExcelExportController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcelExportController = void 0;
const common_1 = require("@nestjs/common");
const excel_export_service_1 = require("./excel-export.service");
const common_2 = require("@nestjs/common");
let ExcelExportController = ExcelExportController_1 = class ExcelExportController {
    constructor(excelExportService) {
        this.excelExportService = excelExportService;
        this.logger = new common_2.Logger(ExcelExportController_1.name);
    }
    async exportGiftLedger(body) {
        this.logger.log(`导出礼账: ${body.openid}`);
        try {
            const fileUrl = await this.excelExportService.exportGiftLedger(body);
            return {
                code: 200,
                msg: '导出成功',
                data: { url: fileUrl },
            };
        }
        catch (error) {
            this.logger.error('导出礼账失败:', error);
            return {
                code: 500,
                msg: error.message || '导出失败',
                data: null,
            };
        }
    }
    async exportBanquetReport(body) {
        this.logger.log(`导出宴会报告: ${body.banquetId}`);
        try {
            const fileUrl = await this.excelExportService.exportBanquetReport(body);
            return {
                code: 200,
                msg: '导出成功',
                data: { url: fileUrl },
            };
        }
        catch (error) {
            this.logger.error('导出宴会报告失败:', error);
            return {
                code: 500,
                msg: error.message || '导出失败',
                data: null,
            };
        }
    }
};
exports.ExcelExportController = ExcelExportController;
__decorate([
    (0, common_1.Post)('gift-ledger'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ExcelExportController.prototype, "exportGiftLedger", null);
__decorate([
    (0, common_1.Post)('banquet-report'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ExcelExportController.prototype, "exportBanquetReport", null);
exports.ExcelExportController = ExcelExportController = ExcelExportController_1 = __decorate([
    (0, common_1.Controller)('excel-export'),
    __metadata("design:paramtypes", [excel_export_service_1.ExcelExportService])
], ExcelExportController);
//# sourceMappingURL=excel-export.controller.js.map