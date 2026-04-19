"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AdminStatsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminStatsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_client_1 = require("../../storage/database/supabase-client");
let AdminStatsService = AdminStatsService_1 = class AdminStatsService {
    constructor() {
        this.logger = new common_1.Logger(AdminStatsService_1.name);
    }
    async getStats(params) {
        const { startDate, endDate } = params;
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { count: totalUsers } = await client
            .from('users')
            .select('*', { count: 'exact', head: true });
        const { count: totalBanquets } = await client
            .from('banquets')
            .select('*', { count: 'exact', head: true });
        const { count: totalOrders } = await client
            .from('mall_orders')
            .select('*', { count: 'exact', head: true });
        const vipUsers = 0;
        const now = new Date().toISOString();
        const { count: activeBanquets } = await client
            .from('banquets')
            .select('*', { count: 'exact', head: true })
            .lte('event_time', now);
        const { data: gifts } = await client.from('gift_records').select('amount');
        const { data: orders } = await client
            .from('mall_orders')
            .select('total_amount')
            .eq('status', 'completed');
        const totalGiftAmount = gifts?.reduce((sum, g) => sum + (g.amount || 0), 0) || 0;
        const totalOrderAmount = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
        const totalAmount = totalGiftAmount + totalOrderAmount;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();
        const { data: todayGifts } = await client
            .from('gift_records')
            .select('amount')
            .gte('created_at', todayStr);
        const { data: todayOrders } = await client
            .from('mall_orders')
            .select('total_amount')
            .eq('status', 'completed')
            .gte('created_at', todayStr);
        const { count: todayUsers } = await client
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', todayStr);
        const todayIncome = (todayGifts?.reduce((sum, g) => sum + (g.amount || 0), 0) || 0) +
            (todayOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0);
        return {
            code: 200,
            msg: 'success',
            data: {
                totalUsers: totalUsers || 0,
                totalBanquets: totalBanquets || 0,
                totalOrders: totalOrders || 0,
                totalAmount,
                vipUsers: vipUsers || 0,
                activeBanquets: activeBanquets || 0,
                todayUsers: todayUsers || 0,
                todayOrders: todayOrders?.length || 0,
                todayAmount: todayIncome,
            },
        };
    }
    async getGiftRankings() {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data: gifts } = await client
            .from('gift_records')
            .select('guest_name, guest_openid, amount');
        const userAmounts = {};
        gifts?.forEach((g) => {
            const key = g.guest_openid || g.guest_name;
            if (!userAmounts[key]) {
                userAmounts[key] = { name: g.guest_name || '匿名', amount: 0 };
            }
            userAmounts[key].amount += g.amount || 0;
        });
        const rankings = Object.entries(userAmounts)
            .map(([key, value], index) => ({
            rank: index + 1,
            name: value.name,
            value: value.amount,
        }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
        return { code: 200, msg: 'success', data: rankings };
    }
    async getBanquetRankings() {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data: banquets } = await client
            .from('banquets')
            .select('name, total_gift_amount')
            .order('total_gift_amount', { ascending: false })
            .limit(10);
        const rankings = (banquets || []).map((b, index) => ({
            rank: index + 1,
            name: b.name,
            value: b.total_gift_amount || 0,
        }));
        return { code: 200, msg: 'success', data: rankings };
    }
    async getSalesRankings() {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data: items } = await client
            .from('mall_order_items')
            .select('product_name, quantity, price');
        const productSales = {};
        items?.forEach((item) => {
            if (!productSales[item.product_name]) {
                productSales[item.product_name] = { name: item.product_name, sales: 0, amount: 0 };
            }
            productSales[item.product_name].sales += item.quantity || 0;
            productSales[item.product_name].amount += (item.price || 0) * (item.quantity || 0);
        });
        const rankings = Object.values(productSales)
            .map((value, index) => ({
            rank: index + 1,
            ...value,
        }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 10);
        return { code: 200, msg: 'success', data: rankings };
    }
    async getDailyTrend() {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const result = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            const dateStr = date.toISOString().split('T')[0];
            const { data: gifts } = await client
                .from('gift_records')
                .select('amount')
                .gte('created_at', date.toISOString())
                .lt('created_at', nextDate.toISOString());
            const { data: orders } = await client
                .from('mall_orders')
                .select('total_amount')
                .eq('status', 'completed')
                .gte('paid_at', date.toISOString())
                .lt('paid_at', nextDate.toISOString());
            const { count: users } = await client
                .from('users')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', date.toISOString())
                .lt('created_at', nextDate.toISOString());
            result.push({
                date: dateStr.slice(5),
                income: (gifts?.reduce((sum, g) => sum + (g.amount || 0), 0) || 0) +
                    (orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0),
                orders: orders?.length || 0,
                users: users || 0,
            });
        }
        return { code: 200, msg: 'success', data: result };
    }
};
exports.AdminStatsService = AdminStatsService;
exports.AdminStatsService = AdminStatsService = AdminStatsService_1 = __decorate([
    (0, common_1.Injectable)()
], AdminStatsService);
//# sourceMappingURL=admin-stats.service.js.map