"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AdminOrderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminOrderService = void 0;
const common_1 = require("@nestjs/common");
const supabase_client_1 = require("../../storage/database/supabase-client");
let AdminOrderService = AdminOrderService_1 = class AdminOrderService {
    constructor() {
        this.logger = new common_1.Logger(AdminOrderService_1.name);
    }
    async getOrders(params) {
        const { page = 1, pageSize = 10, status, search, startDate, endDate } = params;
        const client = (0, supabase_client_1.getSupabaseClient)();
        let query = client.from('mall_orders').select('*', { count: 'exact' });
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }
        if (search) {
            query = query.or(`order_no.ilike.%${search}%,user_name.ilike.%${search}%,user_phone.ilike.%${search}%`);
        }
        if (startDate) {
            query = query.gte('created_at', startDate);
        }
        if (endDate) {
            query = query.lte('created_at', endDate + 'T23:59:59');
        }
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to).order('created_at', { ascending: false });
        const { data: orders, error, count } = await query;
        if (error) {
            this.logger.error(`查询订单失败: ${error.message}`);
            return { code: 500, msg: '查询失败', data: { list: [], total: 0, page, pageSize } };
        }
        const banquetIds = orders?.map((o) => o.banquet_id).filter(Boolean) || [];
        let banquetMap = {};
        if (banquetIds.length > 0) {
            const { data: banquets } = await client
                .from('banquets')
                .select('id, name')
                .in('id', banquetIds);
            banquets?.forEach((b) => {
                banquetMap[b.id] = b;
            });
        }
        const list = (orders || []).map((order) => ({
            id: order.id,
            orderNo: order.order_no,
            userName: order.user_name,
            userPhone: order.user_phone,
            banquetId: order.banquet_id,
            banquetName: banquetMap[order.banquet_id]?.name || order.banquet_id,
            amount: order.total_amount,
            status: order.status,
            shippingInfo: order.shipping_info,
            createdAt: order.created_at,
            paidAt: order.paid_at,
            shippedAt: order.shipped_at,
            completedAt: order.completed_at,
        }));
        return {
            code: 200,
            msg: 'success',
            data: { list, total: count || 0, page, pageSize },
        };
    }
    async getOrderDetail(orderId) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data: order, error } = await client
            .from('mall_orders')
            .select('*')
            .eq('id', orderId)
            .single();
        if (error || !order) {
            return { code: 404, msg: '订单不存在', data: null };
        }
        const { data: items } = await client
            .from('mall_order_items')
            .select('*')
            .eq('order_id', orderId);
        return {
            code: 200,
            msg: 'success',
            data: {
                ...order,
                items: items || [],
            },
        };
    }
    async shipOrder(orderId) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { error } = await client
            .from('mall_orders')
            .update({
            status: 'shipped',
            shipped_at: new Date().toISOString(),
        })
            .eq('id', orderId)
            .eq('status', 'paid');
        if (error) {
            this.logger.error(`订单发货失败: ${error.message}`);
            return { code: 500, msg: '发货失败', data: null };
        }
        this.logger.log(`订单发货成功: orderId=${orderId}`);
        return { code: 200, msg: '发货成功', data: null };
    }
    async completeOrder(orderId) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { error } = await client
            .from('mall_orders')
            .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
        })
            .eq('id', orderId)
            .eq('status', 'shipped');
        if (error) {
            this.logger.error(`订单完成失败: ${error.message}`);
            return { code: 500, msg: '操作失败', data: null };
        }
        return { code: 200, msg: '操作成功', data: null };
    }
    async refundOrder(orderId) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data: order } = await client.from('mall_orders').select('*').eq('id', orderId).single();
        if (!order) {
            return { code: 404, msg: '订单不存在', data: null };
        }
        if (order.status === 'refunded') {
            return { code: 400, msg: '订单已退款', data: null };
        }
        const { error } = await client
            .from('mall_orders')
            .update({
            status: 'refunded',
            refunded_at: new Date().toISOString(),
        })
            .eq('id', orderId);
        if (error) {
            this.logger.error(`订单退款失败: ${error.message}`);
            return { code: 500, msg: '退款失败', data: null };
        }
        this.logger.log(`订单退款成功: orderId=${orderId}`);
        return { code: 200, msg: '退款成功', data: null };
    }
};
exports.AdminOrderService = AdminOrderService;
exports.AdminOrderService = AdminOrderService = AdminOrderService_1 = __decorate([
    (0, common_1.Injectable)()
], AdminOrderService);
//# sourceMappingURL=admin-order.service.js.map