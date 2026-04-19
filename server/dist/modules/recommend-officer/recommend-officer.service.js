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
var RecommendOfficerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendOfficerService = void 0;
const common_1 = require("@nestjs/common");
const supabase_client_1 = require("../../storage/database/supabase-client");
const DEFAULT_VIP_COMMISSION_RATE = 30;
const DEFAULT_MALL_COMMISSION_RATE = 10;
const COMMISSION_BIND_YEARS = 3;
const PLATFORM_ACCOUNT_ID = 'platform';
let RecommendOfficerService = RecommendOfficerService_1 = class RecommendOfficerService {
    constructor() {
        this.logger = new common_1.Logger(RecommendOfficerService_1.name);
        this.supabase = (0, supabase_client_1.getSupabaseClient)();
    }
    async apply(openid, realName, idCard, phone) {
        try {
            const { data: existing } = await this.supabase
                .from('recommend_officers')
                .select('*')
                .eq('openid', openid)
                .single();
            if (existing) {
                if (existing.status === 'active') {
                    return { code: 400, msg: '您已是推荐官', data: existing };
                }
                if (existing.status === 'banned') {
                    return { code: 400, msg: '您的推荐官资格已被禁用，请联系客服' };
                }
                const { data: updated } = await this.supabase
                    .from('recommend_officers')
                    .update({
                    status: 'active',
                    real_name: realName,
                    id_card: idCard,
                    phone: phone,
                    updated_at: new Date().toISOString(),
                })
                    .eq('id', existing.id)
                    .select()
                    .single();
                return { code: 200, msg: '重新激活成功', data: updated };
            }
            const { data: newOfficer, error } = await this.supabase
                .from('recommend_officers')
                .insert({
                openid,
                real_name: realName,
                id_card: idCard,
                phone: phone,
                vip_commission_rate: DEFAULT_VIP_COMMISSION_RATE,
                mall_commission_rate: DEFAULT_MALL_COMMISSION_RATE,
                created_at: new Date().toISOString(),
            })
                .select()
                .single();
            if (error) {
                this.logger.error('创建推荐官失败:', error);
                return { code: 500, msg: '申请失败，请稍后重试' };
            }
            this.logger.log(`新推荐官申请成功: ${openid}, 姓名: ${realName}`);
            return { code: 200, msg: '申请成功', data: newOfficer };
        }
        catch (error) {
            this.logger.error('申请推荐官异常:', error);
            return { code: 500, msg: '申请失败' };
        }
    }
    async getStatus(openid) {
        try {
            const { data: officer } = await this.supabase
                .from('recommend_officers')
                .select('*')
                .eq('openid', openid)
                .single();
            if (!officer || officer.status !== 'active') {
                return {
                    code: 200,
                    msg: 'success',
                    data: {
                        isOfficer: false,
                        totalInvitees: 0,
                        activeInvitees: 0,
                        totalCommission: 0,
                        availableCommission: 0,
                        pendingCommission: 0,
                        vipCommissionRate: DEFAULT_VIP_COMMISSION_RATE,
                        mallCommissionRate: DEFAULT_MALL_COMMISSION_RATE,
                    },
                };
            }
            const now = new Date();
            const { data: referrals } = await this.supabase
                .from('officer_referrals')
                .select('id, commission_expire_date')
                .eq('officer_id', officer.id);
            const activeReferrals = (referrals || []).filter((r) => new Date(r.commission_expire_date) >= now);
            const { data: commissions } = await this.supabase
                .from('officer_commissions')
                .select('amount, status')
                .eq('officer_id', officer.id);
            const totalCommission = (commissions || []).reduce((sum, c) => sum + (c.amount || 0), 0);
            const availableCommission = (commissions || [])
                .filter((c) => c.status === 'available')
                .reduce((sum, c) => sum + (c.amount || 0), 0);
            const pendingCommission = (commissions || [])
                .filter((c) => c.status === 'pending')
                .reduce((sum, c) => sum + (c.amount || 0), 0);
            return {
                code: 200,
                msg: 'success',
                data: {
                    isOfficer: true,
                    officerInfo: officer,
                    totalInvitees: referrals?.length || 0,
                    activeInvitees: activeReferrals.length,
                    totalCommission,
                    availableCommission,
                    pendingCommission,
                    vipCommissionRate: officer.vip_commission_rate || DEFAULT_VIP_COMMISSION_RATE,
                    mallCommissionRate: officer.mall_commission_rate || DEFAULT_MALL_COMMISSION_RATE,
                },
            };
        }
        catch (error) {
            this.logger.error('获取推荐官状态失败:', error);
            return { code: 500, msg: '获取状态失败' };
        }
    }
    async getInvitees(openid) {
        try {
            const { data: officer } = await this.supabase
                .from('recommend_officers')
                .select('id')
                .eq('openid', openid)
                .single();
            if (!officer) {
                return { code: 200, msg: 'success', data: [] };
            }
            const { data: referrals, error } = await this.supabase
                .from('officer_referrals')
                .select(`
          user_id,
          commission_expire_date,
          total_commission,
          created_at
        `)
                .eq('officer_id', officer.id)
                .order('created_at', { ascending: false });
            if (error) {
                this.logger.error('查询邀请列表失败:', error);
                return { code: 500, msg: '查询失败', data: [] };
            }
            if (!referrals || referrals.length === 0) {
                return { code: 200, msg: 'success', data: [] };
            }
            const userIds = referrals.map((r) => r.user_id);
            const { data: users } = await this.supabase
                .from('users')
                .select('id, nickname, avatar_url')
                .in('id', userIds);
            const userMap = new Map((users || []).map((u) => [u.id, u]));
            const now = new Date();
            const invitees = referrals.map((r) => {
                const user = userMap.get(r.user_id);
                const isExpired = new Date(r.commission_expire_date) < now;
                return {
                    id: r.user_id,
                    nickname: user?.nickname || '用户',
                    avatar: user?.avatar_url || '',
                    isVip: false,
                    inviteDate: r.created_at?.split('T')[0] || '',
                    commission: r.total_commission || 0,
                    commissionExpireDate: r.commission_expire_date?.split('T')[0] || '',
                    isExpired,
                };
            });
            return { code: 200, msg: 'success', data: invitees };
        }
        catch (error) {
            this.logger.error('获取邀请列表失败:', error);
            return { code: 500, msg: '获取失败', data: [] };
        }
    }
    async bindUser(officerId, userId) {
        try {
            const { data: officer } = await this.supabase
                .from('recommend_officers')
                .select('id, status')
                .eq('id', officerId)
                .single();
            if (!officer || officer.status !== 'active') {
                return { code: 400, msg: '推荐官不存在或已失效', isNewBind: false };
            }
            const { data: existingBind } = await this.supabase
                .from('officer_referrals')
                .select('id, commission_expire_date')
                .eq('user_id', userId)
                .single();
            const now = new Date();
            if (existingBind) {
                if (new Date(existingBind.commission_expire_date) >= now) {
                    return { code: 200, msg: '已有有效的绑定关系', isNewBind: false };
                }
                const expireDate = new Date();
                expireDate.setFullYear(expireDate.getFullYear() + COMMISSION_BIND_YEARS);
                await this.supabase
                    .from('officer_referrals')
                    .update({
                    officer_id: officerId,
                    commission_expire_date: expireDate.toISOString(),
                })
                    .eq('id', existingBind.id);
                await this.supabase
                    .from('users')
                    .update({
                    officer_id: officerId,
                    officer_bind_time: new Date().toISOString(),
                })
                    .eq('id', userId);
                return { code: 200, msg: '重新绑定成功', isNewBind: true };
            }
            const expireDate = new Date();
            expireDate.setFullYear(expireDate.getFullYear() + COMMISSION_BIND_YEARS);
            const { error } = await this.supabase.from('officer_referrals').insert({
                officer_id: officerId,
                user_id: userId,
                commission_expire_date: expireDate.toISOString(),
                created_at: new Date().toISOString(),
            });
            if (error) {
                this.logger.error('创建绑定关系失败:', error);
                return { code: 500, msg: '绑定失败', isNewBind: false };
            }
            await this.supabase
                .from('users')
                .update({
                officer_id: officerId,
                officer_bind_time: new Date().toISOString(),
            })
                .eq('id', userId);
            await this.supabase.rpc('increment_officer_invitees', { officer_id: officerId });
            this.logger.log(`用户 ${userId} 绑定推荐官 ${officerId} 成功`);
            return { code: 200, msg: '绑定成功', isNewBind: true };
        }
        catch (error) {
            this.logger.error('绑定推荐官失败:', error);
            return { code: 500, msg: '绑定失败', isNewBind: false };
        }
    }
    async calculateCommission(openid, amount, paymentId, type = 'gift') {
        try {
            const { data: user } = await this.supabase
                .from('users')
                .select('id, officer_id')
                .eq('openid', openid)
                .single();
            if (!user || !user.officer_id) {
                this.logger.log(`用户 ${openid} 未绑定推荐官，不发放佣金`);
                return { success: false, commissionAmount: 0 };
            }
            const { data: officer } = await this.supabase
                .from('recommend_officers')
                .select('id, status, vip_commission_rate, mall_commission_rate')
                .eq('id', user.officer_id)
                .single();
            if (!officer || officer.status !== 'active') {
                this.logger.log(`推荐官 ${user.officer_id} 不存在或已失效`);
                return { success: false, commissionAmount: 0 };
            }
            const { data: bind } = await this.supabase
                .from('officer_referrals')
                .select('commission_expire_date')
                .eq('officer_id', officer.id)
                .eq('user_id', user.id)
                .single();
            if (!bind || new Date(bind.commission_expire_date) < new Date()) {
                this.logger.log(`用户 ${openid} 的推荐官绑定关系已过期`);
                return { success: false, commissionAmount: 0 };
            }
            const commissionRate = type === 'vip'
                ? officer.vip_commission_rate || DEFAULT_VIP_COMMISSION_RATE
                : officer.mall_commission_rate || DEFAULT_MALL_COMMISSION_RATE;
            const commissionAmount = Math.floor((amount * commissionRate) / 100);
            if (commissionAmount <= 0) {
                return { success: false, commissionAmount: 0 };
            }
            const { error } = await this.supabase.from('officer_commissions').insert({
                officer_id: officer.id,
                user_id: user.id,
                payment_id: paymentId,
                amount: commissionAmount,
                commission_rate: commissionRate,
                commission_type: type,
                status: 'available',
                expire_date: bind.commission_expire_date,
                created_at: new Date().toISOString(),
            });
            if (error) {
                this.logger.error('创建推荐官佣金记录失败:', error);
                return { success: false, commissionAmount: 0 };
            }
            await this.supabase
                .from('recommend_officers')
                .update({
                total_commission: officer.total_commission + commissionAmount,
                available_commission: officer.available_commission + commissionAmount,
                updated_at: new Date().toISOString(),
            })
                .eq('id', officer.id);
            await this.supabase
                .from('officer_referrals')
                .update({
                total_commission: bind.total_commission + commissionAmount,
            })
                .eq('officer_id', officer.id)
                .eq('user_id', user.id);
            this.logger.log(`推荐官佣金发放成功: 推荐官 ${officer.id} 获得 ${commissionAmount} 元 (${type} ${commissionRate}%)`);
            return { success: true, commissionAmount, officerId: officer.id };
        }
        catch (error) {
            this.logger.error('计算推荐官佣金失败:', error);
            return { success: false, commissionAmount: 0 };
        }
    }
    async getList(params) {
        try {
            const { page = 1, pageSize = 20, status, keyword } = params;
            const offset = (page - 1) * pageSize;
            let query = this.supabase.from('recommend_officers').select('*', { count: 'exact' });
            if (status) {
                query = query.eq('status', status);
            }
            if (keyword) {
                query = query.or(`real_name.ilike.%${keyword}%,phone.ilike.%${keyword}%`);
            }
            const { data, count, error } = await query
                .order('created_at', { ascending: false })
                .range(offset, offset + pageSize - 1);
            if (error) {
                this.logger.error('查询推荐官列表失败:', error);
                return { code: 500, msg: '查询失败', data: { list: [], total: 0 } };
            }
            return {
                code: 200,
                msg: 'success',
                data: {
                    list: data || [],
                    total: count || 0,
                },
            };
        }
        catch (error) {
            this.logger.error('获取推广列表失败:', error);
            return { code: 500, msg: '获取失败', data: { list: [], total: 0 } };
        }
    }
    async updateOfficer(officerId, updates) {
        try {
            const updateData = { updated_at: new Date().toISOString() };
            if (updates.vipCommissionRate !== undefined) {
                updateData.vip_commission_rate = updates.vipCommissionRate;
            }
            if (updates.mallCommissionRate !== undefined) {
                updateData.mall_commission_rate = updates.mallCommissionRate;
            }
            if (updates.status !== undefined) {
                updateData.status = updates.status;
            }
            if (updates.remark !== undefined) {
                updateData.remark = updates.remark;
            }
            const { error } = await this.supabase
                .from('recommend_officers')
                .update(updateData)
                .eq('id', officerId);
            if (error) {
                this.logger.error('更新推荐官失败:', error);
                return { code: 500, msg: '更新失败' };
            }
            this.logger.log(`更新推荐官 ${officerId} 成功: ${JSON.stringify(updates)}`);
            return { code: 200, msg: '更新成功' };
        }
        catch (error) {
            this.logger.error('更新推荐官异常:', error);
            return { code: 500, msg: '更新失败' };
        }
    }
    async getDetail(officerId) {
        try {
            const { data: officer, error } = await this.supabase
                .from('recommend_officers')
                .select('*')
                .eq('id', officerId)
                .single();
            if (error || !officer) {
                return { code: 404, msg: '推荐官不存在' };
            }
            const { data: referrals } = await this.supabase
                .from('officer_referrals')
                .select('id')
                .eq('officer_id', officerId);
            const { data: commissions } = await this.supabase
                .from('officer_commissions')
                .select('amount, status, commission_type')
                .eq('officer_id', officerId);
            const vipCommission = (commissions || [])
                .filter((c) => c.commission_type === 'vip')
                .reduce((sum, c) => sum + (c.amount || 0), 0);
            const mallCommission = (commissions || [])
                .filter((c) => c.commission_type === 'mall')
                .reduce((sum, c) => sum + (c.amount || 0), 0);
            return {
                code: 200,
                msg: 'success',
                data: {
                    ...officer,
                    stats: {
                        totalInvitees: referrals?.length || 0,
                        vipCommission,
                        mallCommission,
                    },
                },
            };
        }
        catch (error) {
            this.logger.error('获取推荐官详情失败:', error);
            return { code: 500, msg: '获取失败' };
        }
    }
};
exports.RecommendOfficerService = RecommendOfficerService;
exports.RecommendOfficerService = RecommendOfficerService = RecommendOfficerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], RecommendOfficerService);
//# sourceMappingURL=recommend-officer.service.js.map