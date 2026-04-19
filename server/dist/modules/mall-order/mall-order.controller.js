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
var MallOrderController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MallOrderController = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const mall_order_service_1 = require("./mall-order.service");
let MallOrderController = MallOrderController_1 = class MallOrderController {
    constructor(orderService) {
        this.orderService = orderService;
        this.logger = new common_2.Logger(MallOrderController_1.name);
    }
    async createOrder(body) {
        this.logger.log(`创建订单: user=${body.userOpenid}, items=${body.items.length}`);
        try {
            const order = await this.orderService.createOrder(body);
            return { code: 200, msg: 'success', data: order };
        }
        catch (error) {
            this.logger.error(`创建订单失败: ${error.message}`);
            return { code: 500, msg: error.message || '创建订单失败', data: null };
        }
    }
    async getUserOrders(openid, status, page, pageSize) {
        this.logger.log(`获取订单列表: openid=${openid}, status=${status}`);
        try {
            const result = await this.orderService.getUserOrders(openid, status, parseInt(page || '1'), parseInt(pageSize || '10'));
            return { code: 200, msg: 'success', data: result };
        }
        catch (error) {
            this.logger.error(`获取订单列表失败: ${error.message}`);
            return { code: 500, msg: '获取订单列表失败', data: { orders: [], total: 0 } };
        }
    }
    async getOrderById(id) {
        this.logger.log(`获取订单详情: ${id}`);
        try {
            const order = await this.orderService.getOrderById(id);
            if (!order) {
                return { code: 404, msg: '订单不存在', data: null };
            }
            return { code: 200, msg: 'success', data: order };
        }
        catch (error) {
            this.logger.error(`获取订单详情失败: ${error.message}`);
            return { code: 500, msg: '获取订单详情失败', data: null };
        }
    }
    async handlePaymentSuccess(body) {
        this.logger.log(`支付成功回调: orderNo=${body.orderNo}`);
        try {
            const success = await this.orderService.handlePaymentSuccess(body.orderNo, body.transactionId);
            return { code: 200, msg: success ? 'success' : 'failed', data: { success } };
        }
        catch (error) {
            this.logger.error(`处理支付回调失败: ${error.message}`);
            return { code: 500, msg: error.message, data: { success: false } };
        }
    }
    async shipOrder(body) {
        this.logger.log(`订单发货: orderId=${body.orderId}`);
        try {
            const success = await this.orderService.shipOrder(body.orderId, {
                company: body.company,
                code: body.code,
                trackingNo: body.trackingNo,
            });
            return { code: 200, msg: 'success', data: { success } };
        }
        catch (error) {
            this.logger.error(`发货失败: ${error.message}`);
            return { code: 500, msg: error.message, data: { success: false } };
        }
    }
    async confirmReceive(body) {
        this.logger.log(`确认收货: orderId=${body.orderId}`);
        try {
            const success = await this.orderService.confirmReceive(body.orderId);
            return { code: 200, msg: 'success', data: { success } };
        }
        catch (error) {
            this.logger.error(`确认收货失败: ${error.message}`);
            return { code: 500, msg: error.message, data: { success: false } };
        }
    }
    async cancelOrder(body) {
        this.logger.log(`取消订单: orderId=${body.orderId}`);
        try {
            const success = await this.orderService.cancelOrder(body.orderId, body.reason);
            return { code: 200, msg: 'success', data: { success } };
        }
        catch (error) {
            this.logger.error(`取消订单失败: ${error.message}`);
            return { code: 500, msg: error.message, data: { success: false } };
        }
    }
    async getAdminStats() {
        try {
            const pendingShipCount = await this.orderService.getPendingShipCount();
            return {
                code: 200,
                msg: 'success',
                data: { pendingShipCount },
            };
        }
        catch (error) {
            return { code: 500, msg: '获取统计失败', data: null };
        }
    }
    async getAllOrders(status, page, pageSize) {
        try {
            const result = await this.orderService.getAllOrders(status, parseInt(page || '1'), parseInt(pageSize || '20'));
            return { code: 200, msg: 'success', data: result };
        }
        catch (error) {
            return { code: 500, msg: '获取订单列表失败', data: { orders: [], total: 0 } };
        }
    }
};
exports.MallOrderController = MallOrderController;
__decorate([
    (0, common_1.Post)('create'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MallOrderController.prototype, "createOrder", null);
__decorate([
    (0, common_1.Get)('list'),
    __param(0, (0, common_1.Query)('openid')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], MallOrderController.prototype, "getUserOrders", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MallOrderController.prototype, "getOrderById", null);
__decorate([
    (0, common_1.Post)('payment-success'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MallOrderController.prototype, "handlePaymentSuccess", null);
__decorate([
    (0, common_1.Post)('ship'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MallOrderController.prototype, "shipOrder", null);
__decorate([
    (0, common_1.Post)('confirm-receive'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MallOrderController.prototype, "confirmReceive", null);
__decorate([
    (0, common_1.Post)('cancel'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MallOrderController.prototype, "cancelOrder", null);
__decorate([
    (0, common_1.Get)('admin/stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MallOrderController.prototype, "getAdminStats", null);
__decorate([
    (0, common_1.Get)('admin/list'),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], MallOrderController.prototype, "getAllOrders", null);
exports.MallOrderController = MallOrderController = MallOrderController_1 = __decorate([
    (0, common_1.Controller)('mall-orders'),
    __metadata("design:paramtypes", [mall_order_service_1.MallOrderService])
], MallOrderController);
//# sourceMappingURL=mall-order.controller.js.map