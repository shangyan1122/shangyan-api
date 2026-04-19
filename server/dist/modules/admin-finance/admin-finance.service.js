"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AdminFinanceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminFinanceService = void 0;
const common_1 = require("@nestjs/common");
const supabase_client_1 = require("../../storage/database/supabase-client");
let AdminFinanceService = AdminFinanceService_1 = class AdminFinanceService {
    constructor() {
        this.logger = new common_1.Logger(AdminFinanceService_1.name);
    }
    async getStats() {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data: gifts } = await client.from('gift_records').select('amount');
        const totalGift = gifts?.reduce((sum, g) => sum + (g.amount || 0), 0) || 0;
        const { data: orders } = await client
            .from('mall_orders')
            .select('total_amount')
            .eq('status', 'completed');
        const totalOrder = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
        const { data: members } = await client
            .from('member_orders')
            .select('amount')
            .eq('status', 'completed');
        const totalVip = members?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0;
        const { data: withdraws } = await client
            .from('withdraw_records')
            .select('amount')
            .eq('status', 'completed');
        const totalWithdraw = withdraws?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0;
        const { data: pendingWithdraws } = await client
            .from('withdraw_records')
            .select('amount')
            .eq('status', 'pending');
        const pendingWithdraw = pendingWithdraws?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();
        const { data: todayGifts } = await client
            .from('gift_records')
            .select('amount')
            .gte('created_at', todayStr);
        const todayGift = todayGifts?.reduce((sum, g) => sum + (g.amount || 0), 0) || 0;
        const { data: todayOrders } = await client
            .from('mall_orders')
            .select('total_amount')
            .eq('status', 'completed')
            .gte('paid_at', todayStr);
        const todayOrder = todayOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
        return {
            code: 200,
            msg: 'success',
            data: {
                totalIncome: totalGift + totalOrder + totalVip,
                totalExpense: totalWithdraw,
                totalGift,
                totalOrder,
                totalVip,
                totalWithdraw,
                pendingWithdraw,
                todayIncome: todayGift + todayOrder,
            },
        };
    }
    async getTransactions(params) {
        const { page = 1, pageSize = 10, type, category, startDate, endDate } = params;
        const client = (0, supabase_client_1.getSupabaseClient)();
        const transactions = [];
        if (!type || type === 'income') {
            let giftQuery = client.from('gift_records').select('*', { count: 'exact' });
            if (category === 'gift' || !category) {
                if (startDate)
                    giftQuery = giftQuery.gte('created_at', startDate);
                if (endDate)
                    giftQuery = giftQuery.lte('created_at', endDate + 'T23:59:59');
                const from = (page - 1) * pageSize;
                const to = from + pageSize - 1;
                giftQuery = giftQuery.range(from, to).order('created_at', { ascending: false });
                const { data: gifts } = await giftQuery;
                gifts?.forEach((g) => {
                    transactions.push({
                        id: g.id,
                        orderNo: g.id,
                        type: 'income',
                        category: 'gift',
                        amount: g.amount,
                        status: 'completed',
                        description: `${g.guest_name || '嘉宾'}随礼`,
                        userName: g.guest_name,
                        banquetName: g.banquet_id,
                        createdAt: g.created_at,
                        completedAt: g.created_at,
                    });
                });
            }
        }
        if (!type || type === 'income') {
            let orderQuery = client.from('mall_orders').select('*', { count: 'exact' });
            if (category === 'gift_goods' || !category) {
                if (startDate)
                    orderQuery = orderQuery.gte('created_at', startDate);
                if (endDate)
                    orderQuery = orderQuery.lte('created_at', endDate + 'T23:59:59');
                const from = (page - 1) * pageSize;
                const to = from + pageSize - 1;
                orderQuery = orderQuery.range(from, to).order('created_at', { ascending: false });
                const { data: orders } = await orderQuery;
                orders?.forEach((o) => {
                    if (o.status === 'completed') {
                        transactions.push({
                            id: o.id,
                            orderNo: o.order_no,
                            type: 'income',
                            category: 'gift_goods',
                            amount: o.total_amount,
                            status: 'completed',
                            description: '购买礼品',
                            userName: o.user_name,
                            banquetName: o.banquet_id,
                            createdAt: o.created_at,
                            completedAt: o.paid_at,
                        });
                    }
                });
            }
        }
        if (!type || type === 'income') {
            let memberQuery = client.from('member_orders').select('*', { count: 'exact' });
            if (category === 'vip' || !category) {
                if (startDate)
                    memberQuery = memberQuery.gte('created_at', startDate);
                if (endDate)
                    memberQuery = memberQuery.lte('created_at', endDate + 'T23:59:59');
                const from = (page - 1) * pageSize;
                const to = from + pageSize - 1;
                memberQuery = memberQuery.range(from, to).order('created_at', { ascending: false });
                const { data: members } = await memberQuery;
                members?.forEach((m) => {
                    if (m.status === 'completed') {
                        transactions.push({
                            id: m.id,
                            orderNo: m.order_no,
                            type: 'income',
                            category: 'vip',
                            amount: m.amount,
                            status: 'completed',
                            description: 'VIP开通',
                            userName: m.user_name,
                            banquetName: '-',
                            createdAt: m.created_at,
                            completedAt: m.paid_at,
                        });
                    }
                });
            }
        }
        if (!type || type === 'expense') {
            let withdrawQuery = client.from('withdraw_records').select('*', { count: 'exact' });
            if (category === 'withdraw' || !category) {
                if (startDate)
                    withdrawQuery = withdrawQuery.gte('created_at', startDate);
                if (endDate)
                    withdrawQuery = withdrawQuery.lte('created_at', endDate + 'T23:59:59');
                const from = (page - 1) * pageSize;
                const to = from + pageSize - 1;
                withdrawQuery = withdrawQuery.range(from, to).order('created_at', { ascending: false });
                const { data: withdraws } = await withdrawQuery;
                withdraws?.forEach((w) => {
                    transactions.push({
                        id: w.id,
                        orderNo: w.id,
                        type: 'expense',
                        category: 'withdraw',
                        amount: w.amount,
                        status: w.status,
                        description: '提现到微信',
                        userName: w.user_name,
                        banquetName: '-',
                        createdAt: w.created_at,
                        completedAt: w.completed_at,
                    });
                });
            }
        }
        transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return {
            code: 200,
            msg: 'success',
            data: {
                list: transactions.slice(0, pageSize),
                total: transactions.length,
                page,
                pageSize,
            },
        };
    }
    async approveWithdraw(recordId) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { error } = await client
            .from('withdraw_records')
            .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
        })
            .eq('id', recordId)
            .eq('status', 'pending');
        if (error) {
            this.logger.error(`审核提现失败: ${error.message}`);
            return { code: 500, msg: '操作失败', data: null };
        }
        this.logger.log(`审核提现成功: recordId=${recordId}`);
        return { code: 200, msg: '审核通过', data: null };
    }
    async rejectWithdraw(recordId) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { error } = await client
            .from('withdraw_records')
            .update({
            status: 'rejected',
            completed_at: new Date().toISOString(),
        })
            .eq('id', recordId)
            .eq('status', 'pending');
        if (error) {
            this.logger.error(`拒绝提现失败: ${error.message}`);
            return { code: 500, msg: '操作失败', data: null };
        }
        this.logger.log(`拒绝提现: recordId=${recordId}`);
        return { code: 200, msg: '已拒绝', data: null };
    }
};
exports.AdminFinanceService = AdminFinanceService;
exports.AdminFinanceService = AdminFinanceService = AdminFinanceService_1 = __decorate([
    (0, common_1.Injectable)()
], AdminFinanceService);
//# sourceMappingURL=admin-finance.service.js.map