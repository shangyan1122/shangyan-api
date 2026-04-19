"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ReferralService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const supabase_client_1 = require("../../storage/database/supabase-client");
const COMMISSION_BIND_YEARS = 3;
const VIP_COMMISSION_RATE = 30;
const MALL_COMMISSION_RATE = 10;
const PLATFORM_ACCOUNT_ID = 'platform';
let ReferralService = ReferralService_1 = class ReferralService {
    constructor() {
        this.logger = new common_1.Logger(ReferralService_1.name);
        this.supabase = (0, supabase_client_1.getSupabaseClient)();
    }
    async isFreePerson(openid) {
        try {
            const { data: user } = await this.supabase
                .from('users')
                .select('id, referrer_id')
                .eq('openid', openid)
                .single();
            if (!user || !user.referrer_id) {
                return true;
            }
            const { data: bind } = await this.supabase
                .from('referral_binds')
                .select('commission_expire_date')
                .eq('invitee_id', user.id)
                .eq('referrer_id', user.referrer_id)
                .single();
            if (!bind) {
                return true;
            }
            const isExpired = new Date(bind.commission_expire_date) < new Date();
            return isExpired;
        }
        catch (error) {
            this.logger.error('检查自由人状态失败:', error);
            return true;
        }
    }
    async getReferralStats(openid) {
        try {
            const { data: user } = await this.supabase
                .from('users')
                .select('id, referrer_id')
                .eq('openid', openid)
                .single();
            if (!user) {
                return {
                    code: 200,
                    msg: 'success',
                    data: {
                        referralCode: '',
                        totalInvitees: 0,
                        activeInvitees: 0,
                        totalCommission: 0,
                        availableCommission: 0,
                        pendingCommission: 0,
                        vipInvitees: 0,
                        expireDate: new Date(Date.now() + COMMISSION_BIND_YEARS * 365 * 24 * 60 * 60 * 1000)
                            .toISOString()
                            .split('T')[0],
                        isFreePerson: true,
                        referrerName: undefined,
                        referrerExpireDate: undefined,
                    },
                };
            }
            const referralCode = await this.getOrCreateReferralCode(openid);
            const { data: binds, error: bindsError } = await this.supabase
                .from('referral_binds')
                .select(`
          invitee_id,
          commission_expire_date,
          users!referral_binds_invitee_id_fkey (id)
        `)
                .eq('referrer_id', user.id);
            if (bindsError) {
                this.logger.error('查询邀请人绑定关系失败:', bindsError);
            }
            const now = new Date();
            const activeBinds = (binds || []).filter((b) => new Date(b.commission_expire_date) >= now);
            const totalInvitees = binds?.length || 0;
            const activeInvitees = activeBinds.length;
            const vipInvitees = 0;
            const { data: commissions, error: commissionsError } = await this.supabase
                .from('commissions')
                .select('amount, status')
                .eq('user_id', user.id);
            if (commissionsError) {
                this.logger.error('查询佣金失败:', commissionsError);
            }
            const totalCommission = commissions?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
            const availableCommission = commissions
                ?.filter((c) => c.status === 'available')
                .reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
            const pendingCommission = commissions
                ?.filter((c) => c.status === 'pending')
                .reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
            const isFreePerson = await this.isFreePerson(openid);
            let referrerName;
            let referrerExpireDate;
            if (user.referrer_id && !isFreePerson) {
                const { data: referrer } = await this.supabase
                    .from('users')
                    .select('nickname')
                    .eq('id', user.referrer_id)
                    .single();
                referrerName = referrer?.nickname;
                const { data: bind } = await this.supabase
                    .from('referral_binds')
                    .select('commission_expire_date')
                    .eq('invitee_id', user.id)
                    .eq('referrer_id', user.referrer_id)
                    .single();
                referrerExpireDate = bind?.commission_expire_date?.split('T')[0];
            }
            const expireDate = new Date();
            expireDate.setFullYear(expireDate.getFullYear() + COMMISSION_BIND_YEARS);
            return {
                code: 200,
                msg: 'success',
                data: {
                    referralCode: referralCode.data.code,
                    totalInvitees,
                    activeInvitees,
                    totalCommission,
                    availableCommission,
                    pendingCommission,
                    vipInvitees,
                    expireDate: expireDate.toISOString().split('T')[0],
                    isFreePerson,
                    referrerName,
                    referrerExpireDate,
                },
            };
        }
        catch (error) {
            this.logger.error('获取分销统计失败:', error);
            return {
                code: 500,
                msg: '获取分销统计失败',
                data: null,
            };
        }
    }
    async getInvitees(openid) {
        try {
            const { data: user } = await this.supabase
                .from('users')
                .select('id')
                .eq('openid', openid)
                .single();
            if (!user) {
                return { code: 200, msg: 'success', data: [] };
            }
            const { data: binds, error } = await this.supabase
                .from('referral_binds')
                .select(`
          invitee_id,
          commission_expire_date,
          total_commission,
          created_at
        `)
                .eq('referrer_id', user.id)
                .order('created_at', { ascending: false });
            if (error) {
                this.logger.error('查询邀请列表失败:', error);
                return { code: 500, msg: '查询失败', data: [] };
            }
            if (!binds || binds.length === 0) {
                return { code: 200, msg: 'success', data: [] };
            }
            const inviteeIds = binds.map((b) => b.invitee_id);
            const { data: inviteeUsers } = await this.supabase
                .from('users')
                .select('id, nickname, avatar_url')
                .in('id', inviteeIds);
            const inviteeMap = new Map((inviteeUsers || []).map((i) => [i.id, i]));
            const now = new Date();
            const invitees = [];
            for (const bind of binds) {
                const inviteeUser = inviteeMap.get(bind.invitee_id);
                if (!inviteeUser)
                    continue;
                const isExpired = new Date(bind.commission_expire_date) < now;
                const { data: giftRecords } = await this.supabase
                    .from('gift_records')
                    .select('amount')
                    .eq('guest_openid', bind.invitee_id);
                const totalSpent = giftRecords?.reduce((sum, g) => sum + (g.amount || 0), 0) || 0;
                invitees.push({
                    id: bind.invitee_id,
                    nickname: inviteeUser.nickname || '用户',
                    avatar: inviteeUser.avatar_url || '',
                    inviteDate: bind.created_at?.split('T')[0] || '',
                    isVip: false,
                    vipExpireDate: '',
                    totalSpent,
                    commission: bind.total_commission || 0,
                    commissionExpireDate: bind.commission_expire_date?.split('T')[0] || '',
                    isExpired,
                });
            }
            return { code: 200, msg: 'success', data: invitees };
        }
        catch (error) {
            this.logger.error('获取邀请列表失败:', error);
            return { code: 500, msg: '获取失败', data: [] };
        }
    }
    async getOrCreateReferralCode(openid) {
        try {
            let { data: user, error: userError } = await this.supabase
                .from('users')
                .select('id')
                .eq('openid', openid)
                .single();
            let userId;
            if (userError || !user) {
                const { data: newUser, error: createError } = await this.supabase
                    .from('users')
                    .insert({
                    openid,
                    created_at: new Date().toISOString(),
                })
                    .select('id')
                    .single();
                if (createError || !newUser) {
                    this.logger.error('创建用户失败:', createError);
                    return { code: 500, msg: '创建用户失败', data: { code: '' } };
                }
                userId = newUser.id;
            }
            else {
                userId = user.id;
            }
            const { data: existingCode, error: queryError } = await this.supabase
                .from('referral_codes')
                .select('code')
                .eq('user_id', userId)
                .single();
            if (existingCode) {
                return { code: 200, msg: 'success', data: { code: existingCode.code } };
            }
            const newCode = 'SYLJ' + Math.random().toString(36).substring(2, 8).toUpperCase();
            const { error: insertError } = await this.supabase.from('referral_codes').insert({
                user_id: userId,
                code: newCode,
                created_at: new Date().toISOString(),
            });
            if (insertError) {
                this.logger.error('创建邀请码失败:', insertError);
                return { code: 500, msg: '创建邀请码失败', data: { code: '' } };
            }
            return { code: 200, msg: 'success', data: { code: newCode } };
        }
        catch (error) {
            this.logger.error('获取邀请码失败:', error);
            return { code: 500, msg: '获取邀请码失败', data: { code: '' } };
        }
    }
    async bindOnGift(guestOpenid, hostOpenid, banquetId) {
        try {
            let guestUser = null;
            const { data: existingGuest } = await this.supabase
                .from('users')
                .select('id, referrer_id')
                .eq('openid', guestOpenid)
                .single();
            if (existingGuest) {
                guestUser = existingGuest;
            }
            let hostUser = null;
            const { data: existingHost } = await this.supabase
                .from('users')
                .select('id')
                .eq('openid', hostOpenid)
                .single();
            if (existingHost) {
                hostUser = existingHost;
            }
            if (!guestUser) {
                const { data: newUser } = await this.supabase
                    .from('users')
                    .insert({ openid: guestOpenid })
                    .select('id')
                    .single();
                if (newUser) {
                    guestUser = { id: newUser.id, referrer_id: undefined };
                }
            }
            if (!hostUser) {
                const { data: newUser } = await this.supabase
                    .from('users')
                    .insert({ openid: hostOpenid })
                    .select('id')
                    .single();
                hostUser = newUser;
            }
            if (!guestUser || !hostUser) {
                return { code: 500, msg: '获取用户信息失败', isNewBind: false };
            }
            if (guestUser.id === hostUser.id) {
                return { code: 200, msg: '自己随礼自己的宴会，无需绑定', isNewBind: false };
            }
            const isFree = await this.isFreePerson(guestOpenid);
            if (!isFree) {
                this.logger.log(`用户 ${guestOpenid} 已有有效上级，不重新绑定`);
                return { code: 200, msg: '已有上级关系', isNewBind: false };
            }
            const { data: existingBind } = await this.supabase
                .from('referral_binds')
                .select('id')
                .eq('invitee_id', guestUser.id)
                .eq('referrer_id', hostUser.id)
                .single();
            const expireDate = new Date();
            expireDate.setFullYear(expireDate.getFullYear() + COMMISSION_BIND_YEARS);
            if (existingBind) {
                const { error: updateError } = await this.supabase
                    .from('referral_binds')
                    .update({
                    commission_expire_date: expireDate.toISOString(),
                    updated_at: new Date().toISOString(),
                    bind_banquet_id: banquetId,
                })
                    .eq('id', existingBind.id);
                if (updateError) {
                    this.logger.error('更新绑定关系失败:', updateError);
                    return { code: 500, msg: '更新绑定失败', isNewBind: false };
                }
                this.logger.log(`重新绑定成功: ${guestOpenid} -> ${hostOpenid}, 有效期至 ${expireDate.toISOString()}`);
            }
            else {
                const { error: bindError } = await this.supabase.from('referral_binds').insert({
                    referrer_id: hostUser.id,
                    invitee_id: guestUser.id,
                    commission_rate: MALL_COMMISSION_RATE,
                    commission_expire_date: expireDate.toISOString(),
                    bind_banquet_id: banquetId,
                    created_at: new Date().toISOString(),
                });
                if (bindError) {
                    this.logger.error('创建绑定关系失败:', bindError);
                    return { code: 500, msg: '绑定失败', isNewBind: false };
                }
                this.logger.log(`新绑定成功: ${guestOpenid} -> ${hostOpenid}, 有效期至 ${expireDate.toISOString()}`);
            }
            await this.supabase.from('users').update({ referrer_id: hostUser.id }).eq('id', guestUser.id);
            return { code: 200, msg: '绑定成功', isNewBind: true };
        }
        catch (error) {
            this.logger.error('绑定上下级失败:', error);
            return { code: 500, msg: '绑定失败', isNewBind: false };
        }
    }
    async calculateCommission(openid, amount, paymentId, type = 'gift') {
        try {
            const { data: user } = await this.supabase
                .from('users')
                .select('id, referrer_id, officer_id')
                .eq('openid', openid)
                .single();
            if (!user) {
                this.logger.log(`用户 ${openid} 不存在，不发放佣金`);
                return { success: false, commissionAmount: 0 };
            }
            if (user.officer_id) {
                const { data: officerBind } = await this.supabase
                    .from('officer_referrals')
                    .select('commission_expire_date')
                    .eq('officer_id', user.officer_id)
                    .eq('user_id', user.id)
                    .single();
                if (officerBind && new Date(officerBind.commission_expire_date) >= new Date()) {
                    const { RecommendOfficerService } = await Promise.resolve().then(() => __importStar(require('../recommend-officer/recommend-officer.service')));
                    const officerService = new RecommendOfficerService();
                    const result = await officerService.calculateCommission(openid, amount, paymentId, type);
                    if (result.success) {
                        return {
                            success: true,
                            commissionAmount: result.commissionAmount,
                            referrerId: result.officerId,
                        };
                    }
                }
            }
            const isFree = await this.isFreePerson(openid);
            let commissionRate = MALL_COMMISSION_RATE;
            if (type === 'vip') {
                commissionRate = VIP_COMMISSION_RATE;
            }
            const commissionAmount = Math.floor((amount * commissionRate) / 100);
            if (commissionAmount <= 0) {
                return { success: false, commissionAmount: 0 };
            }
            let commissionRecipientId;
            let isPlatformCommission = false;
            if (isFree) {
                commissionRecipientId = PLATFORM_ACCOUNT_ID;
                isPlatformCommission = true;
                this.logger.log(`自由人 ${openid} 消费，佣金归平台: ${commissionAmount} 元`);
            }
            else {
                commissionRecipientId = user.referrer_id;
                const { data: bind } = await this.supabase
                    .from('referral_binds')
                    .select('commission_rate, commission_expire_date')
                    .eq('invitee_id', user.id)
                    .eq('referrer_id', user.referrer_id)
                    .single();
                if (!bind || new Date(bind.commission_expire_date) < new Date()) {
                    commissionRecipientId = PLATFORM_ACCOUNT_ID;
                    isPlatformCommission = true;
                    this.logger.log(`用户 ${openid} 绑定关系无效，佣金归平台: ${commissionAmount} 元`);
                }
            }
            const commissionRecord = {
                user_id: commissionRecipientId,
                invitee_id: user.id,
                payment_id: paymentId,
                amount: commissionAmount,
                commission_rate: commissionRate,
                commission_type: type,
                status: 'available',
                is_platform: isPlatformCommission,
                created_at: new Date().toISOString(),
            };
            if (!isPlatformCommission && user.referrer_id) {
                const { data: bind } = await this.supabase
                    .from('referral_binds')
                    .select('commission_expire_date, total_commission')
                    .eq('invitee_id', user.id)
                    .eq('referrer_id', user.referrer_id)
                    .single();
                if (bind) {
                    commissionRecord.expire_date = bind.commission_expire_date;
                    await this.supabase
                        .from('referral_binds')
                        .update({
                        total_commission: (bind.total_commission || 0) + commissionAmount,
                    })
                        .eq('invitee_id', user.id)
                        .eq('referrer_id', user.referrer_id);
                }
            }
            const { error: insertError } = await this.supabase
                .from('commissions')
                .insert(commissionRecord);
            if (insertError) {
                this.logger.error('创建佣金记录失败:', insertError);
                return { success: false, commissionAmount: 0 };
            }
            const recipientDesc = isPlatformCommission ? '平台' : `用户 ${commissionRecipientId}`;
            this.logger.log(`佣金发放成功: ${recipientDesc} 获得 ${commissionAmount} 元 (${type} ${commissionRate}%)`);
            return {
                success: true,
                commissionAmount,
                referrerId: isPlatformCommission ? PLATFORM_ACCOUNT_ID : commissionRecipientId,
            };
        }
        catch (error) {
            this.logger.error('计算佣金失败:', error);
            return { success: false, commissionAmount: 0 };
        }
    }
    async handleFreePersonCreateBanquet(openid) {
        try {
            const isFree = await this.isFreePerson(openid);
            if (!isFree) {
                return;
            }
            const { data: user } = await this.supabase
                .from('users')
                .select('id')
                .eq('openid', openid)
                .single();
            if (!user)
                return;
            const now = new Date();
            const { data: binds } = await this.supabase
                .from('referral_binds')
                .select('invitee_id')
                .eq('referrer_id', user.id)
                .gte('commission_expire_date', now.toISOString());
            if (!binds || binds.length === 0)
                return;
            for (const bind of binds) {
                await this.supabase
                    .from('referral_binds')
                    .update({
                    commission_to_platform: true,
                    platform_reason: 'creator_is_free_person',
                    updated_at: new Date().toISOString(),
                })
                    .eq('invitee_id', bind.invitee_id)
                    .eq('referrer_id', user.id);
            }
            this.logger.log(`自由人 ${openid} 创建宴会，${binds.length} 个下级的佣金将归平台`);
        }
        catch (error) {
            this.logger.error('处理自由人创建宴会失败:', error);
        }
    }
    async checkExpiredRelations() {
        try {
            const now = new Date();
            const { data: expiredBinds, error } = await this.supabase
                .from('referral_binds')
                .select('id, invitee_id, referrer_id')
                .lt('commission_expire_date', now.toISOString());
            if (error || !expiredBinds) {
                this.logger.error('查询过期关系失败:', error);
                return { expiredCount: 0 };
            }
            let expiredCount = 0;
            for (const bind of expiredBinds) {
                await this.supabase.from('users').update({ referrer_id: null }).eq('id', bind.invitee_id);
                expiredCount++;
            }
            this.logger.log(`检测完成：${expiredCount} 个用户变为自由人`);
            return { expiredCount };
        }
        catch (error) {
            this.logger.error('检测过期关系失败:', error);
            return { expiredCount: 0 };
        }
    }
    async bindReferrer(openid, referralCode) {
        try {
            let { data: currentUser } = await this.supabase
                .from('users')
                .select('id')
                .eq('openid', openid)
                .single();
            if (!currentUser) {
                const { data: newUser } = await this.supabase
                    .from('users')
                    .insert({ openid })
                    .select('id')
                    .single();
                currentUser = newUser;
            }
            if (!currentUser) {
                return { code: 500, msg: '获取用户信息失败' };
            }
            const currentUserId = currentUser.id;
            const { data: referrerCode, error: referrerError } = await this.supabase
                .from('referral_codes')
                .select('user_id')
                .eq('code', referralCode)
                .single();
            if (referrerError || !referrerCode) {
                return { code: 400, msg: '邀请码无效' };
            }
            if (referrerCode.user_id === currentUserId) {
                return { code: 400, msg: '不能使用自己的邀请码' };
            }
            const isFree = await this.isFreePerson(openid);
            if (!isFree) {
                return { code: 400, msg: '您已有有效的邀请人' };
            }
            const expireDate = new Date();
            expireDate.setFullYear(expireDate.getFullYear() + COMMISSION_BIND_YEARS);
            const { data: existingBind } = await this.supabase
                .from('referral_binds')
                .select('id')
                .eq('invitee_id', currentUserId)
                .single();
            if (existingBind) {
                await this.supabase
                    .from('referral_binds')
                    .update({
                    referrer_id: referrerCode.user_id,
                    commission_expire_date: expireDate.toISOString(),
                    updated_at: new Date().toISOString(),
                })
                    .eq('id', existingBind.id);
            }
            else {
                await this.supabase.from('referral_binds').insert({
                    referrer_id: referrerCode.user_id,
                    invitee_id: currentUserId,
                    commission_rate: MALL_COMMISSION_RATE,
                    commission_expire_date: expireDate.toISOString(),
                    created_at: new Date().toISOString(),
                });
            }
            await this.supabase
                .from('users')
                .update({ referrer_id: referrerCode.user_id })
                .eq('id', currentUserId);
            return { code: 200, msg: '绑定成功' };
        }
        catch (error) {
            this.logger.error('绑定邀请关系失败:', error);
            return { code: 500, msg: '绑定失败' };
        }
    }
    async getCommissionHistory(openid) {
        try {
            const { data: user } = await this.supabase
                .from('users')
                .select('id')
                .eq('openid', openid)
                .single();
            if (!user) {
                return { code: 200, msg: 'success', data: [] };
            }
            const { data: commissionsData, error } = await this.supabase
                .from('commissions')
                .select(`
          id,
          amount,
          commission_rate,
          commission_type,
          status,
          created_at,
          expire_date,
          invitee_id
        `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) {
                this.logger.error('查询佣金明细失败:', error);
                return { code: 500, msg: '查询失败', data: [] };
            }
            const inviteeIds = [...new Set((commissionsData || []).map((c) => c.invitee_id))];
            const { data: invitees } = await this.supabase
                .from('users')
                .select('id, nickname, avatar')
                .in('id', inviteeIds);
            const inviteeMap = new Map((invitees || []).map((i) => [i.id, i]));
            const result = (commissionsData || []).map((c) => ({
                id: c.id,
                amount: c.amount,
                commissionRate: c.commission_rate,
                commissionType: c.commission_type,
                status: c.status,
                createdAt: c.created_at,
                expireDate: c.expire_date,
                invitee: inviteeMap.get(c.invitee_id) || { nickname: '用户', avatar: '' },
            }));
            return { code: 200, msg: 'success', data: result };
        }
        catch (error) {
            this.logger.error('获取佣金明细失败:', error);
            return { code: 500, msg: '获取失败', data: [] };
        }
    }
    async ensureUserExists(openid, nickname, avatar) {
        try {
            const { data: existingUser } = await this.supabase
                .from('users')
                .select('id')
                .eq('openid', openid)
                .single();
            if (existingUser) {
                if (nickname || avatar) {
                    await this.supabase
                        .from('users')
                        .update({ nickname, avatar, updated_at: new Date().toISOString() })
                        .eq('openid', openid);
                }
                return existingUser.id;
            }
            const { data: newUser, error } = await this.supabase
                .from('users')
                .insert({
                openid,
                nickname,
                avatar,
                created_at: new Date().toISOString(),
            })
                .select('id')
                .single();
            if (error) {
                this.logger.error('创建用户失败:', error);
                throw error;
            }
            await this.getOrCreateReferralCode(openid);
            return newUser.id;
        }
        catch (error) {
            this.logger.error('确保用户存在失败:', error);
            throw error;
        }
    }
    async handleExpiredRelationsCron() {
        this.logger.log('开始执行定时任务：检测过期分销关系');
        try {
            const result = await this.checkExpiredRelations();
            this.logger.log(`定时任务完成：${result.expiredCount} 个用户变为自由人`);
        }
        catch (error) {
            this.logger.error('定时任务执行失败:', error);
        }
    }
};
exports.ReferralService = ReferralService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_2AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReferralService.prototype, "handleExpiredRelationsCron", null);
exports.ReferralService = ReferralService = ReferralService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], ReferralService);
//# sourceMappingURL=referral.service.js.map