import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { ServiceFeeService } from './service-fee.service';

const supabase = getSupabaseClient();

// 购物券接口
export interface ShoppingVoucher {
  id: string;
  openid: string;
  banquet_id?: string;
  voucher_code: string;
  amount: number;
  balance: number;
  source_type: 'promotion' | 'manual'; // promotion=手续费返还，manual=手动发放
  source_description?: string;
  status: 'active' | 'used_up' | 'expired';
  expired_at?: string;
  total_used: number;
  last_used_at?: string;
  created_at: string;
}

@Injectable()
export class ShoppingVoucherService {
  private readonly logger = new Logger(ShoppingVoucherService.name);

  constructor(private readonly serviceFeeService: ServiceFeeService) {}

  /**
   * 宴会结束时发放购物券
   *
   * 【规则】
   * - 统计所有领取商城礼品的礼金手续费（0.6%）
   * - 以购物券形式返还给主办方，弥补微信手续费成本
   * - 现场礼品手续费不返还（主办方自购，可自行承担）
   */
  async issueVoucherOnBanquetEnd(banquetId: string): Promise<ShoppingVoucher | null> {
    this.logger.log(`宴会结束，开始发放购物券: banquetId=${banquetId}`);

    // 1. 获取宴会信息
    const { data: banquet, error: banquetError } = await supabase
      .from('banquets')
      .select('id, host_openid, name, voucher_issued')
      .eq('id', banquetId)
      .single();

    if (banquetError || !banquet) {
      this.logger.error(`宴会不存在: ${banquetId}`);
      return null;
    }

    // 2. 检查是否已发放过
    if (banquet.voucher_issued) {
      this.logger.log(`宴会已发放购物券，跳过: banquetId=${banquetId}`);
      return null;
    }

    // 3. 统计手续费
    const statistics = await this.serviceFeeService.calculateBanquetServiceFee(banquetId);

    // 4. 如果没有商城礼品领取，不需要发放购物券
    if (statistics.mall_fee_amount === 0) {
      this.logger.log(`宴会无商城礼品领取，无需发放购物券: banquetId=${banquetId}`);

      // 标记为已处理
      await supabase.from('banquets').update({ voucher_issued: true }).eq('id', banquetId);

      return null;
    }

    // 5. 生成购物券编码
    const voucherCode = this.generateVoucherCode();

    // 6. 创建购物券
    const { data: voucher, error: voucherError } = await supabase
      .from('shopping_vouchers')
      .insert({
        id: `voucher_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        openid: banquet.host_openid,
        banquet_id: banquetId,
        voucher_code: voucherCode,
        amount: statistics.mall_fee_amount,
        balance: statistics.mall_fee_amount,
        source_type: 'promotion',
        source_description: `宴会「${banquet.name}」商城礼品手续费返还，共${statistics.mall_gifts}笔，手续费率0.6%`,
        status: 'active',
      })
      .select()
      .single();

    if (voucherError || !voucher) {
      this.logger.error('创建购物券失败:', voucherError);
      return null;
    }

    // 7. 更新手续费记录的返券状态
    await supabase
      .from('service_fee_records')
      .update({
        voucher_returned: true,
        voucher_id: voucher.id,
        updated_at: new Date().toISOString(),
      })
      .eq('banquet_id', banquetId)
      .eq('gift_type', 'mall');

    // 8. 更新宴会状态
    await supabase
      .from('banquets')
      .update({
        voucher_issued: true,
        voucher_issued_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', banquetId);

    this.logger.log(
      `购物券发放成功: openid=${banquet.host_openid}, amount=${statistics.mall_fee_amount}分`
    );

    return voucher;
  }

  /**
   * 生成购物券编码
   * 格式：SY + 年月日 + 6位随机码
   */
  private generateVoucherCode(): string {
    const now = new Date();
    const dateStr =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0');
    const randomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `SY${dateStr}${randomCode}`;
  }

  /**
   * 使用购物券
   * @param openid 用户openid
   * @param amount 使用金额（分）
   * @param orderId 关联订单ID
   */
  async useVoucher(
    openid: string,
    amount: number,
    orderId?: string
  ): Promise<{ success: boolean; usedAmount: number; remainingBalance: number }> {
    this.logger.log(`使用购物券: openid=${openid}, amount=${amount}`);

    // 1. 获取用户有效购物券（按创建时间升序，先用先到的）
    const { data: vouchers, error } = await supabase
      .from('shopping_vouchers')
      .select('*')
      .eq('openid', openid)
      .eq('status', 'active')
      .gt('balance', 0)
      .or('expired_at.is.null,expired_at.gt.' + new Date().toISOString())
      .order('created_at', { ascending: true });

    if (error || !vouchers || vouchers.length === 0) {
      return { success: false, usedAmount: 0, remainingBalance: 0 };
    }

    let remainingAmount = amount;
    let totalUsed = 0;
    const usageRecords: any[] = [];

    // 2. 按顺序使用购物券
    for (const voucher of vouchers) {
      if (remainingAmount <= 0) break;

      const useAmount = Math.min(voucher.balance, remainingAmount);
      const newBalance = voucher.balance - useAmount;

      // 更新购物券
      const { error: updateError } = await supabase
        .from('shopping_vouchers')
        .update({
          balance: newBalance,
          total_used: voucher.total_used + useAmount,
          last_used_at: new Date().toISOString(),
          status: newBalance === 0 ? 'used_up' : 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', voucher.id);

      if (updateError) {
        this.logger.error('更新购物券失败:', updateError);
        continue;
      }

      // 记录使用
      usageRecords.push({
        id: `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        voucher_id: voucher.id,
        openid: openid,
        amount: useAmount,
        order_id: orderId,
        usage_type: 'mall_purchase',
      });

      totalUsed += useAmount;
      remainingAmount -= useAmount;
    }

    // 3. 批量插入使用记录
    if (usageRecords.length > 0) {
      await supabase.from('voucher_usage_records').insert(usageRecords);
    }

    // 4. 计算剩余余额
    const { data: remaining } = await supabase
      .from('shopping_vouchers')
      .select('balance')
      .eq('openid', openid)
      .eq('status', 'active')
      .or('expired_at.is.null,expired_at.gt.' + new Date().toISOString());

    const totalBalance = remaining?.reduce((sum, v) => sum + v.balance, 0) || 0;

    return {
      success: totalUsed > 0,
      usedAmount: totalUsed,
      remainingBalance: totalBalance,
    };
  }

  /**
   * 获取用户购物券余额
   */
  async getUserVoucherBalance(openid: string): Promise<number> {
    return this.serviceFeeService.getUserVoucherBalance(openid);
  }

  /**
   * 获取用户购物券列表
   */
  async getUserVouchers(openid: string): Promise<ShoppingVoucher[]> {
    return this.serviceFeeService.getUserVouchers(openid);
  }

  /**
   * 手动发放购物券（管理员操作）
   */
  async issueVoucherManually(
    openid: string,
    amount: number,
    description: string
  ): Promise<ShoppingVoucher | null> {
    const voucherCode = this.generateVoucherCode();

    const { data: voucher, error } = await supabase
      .from('shopping_vouchers')
      .insert({
        id: `voucher_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        openid: openid,
        voucher_code: voucherCode,
        amount: amount,
        balance: amount,
        source_type: 'manual',
        source_description: description,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      this.logger.error('手动发放购物券失败:', error);
      return null;
    }

    this.logger.log(`购物券发放成功: openid=${openid}, amount=${amount}分`);
    return voucher;
  }

  /**
   * 定时任务：每小时检查已结束的宴会并发放购物券
   * 触发条件：宴会结束时间超过24小时且未发放购物券
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkAndIssueVouchersForEndedBanquets() {
    this.logger.log('定时任务：检查已结束宴会并发放购物券');

    try {
      // 1. 查询已结束但未发放购物券的宴会
      // 宴会结束时间 = event_time + 24小时
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const { data: banquets, error } = await supabase
        .from('banquets')
        .select('id, name, event_time, host_openid, voucher_issued')
        .lt('event_time', yesterday.toISOString()) // 宴会开始时间在24小时前
        .eq('voucher_issued', false);

      if (error) {
        this.logger.error('查询已结束宴会失败:', error);
        return;
      }

      if (!banquets || banquets.length === 0) {
        this.logger.log('没有需要处理的宴会');
        return;
      }

      this.logger.log(`发现 ${banquets.length} 个需要发放购物券的宴会`);

      // 2. 逐个处理
      for (const banquet of banquets) {
        try {
          await this.issueVoucherOnBanquetEnd(banquet.id);
          this.logger.log(`宴会购物券处理完成: ${banquet.name} (${banquet.id})`);
        } catch (err) {
          this.logger.error(`宴会购物券处理失败: ${banquet.id}`, err);
        }
      }
    } catch (error) {
      this.logger.error('定时任务执行失败:', error);
    }
  }
}
