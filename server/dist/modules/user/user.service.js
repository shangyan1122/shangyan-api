"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const supabase_client_1 = require("../../storage/database/supabase-client");
let UserService = class UserService {
    async getUserStats(openid) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { count: totalBanquets } = await client
            .from('banquets')
            .select('*', { count: 'exact', head: true })
            .eq('host_openid', openid);
        const { data: banquets } = await client.from('banquets').select('id').eq('host_openid', openid);
        const banquetIds = banquets?.map((b) => b.id) || [];
        let totalGifts = 0;
        let totalAmount = 0;
        if (banquetIds.length > 0) {
            const { data: giftRecords } = await client
                .from('gift_records')
                .select('amount')
                .eq('payment_status', 'paid')
                .in('banquet_id', banquetIds);
            totalGifts = giftRecords?.length || 0;
            totalAmount = giftRecords?.reduce((sum, record) => sum + record.amount, 0) || 0;
        }
        return {
            totalBanquets: totalBanquets || 0,
            totalGifts,
            totalAmount,
        };
    }
    async getGiftLedger(hostOpenid, page = 1, pageSize = 20) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data: banquets } = await client
            .from('banquets')
            .select('id, name')
            .eq('host_openid', hostOpenid);
        if (!banquets || banquets.length === 0) {
            return { records: [], total: 0 };
        }
        const banquetIds = banquets.map((b) => b.id);
        const banquetMap = new Map(banquets.map((b) => [b.id, b.name]));
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const { data: records, count } = await client
            .from('gift_records')
            .select('*', { count: 'exact' })
            .in('banquet_id', banquetIds)
            .eq('payment_status', 'paid')
            .order('created_at', { ascending: false })
            .range(from, to);
        const recordsWithBanquetName = records?.map((record) => ({
            ...record,
            banquet_name: banquetMap.get(record.banquet_id),
        })) || [];
        return {
            records: recordsWithBanquetName,
            total: count || 0,
        };
    }
    async getGuestGifts(guestOpenid) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data, error } = await client
            .from('gift_records')
            .select('*, banquets(name, type, event_time)')
            .eq('guest_openid', guestOpenid)
            .eq('payment_status', 'paid')
            .order('created_at', { ascending: false });
        if (error) {
            console.error('获取嘉宾随礼记录失败:', error);
            return [];
        }
        return (data?.map((record) => ({
            ...record,
            banquet_name: record.banquets?.name,
            banquet_type: record.banquets?.type,
            event_time: record.banquets?.event_time,
        })) || []);
    }
    async getGuestBanquets(guestOpenid) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data: records, error } = await client
            .from('gift_records')
            .select('*')
            .eq('guest_openid', guestOpenid)
            .eq('payment_status', 'paid')
            .order('created_at', { ascending: false });
        if (error || !records || records.length === 0) {
            console.error('获取嘉宾随礼记录失败:', error);
            return [];
        }
        const banquetIds = [...new Set(records.map((r) => r.banquet_id))];
        const { data: banquets, error: banquetError } = await client
            .from('banquets')
            .select('id, name, type, event_time, location')
            .in('id', banquetIds);
        if (banquetError || !banquets) {
            console.error('获取宴会信息失败:', banquetError);
            return [];
        }
        const banquetMap = new Map(banquets.map((b) => [b.id, b]));
        const result = [];
        const seenBanquets = new Set();
        for (const record of records) {
            if (seenBanquets.has(record.banquet_id))
                continue;
            const banquet = banquetMap.get(record.banquet_id);
            if (banquet) {
                result.push({
                    id: record.id,
                    banquet_id: record.banquet_id,
                    banquet_name: banquet.name,
                    banquet_type: banquet.type,
                    event_time: banquet.event_time,
                    location: banquet.location,
                    amount: record.amount,
                    blessing: record.blessing,
                    created_at: record.created_at,
                });
                seenBanquets.add(record.banquet_id);
            }
        }
        return result;
    }
    async getUserInfo(openid) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data: user, error } = await client
            .from('users')
            .select('*')
            .eq('openid', openid)
            .single();
        if (error || !user) {
            return {
                openid,
                nickname: '新用户',
                avatar: '',
                phone: '',
                isVip: false,
                vipExpireDate: '',
            };
        }
        return {
            id: user.id,
            openid: user.openid,
            nickname: user.nickname || '用户',
            avatar: user.avatar_url || '',
            phone: user.phone || '',
            isVip: false,
            vipExpireDate: '',
        };
    }
    async updateUserInfo(openid, data) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const updateData = { updated_at: new Date().toISOString() };
        if (data.nickname)
            updateData.nickname = data.nickname;
        if (data.avatar)
            updateData.avatar_url = data.avatar;
        await client.from('users').update(updateData).eq('openid', openid);
    }
    async activateVip(openid, months = 12) {
        return {
            code: 501,
            msg: 'VIP功能暂未开放，请联系管理员添加数据库字段',
            data: { vipExpireDate: '' },
        };
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)()
], UserService);
//# sourceMappingURL=user.service.js.map