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
var AdminOrderController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminOrderController = void 0;
const common_1 = require("@nestjs/common");
const admin_order_service_1 = require("./admin-order.service");
let AdminOrderController = AdminOrderController_1 = class AdminOrderController {
    constructor(adminOrderService) {
        this.adminOrderService = adminOrderService;
        this.logger = new common_1.Logger(AdminOrderController_1.name);
    }
    async getOrders(page, pageSize, status, search, startDate, endDate) {
        return this.adminOrderService.getOrders({
            page: page ? parseInt(page) : 1,
            pageSize: pageSize ? parseInt(pageSize) : 10,
            status,
            search,
            startDate,
            endDate,
        });
    }
    async getOrderDetail(id) {
        return this.adminOrderService.getOrderDetail(id);
    }
    async shipOrder(id) {
        this.logger.log(`发货请求: orderId=${id}`);
        return this.adminOrderService.shipOrder(id);
    }
    async completeOrder(id) {
        this.logger.log(`完成订单请求: orderId=${id}`);
        return this.adminOrderService.completeOrder(id);
    }
    async refundOrder(id) {
        this.logger.log(`退款请求: orderId=${id}`);
        return this.adminOrderService.refundOrder(id);
    }
};
exports.AdminOrderController = AdminOrderController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('pageSize')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('search')),
    __param(4, (0, common_1.Query)('startDate')),
    __param(5, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminOrderController.prototype, "getOrders", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminOrderController.prototype, "getOrderDetail", null);
__decorate([
    (0, common_1.Post)(':id/ship'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminOrderController.prototype, "shipOrder", null);
__decorate([
    (0, common_1.Post)(':id/complete'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminOrderController.prototype, "completeOrder", null);
__decorate([
    (0, common_1.Post)(':id/refund'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminOrderController.prototype, "refundOrder", null);
exports.AdminOrderController = AdminOrderController = AdminOrderController_1 = __decorate([
    (0, common_1.Controller)('admin/orders'),
    __metadata("design:paramtypes", [admin_order_service_1.AdminOrderService])
], AdminOrderController);
//# sourceMappingURL=admin-order.controller.js.map