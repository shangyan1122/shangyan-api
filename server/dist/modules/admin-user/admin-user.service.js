"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AdminUserService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminUserService = void 0;
const common_1 = require("@nestjs/common");
const supabase_client_1 = require("../../storage/database/supabase-client");
let AdminUserService = AdminUserService_1 = class AdminUserService {
    constructor() {
        this.logger = new common_1.Logger(AdminUserService_1.name);
    }
    async getUsers(params) {
        const { page = 1, pageSize = 10, isVip, search } = params;
        const client = (0, supabase_client_1.getSupabaseClient)();
        let query = client.from('users').select('*', { count: 'exact' });
        if (search) {
            query = query.or(`nickname.ilike.%${search}%,phone.ilike.%${search}%,openid.ilike.%${search}%`);
        }
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to).order('created_at', { ascending: false });
        const { data: users, error, count } = await query;
        if (error) {
            this.logger.error(`查询用户失败: ${error.message}`);
            return { code: 500, msg: '查询失败', data: { list: [], total: 0, page, pageSize } };
        }
        const openids = users?.map((u) => u.openid).filter(Boolean) || [];
        let levelMap = {};
        if (openids.length > 0) {
            const { data: officers } = await client
                .from('recommend_officers')
                .select('openid, level')
                .in('openid', openids);
            officers?.forEach((o) => {
                levelMap[o.openid] = o;
            });
        }
        const list = (users || []).map((user) => ({
            id: user.id,
            openid: user.openid,
            nickname: user.nickname,
            avatar: user.avatar_url || '',
            phone: user.phone,
            isVip: false,
            vipExpireDate: '',
            level: levelMap[user.openid]?.level || 1,
            referrerOpenid: user.referrer_openid,
            totalGifts: user.total_gifts || 0,
            totalAmount: user.total_gift_amount || 0,
            createdAt: user.created_at,
        }));
        return {
            code: 200,
            msg: 'success',
            data: { list, total: count || 0, page, pageSize },
        };
    }
    async getUserDetail(userId) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data: user, error } = await client.from('users').select('*').eq('id', userId).single();
        if (error || !user) {
            return { code: 404, msg: '用户不存在', data: null };
        }
        let level = 1;
        if (user.openid) {
            const { data: officer } = await client
                .from('recommend_officers')
                .select('level')
                .eq('openid', user.openid)
                .single();
            level = officer?.level || 1;
        }
        return {
            code: 200,
            msg: 'success',
            data: {
                ...user,
                level,
            },
        };
    }
    async setVipStatus(userId, isVip, expireDays) {
        this.logger.warn(`设置VIP暂不支持: users 表缺少 is_vip 字段`);
        return { code: 501, msg: 'VIP功能暂未开放，请联系管理员添加数据库字段', data: null };
    }
};
exports.AdminUserService = AdminUserService;
exports.AdminUserService = AdminUserService = AdminUserService_1 = __decorate([
    (0, common_1.Injectable)()
], AdminUserService);
//# sourceMappingURL=admin-user.service.js.map