import { Injectable, Logger } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { PaymentService } from '../payment/payment.service';

@Injectable()
export class WithdrawService {
  private readonly logger = new Logger(WithdrawService.name);

  constructor(private readonly paymentService: PaymentService) {}

  /**
   * 获取提现记录列表
   */
  async getWithdrawRecords(openid: string, page: number = 1, pageSize: number = 20) {
    const client = getSupabaseClient();

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await client
      .from('withdrawals')
      .select('*', { count: 'exact' })
      .eq('openid', openid)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      this.logger.error('获取提现记录失败:', error);
      return { records: [], total: 0 };
    }

    return {
      records: data || [],
      total: count || 0,
    };
  }

  /**
   * 获取可提现余额
   * 计算主办方所有宴会已支付的随礼总额 - 已提现金额
   */
  async getAvailableBalance(openid: string): Promise<number> {
    const client = getSupabaseClient();

    // 1. 获取主办方所有宴会ID
    const { data: banquets } = await client.from('banquets').select('id').eq('host_openid', openid);

    if (!banquets || banquets.length === 0) {
      return 0;
    }

    const banquetIds = banquets.map((b) => b.id);

    // 2. 计算已支付的随礼总额
    const { data: giftRecords } = await client
      .from('gift_records')
      .select('amount')
      .in('banquet_id', banquetIds)
      .eq('payment_status', 'paid');

    const totalGiftAmount = giftRecords?.reduce((sum, r) => sum + r.amount, 0) || 0;

    // 3. 计算已提现金额
    const { data: withdrawals } = await client
      .from('withdrawals')
      .select('amount')
      .eq('openid', openid)
      .eq('status', 'success');

    const totalWithdrawn = withdrawals?.reduce((sum, w) => sum + w.amount, 0) || 0;

    // 4. 计算可提现金额（扣除平台服务费 0.6%）
    const serviceFeeRate = 0.006;
    const netAmount = Math.floor(totalGiftAmount * (1 - serviceFeeRate));
    const availableBalance = netAmount - totalWithdrawn;

    return Math.max(0, availableBalance);
  }

  /**
   * 申请提现
   */
  async applyWithdraw(
    openid: string,
    amount: number
  ): Promise<{
    success: boolean;
    withdrawId?: string;
    errorMsg?: string;
  }> {
    this.logger.log(`申请提现: openid=${openid}, 金额=${amount}分`);

    // 1. 检查可提现余额
    const availableBalance = await this.getAvailableBalance(openid);
    if (availableBalance < amount) {
      return {
        success: false,
        errorMsg: `可提现余额不足，当前可提现: ${(availableBalance / 100).toFixed(2)}元`,
      };
    }

    // 2. 检查最低提现金额（100元 = 10000分）
    if (amount < 10000) {
      return {
        success: false,
        errorMsg: '最低提现金额为100元',
      };
    }

    const client = getSupabaseClient();

    // 3. 创建提现记录
    const { data: withdrawRecord, error } = await client
      .from('withdrawals')
      .insert({
        openid,
        amount,
        status: 'processing',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !withdrawRecord) {
      this.logger.error('创建提现记录失败:', error);
      return {
        success: false,
        errorMsg: '创建提现记录失败',
      };
    }

    // 4. 调用企业付款接口
    const transferResult = await this.paymentService.transferToHost(
      openid,
      amount,
      '宴礼通-随礼提现'
    );

    // 5. 更新提现状态
    if (transferResult.success) {
      await client
        .from('withdrawals')
        .update({
          status: 'success',
          payment_no: transferResult.paymentNo,
          completed_at: new Date().toISOString(),
        })
        .eq('id', withdrawRecord.id);

      this.logger.log(`提现成功: id=${withdrawRecord.id}, paymentNo=${transferResult.paymentNo}`);

      return {
        success: true,
        withdrawId: withdrawRecord.id,
      };
    } else {
      await client
        .from('withdrawals')
        .update({
          status: 'failed',
          error_msg: transferResult.errorMsg,
        })
        .eq('id', withdrawRecord.id);

      this.logger.error(`提现失败: id=${withdrawRecord.id}, error=${transferResult.errorMsg}`);

      return {
        success: false,
        errorMsg: transferResult.errorMsg,
      };
    }
  }

  /**
   * 获取提现详情
   */
  async getWithdrawDetail(withdrawId: string) {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('withdrawals')
      .select('*')
      .eq('id', withdrawId)
      .single();

    if (error) {
      this.logger.error('获取提现详情失败:', error);
      return null;
    }

    return data;
  }
}
