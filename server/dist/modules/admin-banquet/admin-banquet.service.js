"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AdminBanquetService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminBanquetService = void 0;
const common_1 = require("@nestjs/common");
const supabase_client_1 = require("../../storage/database/supabase-client");
let AdminBanquetService = AdminBanquetService_1 = class AdminBanquetService {
    constructor() {
        this.logger = new common_1.Logger(AdminBanquetService_1.name);
    }
    async getBanquets(params) {
        const { page = 1, pageSize = 10, type, status, search } = params;
        const client = (0, supabase_client_1.getSupabaseClient)();
        let query = client.from('banquets').select('*', { count: 'exact' });
        if (type && type !== 'all') {
            query = query.eq('banquet_type', type);
        }
        if (status) {
            const now = new Date().toISOString();
            if (status === 'upcoming') {
                query = query.gt('event_time', now);
            }
            else if (status === 'active') {
                query = query.lte('event_time', now);
            }
            else if (status === 'ended') {
                query = query.lt('event_time', now);
            }
        }
        if (search) {
            query = query.or(`name.ilike.%${search}%,host_name.ilike.%${search}%`);
        }
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to).order('created_at', { ascending: false });
        const { data: banquets, error, count } = await query;
        if (error) {
            this.logger.error(`查询宴会失败: ${error.message}`);
            return { code: 500, msg: '查询失败', data: { list: [], total: 0, page, pageSize } };
        }
        const now = new Date();
        const list = (banquets || []).map((banquet) => {
            const eventTime = new Date(banquet.event_time);
            let banquetStatus = 'ended';
            if (eventTime > now) {
                const daysDiff = (eventTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                banquetStatus = daysDiff > 7 ? 'upcoming' : 'active';
            }
            else {
                banquetStatus = 'ended';
            }
            return {
                id: banquet.id,
                name: banquet.name,
                type: banquet.banquet_type,
                hostName: banquet.host_name,
                hostOpenid: banquet.host_openid,
                eventTime: banquet.event_time,
                location: banquet.location,
                guestCount: banquet.guest_count || 0,
                totalAmount: banquet.total_gift_amount || 0,
                status: banquetStatus,
                qrCode: banquet.qr_code,
                createdAt: banquet.created_at,
            };
        });
        if (status && status !== list.map((l) => l.status)[0]) {
        }
        return {
            code: 200,
            msg: 'success',
            data: { list, total: count || 0, page, pageSize },
        };
    }
    async getBanquetDetail(banquetId) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data: banquet, error } = await client
            .from('banquets')
            .select('*')
            .eq('id', banquetId)
            .single();
        if (error || !banquet) {
            return { code: 404, msg: '宴会不存在', data: null };
        }
        const { data: gifts } = await client
            .from('gift_records')
            .select('*')
            .eq('banquet_id', banquetId);
        return {
            code: 200,
            msg: 'success',
            data: {
                ...banquet,
                gifts: gifts || [],
            },
        };
    }
    async deleteBanquet(banquetId) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { error } = await client.from('banquets').delete().eq('id', banquetId);
        if (error) {
            this.logger.error(`删除宴会失败: ${error.message}`);
            return { code: 500, msg: '删除失败', data: null };
        }
        this.logger.log(`删除宴会成功: banquetId=${banquetId}`);
        return { code: 200, msg: '删除成功', data: null };
    }
};
exports.AdminBanquetService = AdminBanquetService;
exports.AdminBanquetService = AdminBanquetService = AdminBanquetService_1 = __decorate([
    (0, common_1.Injectable)()
], AdminBanquetService);
//# sourceMappingURL=admin-banquet.service.js.map