import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 分销规则常量
const COMMISSION_BIND_YEARS = 3; // 绑定有效期：3年
const VIP_COMMISSION_RATE = 30; // VIP开通佣金：30%
const MALL_COMMISSION_RATE = 10; // 商城消费佣金：10%
const PLATFORM_ACCOUNT_ID = 'platform'; // 平台账户ID

export interface ReferralStats {
  referralCode: string;
  totalInvitees: number;
  activeInvitees: number;
  totalCommission: number;
  availableCommission: number;
  pendingCommission: number;
  vipInvitees: number;
  expireDate: string;
  isFreePerson: boolean; // 是否是自由人
  referrerName?: string; // 上级名称
  referrerExpireDate?: string; // 上级关系过期时间
}

export interface Invitee {
  id: string;
  nickname: string;
  avatar: string;
  inviteDate: string;
  isVip: boolean;
  vipExpireDate?: string;
  totalSpent: number;
  commission: number;
  commissionExpireDate: string;
  isExpired: boolean; // 关系是否过期
}

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = getSupabaseClient();
  }

  /**
   * 检查用户是否是自由人（无上级或上级关系已过期）
   */
  async isFreePerson(openid: string): Promise<boolean> {
    try {
      const { data: user } = await this.supabase
        .from('users')
        .select('id, referrer_id')
        .eq('openid', openid)
        .single();

      if (!user || !user.referrer_id) {
        return true; // 无上级，是自由人
      }

      // 检查绑定关系是否过期
      const { data: bind } = await this.supabase
        .from('referral_binds')
        .select('commission_expire_date')
        .eq('invitee_id', user.id)
        .eq('referrer_id', user.referrer_id)
        .single();

      if (!bind) {
        return true; // 无绑定记录，是自由人
      }

      const isExpired = new Date(bind.commission_expire_date) < new Date();
      return isExpired;
    } catch (error) {
      this.logger.error('检查自由人状态失败:', error);
      return true; // 出错时默认为自由人
    }
  }

  /**
   * 获取分销统计数据
   */
  async getReferralStats(
    openid: string
  ): Promise<{ code: number; msg: string; data: ReferralStats }> {
    try {
      // 获取用户ID和上级信息
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

      // 获取用户邀请码
      const referralCode = await this.getOrCreateReferralCode(openid);

      // 查询邀请人数（有效的，未过期的）
      const { data: binds, error: bindsError } = await this.supabase
        .from('referral_binds')
        .select(
          `
          invitee_id,
          commission_expire_date,
          users!referral_binds_invitee_id_fkey (id)
        `
        )
        .eq('referrer_id', user.id);

      if (bindsError) {
        this.logger.error('查询邀请人绑定关系失败:', bindsError);
      }

      const now = new Date();
      const activeBinds = (binds || []).filter(
        (b: any) => new Date(b.commission_expire_date) >= now
      );
      const totalInvitees = binds?.length || 0;
      const activeInvitees = activeBinds.length;
      const vipInvitees = 0; // users 表暂无 is_vip 字段

      // 查询佣金统计
      const { data: commissions, error: commissionsError } = await this.supabase
        .from('commissions')
        .select('amount, status')
        .eq('user_id', user.id);

      if (commissionsError) {
        this.logger.error('查询佣金失败:', commissionsError);
      }

      const totalCommission =
        commissions?.reduce((sum: number, c: any) => sum + (c.amount || 0), 0) || 0;
      const availableCommission =
        commissions
          ?.filter((c: any) => c.status === 'available')
          .reduce((sum: number, c: any) => sum + (c.amount || 0), 0) || 0;
      const pendingCommission =
        commissions
          ?.filter((c: any) => c.status === 'pending')
          .reduce((sum: number, c: any) => sum + (c.amount || 0), 0) || 0;

      // 检查是否是自由人
      const isFreePerson = await this.isFreePerson(openid);

      // 获取上级信息
      let referrerName: string | undefined;
      let referrerExpireDate: string | undefined;

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

      // 计算默认到期时间（3年后）
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
    } catch (error) {
      this.logger.error('获取分销统计失败:', error);
      return {
        code: 500,
        msg: '获取分销统计失败',
        data: null as any,
      };
    }
  }

  /**
   * 获取邀请列表
   */
  async getInvitees(openid: string): Promise<{ code: number; msg: string; data: Invitee[] }> {
    try {
      // 获取用户ID
      const { data: user } = await this.supabase
        .from('users')
        .select('id')
        .eq('openid', openid)
        .single();

      if (!user) {
        return { code: 200, msg: 'success', data: [] };
      }

      // 获取所有绑定关系
      const { data: binds, error } = await this.supabase
        .from('referral_binds')
        .select(
          `
          invitee_id,
          commission_expire_date,
          total_commission,
          created_at
        `
        )
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error('查询邀请列表失败:', error);
        return { code: 500, msg: '查询失败', data: [] };
      }

      if (!binds || binds.length === 0) {
        return { code: 200, msg: 'success', data: [] };
      }

      // 获取被邀请人详细信息
      const inviteeIds = binds.map((b) => b.invitee_id);
      const { data: inviteeUsers } = await this.supabase
        .from('users')
        .select('id, nickname, avatar_url') // 修正: avatar_url 而非 avatar，移除了不存在的 is_vip, vip_expire_date
        .in('id', inviteeIds);

      const inviteeMap = new Map((inviteeUsers || []).map((i: any) => [i.id, i]));

      const now = new Date();
      const invitees: Invitee[] = [];

      for (const bind of binds) {
        const inviteeUser = inviteeMap.get(bind.invitee_id);
        if (!inviteeUser) continue;

        const isExpired = new Date(bind.commission_expire_date) < now;

        // 查询消费总额
        const { data: giftRecords } = await this.supabase
          .from('gift_records')
          .select('amount')
          .eq('guest_openid', bind.invitee_id);

        const totalSpent =
          giftRecords?.reduce((sum: number, g: any) => sum + (g.amount || 0), 0) || 0;

        invitees.push({
          id: bind.invitee_id,
          nickname: inviteeUser.nickname || '用户',
          avatar: inviteeUser.avatar_url || '', // 使用 avatar_url 字段
          inviteDate: bind.created_at?.split('T')[0] || '',
          isVip: false, // users 表暂无 is_vip 字段
          vipExpireDate: '', // users 表暂无 vip_expire_date 字段
          totalSpent,
          commission: bind.total_commission || 0,
          commissionExpireDate: bind.commission_expire_date?.split('T')[0] || '',
          isExpired,
        });
      }

      return { code: 200, msg: 'success', data: invitees };
    } catch (error) {
      this.logger.error('获取邀请列表失败:', error);
      return { code: 500, msg: '获取失败', data: [] };
    }
  }

  /**
   * 获取或创建邀请码
   */
  async getOrCreateReferralCode(
    openid: string
  ): Promise<{ code: number; msg: string; data: { code: string } }> {
    try {
      // 获取用户ID
      let { data: user, error: userError } = await this.supabase
        .from('users')
        .select('id')
        .eq('openid', openid)
        .single();

      let userId: string;

      if (userError || !user) {
        // 创建用户
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
      } else {
        userId = user.id;
      }

      // 查询现有邀请码
      const { data: existingCode, error: queryError } = await this.supabase
        .from('referral_codes')
        .select('code')
        .eq('user_id', userId)
        .single();

      if (existingCode) {
        return { code: 200, msg: 'success', data: { code: existingCode.code } };
      }

      // 生成新邀请码
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
    } catch (error) {
      this.logger.error('获取邀请码失败:', error);
      return { code: 500, msg: '获取邀请码失败', data: { code: '' } };
    }
  }

  /**
   * 扫码随礼时绑定上下级关系（核心方法）
   * 规则1：扫码随礼 → 绑定上下级（3年）
   * 规则5：自由人去随礼 → 重新绑定
   */
  async bindOnGift(
    guestOpenid: string,
    hostOpenid: string,
    banquetId: string
  ): Promise<{ code: number; msg: string; isNewBind: boolean }> {
    try {
      // 获取双方用户信息
      let guestUser: { id: string; referrer_id?: string } | null = null;
      const { data: existingGuest } = await this.supabase
        .from('users')
        .select('id, referrer_id')
        .eq('openid', guestOpenid)
        .single();

      if (existingGuest) {
        guestUser = existingGuest;
      }

      let hostUser: { id: string } | null = null;
      const { data: existingHost } = await this.supabase
        .from('users')
        .select('id')
        .eq('openid', hostOpenid)
        .single();

      if (existingHost) {
        hostUser = existingHost;
      }

      // 如果嘉宾不存在，创建用户
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

      // 如果主办方不存在，创建用户
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

      // 不能绑定自己
      if (guestUser.id === hostUser.id) {
        return { code: 200, msg: '自己随礼自己的宴会，无需绑定', isNewBind: false };
      }

      // 检查嘉宾是否是自由人（无上级或上级已过期）
      const isFree = await this.isFreePerson(guestOpenid);

      if (!isFree) {
        // 有有效的上级关系，不重新绑定
        this.logger.log(`用户 ${guestOpenid} 已有有效上级，不重新绑定`);
        return { code: 200, msg: '已有上级关系', isNewBind: false };
      }

      // 检查是否已有过期的绑定记录需要更新
      const { data: existingBind } = await this.supabase
        .from('referral_binds')
        .select('id')
        .eq('invitee_id', guestUser.id)
        .eq('referrer_id', hostUser.id)
        .single();

      // 计算新的过期时间：3年后
      const expireDate = new Date();
      expireDate.setFullYear(expireDate.getFullYear() + COMMISSION_BIND_YEARS);

      if (existingBind) {
        // 更新已有绑定关系的过期时间
        const { error: updateError } = await this.supabase
          .from('referral_binds')
          .update({
            commission_expire_date: expireDate.toISOString(),
            updated_at: new Date().toISOString(),
            bind_banquet_id: banquetId, // 记录本次绑定的宴会ID
          })
          .eq('id', existingBind.id);

        if (updateError) {
          this.logger.error('更新绑定关系失败:', updateError);
          return { code: 500, msg: '更新绑定失败', isNewBind: false };
        }

        this.logger.log(
          `重新绑定成功: ${guestOpenid} -> ${hostOpenid}, 有效期至 ${expireDate.toISOString()}`
        );
      } else {
        // 创建新的绑定关系
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

        this.logger.log(
          `新绑定成功: ${guestOpenid} -> ${hostOpenid}, 有效期至 ${expireDate.toISOString()}`
        );
      }

      // 更新用户的 referrer_id
      await this.supabase.from('users').update({ referrer_id: hostUser.id }).eq('id', guestUser.id);

      return { code: 200, msg: '绑定成功', isNewBind: true };
    } catch (error) {
      this.logger.error('绑定上下级失败:', error);
      return { code: 500, msg: '绑定失败', isNewBind: false };
    }
  }

  /**
   * 计算并发放佣金（在支付成功时调用）
   * 规则2：下级消费 → 上级得佣金
   *   - VIP开通：30%
   *   - 商城消费：10%
   * 规则：自由人消费 → 佣金归平台所有
   * 优先级：推荐官 > 上级 > 平台
   */
  async calculateCommission(
    openid: string,
    amount: number,
    paymentId: string,
    type: 'vip' | 'mall' | 'gift' = 'gift'
  ): Promise<{ success: boolean; commissionAmount: number; referrerId?: string }> {
    try {
      // 获取用户（包含推荐官信息）
      const { data: user } = await this.supabase
        .from('users')
        .select('id, referrer_id, officer_id')
        .eq('openid', openid)
        .single();

      if (!user) {
        this.logger.log(`用户 ${openid} 不存在，不发放佣金`);
        return { success: false, commissionAmount: 0 };
      }

      // 优先检查推荐官绑定
      if (user.officer_id) {
        // 检查推荐官绑定是否有效
        const { data: officerBind } = await this.supabase
          .from('officer_referrals')
          .select('commission_expire_date')
          .eq('officer_id', user.officer_id)
          .eq('user_id', user.id)
          .single();

        if (officerBind && new Date(officerBind.commission_expire_date) >= new Date()) {
          // 有有效的推荐官绑定，调用推荐官佣金计算
          const { RecommendOfficerService } =
            await import('../recommend-officer/recommend-officer.service');
          const officerService = new RecommendOfficerService();
          const result = await officerService.calculateCommission(openid, amount, paymentId, type);

          if (result.success) {
            return {
              success: true,
              commissionAmount: result.commissionAmount,
              referrerId: result.officerId,
            };
          }
          // 推荐官佣金计算失败，继续走原有逻辑
        }
      }

      // 检查是否是自由人（无上级或上级关系已过期）
      const isFree = await this.isFreePerson(openid);

      // 根据类型确定佣金比例
      let commissionRate = MALL_COMMISSION_RATE; // 默认10%
      if (type === 'vip') {
        commissionRate = VIP_COMMISSION_RATE; // VIP 30%
      }

      // 计算佣金
      const commissionAmount = Math.floor((amount * commissionRate) / 100);

      if (commissionAmount <= 0) {
        return { success: false, commissionAmount: 0 };
      }

      // 确定佣金接收方
      let commissionRecipientId: string;
      let isPlatformCommission = false;

      if (isFree) {
        // 自由人消费 → 佣金归平台
        commissionRecipientId = PLATFORM_ACCOUNT_ID;
        isPlatformCommission = true;
        this.logger.log(`自由人 ${openid} 消费，佣金归平台: ${commissionAmount} 元`);
      } else {
        // 有上级 → 佣金给上级
        commissionRecipientId = user.referrer_id!;

        // 再次验证绑定关系有效性
        const { data: bind } = await this.supabase
          .from('referral_binds')
          .select('commission_rate, commission_expire_date')
          .eq('invitee_id', user.id)
          .eq('referrer_id', user.referrer_id)
          .single();

        if (!bind || new Date(bind.commission_expire_date) < new Date()) {
          // 绑定关系无效，佣金归平台
          commissionRecipientId = PLATFORM_ACCOUNT_ID;
          isPlatformCommission = true;
          this.logger.log(`用户 ${openid} 绑定关系无效，佣金归平台: ${commissionAmount} 元`);
        }
      }

      // 创建佣金记录
      const commissionRecord: any = {
        user_id: commissionRecipientId,
        invitee_id: user.id,
        payment_id: paymentId,
        amount: commissionAmount,
        commission_rate: commissionRate,
        commission_type: type,
        status: 'available',
        is_platform: isPlatformCommission, // 标记是否为平台佣金
        created_at: new Date().toISOString(),
      };

      // 非平台佣金需要设置过期时间
      if (!isPlatformCommission && user.referrer_id) {
        const { data: bind } = await this.supabase
          .from('referral_binds')
          .select('commission_expire_date, total_commission')
          .eq('invitee_id', user.id)
          .eq('referrer_id', user.referrer_id)
          .single();

        if (bind) {
          commissionRecord.expire_date = bind.commission_expire_date;

          // 更新绑定关系的累计佣金
          await this.supabase
            .from('referral_binds')
            .update({
              total_commission: ((bind as any).total_commission || 0) + commissionAmount,
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
      this.logger.log(
        `佣金发放成功: ${recipientDesc} 获得 ${commissionAmount} 元 (${type} ${commissionRate}%)`
      );

      return {
        success: true,
        commissionAmount,
        referrerId: isPlatformCommission ? PLATFORM_ACCOUNT_ID : commissionRecipientId,
      };
    } catch (error) {
      this.logger.error('计算佣金失败:', error);
      return { success: false, commissionAmount: 0 };
    }
  }

  /**
   * 自由人创建宴会 → 佣金归平台
   * 规则4：自由人创建宴会时，其所有下级的佣金归平台
   */
  async handleFreePersonCreateBanquet(openid: string): Promise<void> {
    try {
      const isFree = await this.isFreePerson(openid);
      if (!isFree) {
        return; // 不是自由人，不处理
      }

      // 获取用户ID
      const { data: user } = await this.supabase
        .from('users')
        .select('id')
        .eq('openid', openid)
        .single();

      if (!user) return;

      // 查询该用户的所有下级（有效的绑定关系）
      const now = new Date();
      const { data: binds } = await this.supabase
        .from('referral_binds')
        .select('invitee_id')
        .eq('referrer_id', user.id)
        .gte('commission_expire_date', now.toISOString());

      if (!binds || binds.length === 0) return;

      // 更新这些绑定关系，标记佣金归平台
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
    } catch (error) {
      this.logger.error('处理自由人创建宴会失败:', error);
    }
  }

  /**
   * 定时任务：检测过期关系，将过期用户变为自由人
   * 规则3：过期后 → 变成自由人
   */
  async checkExpiredRelations(): Promise<{ expiredCount: number }> {
    try {
      const now = new Date();

      // 查询所有过期的绑定关系
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
        // 更新用户的 referrer_id 为 null（变为自由人）
        await this.supabase.from('users').update({ referrer_id: null }).eq('id', bind.invitee_id);

        expiredCount++;
      }

      this.logger.log(`检测完成：${expiredCount} 个用户变为自由人`);
      return { expiredCount };
    } catch (error) {
      this.logger.error('检测过期关系失败:', error);
      return { expiredCount: 0 };
    }
  }

  /**
   * 绑定邀请关系（通过邀请码）
   */
  async bindReferrer(openid: string, referralCode: string): Promise<{ code: number; msg: string }> {
    try {
      // 获取当前用户
      let { data: currentUser } = await this.supabase
        .from('users')
        .select('id')
        .eq('openid', openid)
        .single();

      if (!currentUser) {
        // 创建用户
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

      // 查询邀请码对应的用户
      const { data: referrerCode, error: referrerError } = await this.supabase
        .from('referral_codes')
        .select('user_id')
        .eq('code', referralCode)
        .single();

      if (referrerError || !referrerCode) {
        return { code: 400, msg: '邀请码无效' };
      }

      // 不能邀请自己
      if (referrerCode.user_id === currentUserId) {
        return { code: 400, msg: '不能使用自己的邀请码' };
      }

      // 检查是否已有有效的邀请关系
      const isFree = await this.isFreePerson(openid);
      if (!isFree) {
        return { code: 400, msg: '您已有有效的邀请人' };
      }

      // 计算过期时间：3年后
      const expireDate = new Date();
      expireDate.setFullYear(expireDate.getFullYear() + COMMISSION_BIND_YEARS);

      // 检查是否有已过期的绑定记录需要更新
      const { data: existingBind } = await this.supabase
        .from('referral_binds')
        .select('id')
        .eq('invitee_id', currentUserId)
        .single();

      if (existingBind) {
        // 更新已有绑定
        await this.supabase
          .from('referral_binds')
          .update({
            referrer_id: referrerCode.user_id,
            commission_expire_date: expireDate.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingBind.id);
      } else {
        // 创建新的绑定关系
        await this.supabase.from('referral_binds').insert({
          referrer_id: referrerCode.user_id,
          invitee_id: currentUserId,
          commission_rate: MALL_COMMISSION_RATE,
          commission_expire_date: expireDate.toISOString(),
          created_at: new Date().toISOString(),
        });
      }

      // 更新用户的 referrer_id
      await this.supabase
        .from('users')
        .update({ referrer_id: referrerCode.user_id })
        .eq('id', currentUserId);

      return { code: 200, msg: '绑定成功' };
    } catch (error) {
      this.logger.error('绑定邀请关系失败:', error);
      return { code: 500, msg: '绑定失败' };
    }
  }

  /**
   * 获取佣金明细
   */
  async getCommissionHistory(openid: string): Promise<{ code: number; msg: string; data: any[] }> {
    try {
      // 获取用户ID
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
        .select(
          `
          id,
          amount,
          commission_rate,
          commission_type,
          status,
          created_at,
          expire_date,
          invitee_id
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        this.logger.error('查询佣金明细失败:', error);
        return { code: 500, msg: '查询失败', data: [] };
      }

      // 获取被邀请人信息
      const inviteeIds = [...new Set((commissionsData || []).map((c: any) => c.invitee_id))];
      const { data: invitees } = await this.supabase
        .from('users')
        .select('id, nickname, avatar')
        .in('id', inviteeIds);

      const inviteeMap = new Map((invitees || []).map((i: any) => [i.id, i]));

      const result = (commissionsData || []).map((c: any) => ({
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
    } catch (error) {
      this.logger.error('获取佣金明细失败:', error);
      return { code: 500, msg: '获取失败', data: [] };
    }
  }

  /**
   * 用户登录/注册时调用
   */
  async ensureUserExists(openid: string, nickname?: string, avatar?: string): Promise<string> {
    try {
      const { data: existingUser } = await this.supabase
        .from('users')
        .select('id')
        .eq('openid', openid)
        .single();

      if (existingUser) {
        // 更新用户信息
        if (nickname || avatar) {
          await this.supabase
            .from('users')
            .update({ nickname, avatar, updated_at: new Date().toISOString() })
            .eq('openid', openid);
        }
        return existingUser.id;
      }

      // 创建新用户
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

      // 自动生成邀请码
      await this.getOrCreateReferralCode(openid);

      return newUser.id;
    } catch (error) {
      this.logger.error('确保用户存在失败:', error);
      throw error;
    }
  }

  /**
   * 定时任务：每天凌晨2点检测过期关系
   * 规则3：过期后 → 变成自由人
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleExpiredRelationsCron() {
    this.logger.log('开始执行定时任务：检测过期分销关系');
    try {
      const result = await this.checkExpiredRelations();
      this.logger.log(`定时任务完成：${result.expiredCount} 个用户变为自由人`);
    } catch (error) {
      this.logger.error('定时任务执行失败:', error);
    }
  }
}
