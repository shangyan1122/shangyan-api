import { Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 推荐官佣金规则常量
const DEFAULT_VIP_COMMISSION_RATE = 30; // 默认VIP开通佣金：30%
const DEFAULT_MALL_COMMISSION_RATE = 10; // 默认商城消费佣金：10%
const COMMISSION_BIND_YEARS = 3; // 绑定有效期：3年
const PLATFORM_ACCOUNT_ID = 'platform'; // 平台账户ID

export interface RecommendOfficerInfo {
  id: string;
  openid: string;
  realName: string;
  idCard?: string;
  phone?: string;
  status: string;
  vipCommissionRate: number;
  mallCommissionRate: number;
  totalCommission: number;
  availableCommission: number;
  totalInvitees: number;
  createdAt: string;
}

export interface OfficerStats {
  totalInvitees: number;
  activeInvitees: number;
  totalCommission: number;
  availableCommission: number;
  pendingCommission: number;
  vipCommissionRate: number;
  mallCommissionRate: number;
}

@Injectable()
export class RecommendOfficerService {
  private readonly logger = new Logger(RecommendOfficerService.name);
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = getSupabaseClient();
  }

  /**
   * 申请成为推荐官
   * 微信实名授权后调用
   */
  async apply(
    openid: string,
    realName: string,
    idCard?: string,
    phone?: string
  ): Promise<{ code: number; msg: string; data?: RecommendOfficerInfo }> {
    try {
      // 检查是否已经是推荐官
      const { data: existing } = await this.supabase
        .from('recommend_officers')
        .select('*')
        .eq('openid', openid)
        .single();

      if (existing) {
        if (existing.status === 'active') {
          return { code: 400, msg: '您已是推荐官', data: existing as any };
        }
        if (existing.status === 'banned') {
          return { code: 400, msg: '您的推荐官资格已被禁用，请联系客服' };
        }
        // 重新激活
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
        return { code: 200, msg: '重新激活成功', data: updated as any };
      }

      // 创建新推荐官
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
      return { code: 200, msg: '申请成功', data: newOfficer as any };
    } catch (error) {
      this.logger.error('申请推荐官异常:', error);
      return { code: 500, msg: '申请失败' };
    }
  }

  /**
   * 获取推荐官状态
   */
  async getStatus(openid: string): Promise<{
    code: number;
    msg: string;
    data?: OfficerStats & { isOfficer: boolean; officerInfo?: RecommendOfficerInfo };
  }> {
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

      // 获取邀请统计
      const now = new Date();
      const { data: referrals } = await this.supabase
        .from('officer_referrals')
        .select('id, commission_expire_date')
        .eq('officer_id', officer.id);

      const activeReferrals = (referrals || []).filter(
        (r: any) => new Date(r.commission_expire_date) >= now
      );

      // 获取佣金统计
      const { data: commissions } = await this.supabase
        .from('officer_commissions')
        .select('amount, status')
        .eq('officer_id', officer.id);

      const totalCommission = (commissions || []).reduce(
        (sum: number, c: any) => sum + (c.amount || 0),
        0
      );
      const availableCommission = (commissions || [])
        .filter((c: any) => c.status === 'available')
        .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
      const pendingCommission = (commissions || [])
        .filter((c: any) => c.status === 'pending')
        .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

      return {
        code: 200,
        msg: 'success',
        data: {
          isOfficer: true,
          officerInfo: officer as any,
          totalInvitees: referrals?.length || 0,
          activeInvitees: activeReferrals.length,
          totalCommission,
          availableCommission,
          pendingCommission,
          vipCommissionRate: officer.vip_commission_rate || DEFAULT_VIP_COMMISSION_RATE,
          mallCommissionRate: officer.mall_commission_rate || DEFAULT_MALL_COMMISSION_RATE,
        },
      };
    } catch (error) {
      this.logger.error('获取推荐官状态失败:', error);
      return { code: 500, msg: '获取状态失败' };
    }
  }

  /**
   * 获取推荐官邀请列表
   */
  async getInvitees(openid: string): Promise<{ code: number; msg: string; data: any[] }> {
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
        .select(
          `
          user_id,
          commission_expire_date,
          total_commission,
          created_at
        `
        )
        .eq('officer_id', officer.id)
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error('查询邀请列表失败:', error);
        return { code: 500, msg: '查询失败', data: [] };
      }

      if (!referrals || referrals.length === 0) {
        return { code: 200, msg: 'success', data: [] };
      }

      // 获取用户详细信息
      const userIds = referrals.map((r) => r.user_id);
      const { data: users } = await this.supabase
        .from('users')
        .select('id, nickname, avatar_url') // 修正: avatar_url 而非 avatar，移除了不存在的 is_vip, vip_expire_date
        .in('id', userIds);

      const userMap = new Map((users || []).map((u: any) => [u.id, u]));

      const now = new Date();
      const invitees = referrals.map((r) => {
        const user = userMap.get(r.user_id);
        const isExpired = new Date(r.commission_expire_date) < now;
        return {
          id: r.user_id,
          nickname: user?.nickname || '用户',
          avatar: user?.avatar_url || '', // 使用 avatar_url 字段
          isVip: false, // users 表暂无 is_vip 字段
          inviteDate: r.created_at?.split('T')[0] || '',
          commission: r.total_commission || 0,
          commissionExpireDate: r.commission_expire_date?.split('T')[0] || '',
          isExpired,
        };
      });

      return { code: 200, msg: 'success', data: invitees };
    } catch (error) {
      this.logger.error('获取邀请列表失败:', error);
      return { code: 500, msg: '获取失败', data: [] };
    }
  }

  /**
   * 绑定用户到推荐官
   * 当用户通过推荐官链接进入时调用
   */
  async bindUser(
    officerId: string,
    userId: string
  ): Promise<{ code: number; msg: string; isNewBind: boolean }> {
    try {
      // 检查推荐官是否存在且有效
      const { data: officer } = await this.supabase
        .from('recommend_officers')
        .select('id, status')
        .eq('id', officerId)
        .single();

      if (!officer || officer.status !== 'active') {
        return { code: 400, msg: '推荐官不存在或已失效', isNewBind: false };
      }

      // 检查用户是否已绑定推荐官
      const { data: existingBind } = await this.supabase
        .from('officer_referrals')
        .select('id, commission_expire_date')
        .eq('user_id', userId)
        .single();

      const now = new Date();
      if (existingBind) {
        // 检查是否过期
        if (new Date(existingBind.commission_expire_date) >= now) {
          return { code: 200, msg: '已有有效的绑定关系', isNewBind: false };
        }
        // 更新过期绑定
        const expireDate = new Date();
        expireDate.setFullYear(expireDate.getFullYear() + COMMISSION_BIND_YEARS);

        await this.supabase
          .from('officer_referrals')
          .update({
            officer_id: officerId,
            commission_expire_date: expireDate.toISOString(),
          })
          .eq('id', existingBind.id);

        // 更新用户的 officer_id
        await this.supabase
          .from('users')
          .update({
            officer_id: officerId,
            officer_bind_time: new Date().toISOString(),
          })
          .eq('id', userId);

        return { code: 200, msg: '重新绑定成功', isNewBind: true };
      }

      // 创建新绑定
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

      // 更新用户的 officer_id
      await this.supabase
        .from('users')
        .update({
          officer_id: officerId,
          officer_bind_time: new Date().toISOString(),
        })
        .eq('id', userId);

      // 更新推荐官的邀请人数
      await this.supabase.rpc('increment_officer_invitees', { officer_id: officerId });

      this.logger.log(`用户 ${userId} 绑定推荐官 ${officerId} 成功`);
      return { code: 200, msg: '绑定成功', isNewBind: true };
    } catch (error) {
      this.logger.error('绑定推荐官失败:', error);
      return { code: 500, msg: '绑定失败', isNewBind: false };
    }
  }

  /**
   * 计算并发放推荐官佣金
   * 用户消费时调用
   */
  async calculateCommission(
    openid: string,
    amount: number,
    paymentId: string,
    type: 'vip' | 'mall' | 'gift' = 'gift'
  ): Promise<{ success: boolean; commissionAmount: number; officerId?: string }> {
    try {
      // 获取用户信息
      const { data: user } = await this.supabase
        .from('users')
        .select('id, officer_id')
        .eq('openid', openid)
        .single();

      if (!user || !user.officer_id) {
        this.logger.log(`用户 ${openid} 未绑定推荐官，不发放佣金`);
        return { success: false, commissionAmount: 0 };
      }

      // 获取推荐官信息
      const { data: officer } = await this.supabase
        .from('recommend_officers')
        .select('id, status, vip_commission_rate, mall_commission_rate')
        .eq('id', user.officer_id)
        .single();

      if (!officer || officer.status !== 'active') {
        this.logger.log(`推荐官 ${user.officer_id} 不存在或已失效`);
        return { success: false, commissionAmount: 0 };
      }

      // 检查绑定关系是否有效
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

      // 确定佣金比例
      const commissionRate =
        type === 'vip'
          ? officer.vip_commission_rate || DEFAULT_VIP_COMMISSION_RATE
          : officer.mall_commission_rate || DEFAULT_MALL_COMMISSION_RATE;

      // 计算佣金
      const commissionAmount = Math.floor((amount * commissionRate) / 100);

      if (commissionAmount <= 0) {
        return { success: false, commissionAmount: 0 };
      }

      // 创建佣金记录
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

      // 更新推荐官累计佣金
      await this.supabase
        .from('recommend_officers')
        .update({
          total_commission: (officer as any).total_commission + commissionAmount,
          available_commission: (officer as any).available_commission + commissionAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', officer.id);

      // 更新绑定关系累计佣金
      await this.supabase
        .from('officer_referrals')
        .update({
          total_commission: (bind as any).total_commission + commissionAmount,
        })
        .eq('officer_id', officer.id)
        .eq('user_id', user.id);

      this.logger.log(
        `推荐官佣金发放成功: 推荐官 ${officer.id} 获得 ${commissionAmount} 元 (${type} ${commissionRate}%)`
      );

      return { success: true, commissionAmount, officerId: officer.id };
    } catch (error) {
      this.logger.error('计算推荐官佣金失败:', error);
      return { success: false, commissionAmount: 0 };
    }
  }

  /**
   * 后台：获取推荐官列表
   */
  async getList(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    keyword?: string;
  }): Promise<{ code: number; msg: string; data: { list: any[]; total: number } }> {
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
    } catch (error) {
      this.logger.error('获取推广列表失败:', error);
      return { code: 500, msg: '获取失败', data: { list: [], total: 0 } };
    }
  }

  /**
   * 后台：更新推荐官信息
   */
  async updateOfficer(
    officerId: string,
    updates: {
      vipCommissionRate?: number;
      mallCommissionRate?: number;
      status?: string;
      remark?: string;
    }
  ): Promise<{ code: number; msg: string }> {
    try {
      const updateData: any = { updated_at: new Date().toISOString() };

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
    } catch (error) {
      this.logger.error('更新推荐官异常:', error);
      return { code: 500, msg: '更新失败' };
    }
  }

  /**
   * 后台：获取推荐官详情
   */
  async getDetail(officerId: string): Promise<{ code: number; msg: string; data?: any }> {
    try {
      const { data: officer, error } = await this.supabase
        .from('recommend_officers')
        .select('*')
        .eq('id', officerId)
        .single();

      if (error || !officer) {
        return { code: 404, msg: '推荐官不存在' };
      }

      // 获取邀请统计
      const { data: referrals } = await this.supabase
        .from('officer_referrals')
        .select('id')
        .eq('officer_id', officerId);

      // 获取佣金统计
      const { data: commissions } = await this.supabase
        .from('officer_commissions')
        .select('amount, status, commission_type')
        .eq('officer_id', officerId);

      const vipCommission = (commissions || [])
        .filter((c: any) => c.commission_type === 'vip')
        .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
      const mallCommission = (commissions || [])
        .filter((c: any) => c.commission_type === 'mall')
        .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

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
    } catch (error) {
      this.logger.error('获取推荐官详情失败:', error);
      return { code: 500, msg: '获取失败' };
    }
  }
}
