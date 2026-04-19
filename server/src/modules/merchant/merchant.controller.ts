import { Controller, Get, Post, Body, Query, UseGuards, Req, Logger } from '@nestjs/common';
import { Request } from 'express';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { AuthGuard, Public } from '@/common/guards/auth.guard';

/**
 * 商户账户控制器 - 简化版（个人直收模式）
 *
 * 【删除的内容】
 * - 服务商子商户申请
 * - 特约商户进件
 * - 营业执照上传
 * - 银行账户绑定
 * - 商户审核流程
 *
 * 【保留的内容】
 * - 主办方基本信息存储
 * - 充值余额管理
 */
@Controller('merchant')
@UseGuards(AuthGuard)
export class MerchantController {
  private readonly logger = new Logger(MerchantController.name);

  /**
   * 获取主办方账户信息
   *
   * 新模式：
   * - 主办方无需开通商户账户
   * - 仅存储基本信息
   * - 返回充值余额状态
   */
  @Get('account')
  async getAccount(@Req() req: Request): Promise<{ code: number; msg: string; data: any }> {
    const openid = req.user?.openid || req.query.openid || 'test_openid';
    this.logger.log(`获取主办方账户信息: openid=${openid}`);

    try {
      const client = getSupabaseClient();

      // 获取主办方基本信息
      const { data: user, error: userError } = await client
        .from('users')
        .select('*')
        .eq('openid', openid)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        this.logger.error(`获取用户信息失败: ${userError.message}`);
        return { code: 500, msg: '获取账户信息失败', data: null };
      }

      // 获取充值余额
      const { data: balance, error: balanceError } = await client
        .from('host_balances')
        .select('*')
        .eq('openid', openid)
        .single();

      // 如果没有余额记录，创建初始记录
      let balanceData = balance;
      if (balanceError && balanceError.code === 'PGRST116') {
        const { data: newBalance } = await client
          .from('host_balances')
          .insert({
            openid,
            balance: 0,
            frozen_balance: 0,
            total_recharged: 0,
            total_spent: 0,
          })
          .select()
          .single();
        balanceData = newBalance;
      }

      return {
        code: 200,
        msg: 'success',
        data: {
          // 主办方基本信息
          openid,
          nickname: user?.nickname || '',
          avatar_url: user?.avatar_url || '',

          // 资金状态
          balance: balanceData?.balance || 0, // 充值余额（分）
          frozen_balance: balanceData?.frozen_balance || 0, // 冻结金额
          total_recharged: balanceData?.total_recharged || 0, // 累计充值
          total_spent: balanceData?.total_spent || 0, // 累计消费

          // 新模式标记
          payment_mode: 'personal_direct', // 个人直收模式
          status: 'active', // 无需审核，直接激活
        },
      };
    } catch (error: any) {
      this.logger.error(`获取账户信息异常: ${error.message}`);
      return { code: 500, msg: '获取账户信息失败', data: null };
    }
  }

  /**
   * 主办方充值余额
   *
   * 用于发放回礼红包
   */
  @Post('recharge')
  async recharge(@Body() body: { amount: number; paymentMethod?: string }, @Req() req: Request) {
    const openid = req.user?.openid || req.body.openid || 'test_openid';
    const { amount, paymentMethod } = body;

    this.logger.log(`主办方充值: openid=${openid}, amount=${amount}分`);

    // 参数验证
    if (!amount || amount < 100) {
      return { code: 400, msg: '充值金额最低1元', data: null };
    }

    if (amount > 10000000) {
      return { code: 400, msg: '单次充值最高10万元', data: null };
    }

    try {
      const client = getSupabaseClient();

      // 创建充值订单
      const rechargeOrderId = `RCH${Date.now()}${Math.random().toString(36).substr(2, 6)}`;

      const { error: orderError } = await client.from('recharge_orders').insert({
        id: rechargeOrderId,
        openid,
        amount,
        status: 'pending',
        payment_method: paymentMethod || 'wechat',
        created_at: new Date().toISOString(),
      });

      if (orderError) {
        this.logger.error('创建充值订单失败:', orderError);
        return { code: 500, msg: '创建充值订单失败', data: null };
      }

      // TODO: 调用微信支付创建充值订单
      // 开发环境返回模拟参数
      return {
        code: 200,
        msg: 'success',
        data: {
          orderId: rechargeOrderId,
          amount,
          isMock: true,
          timeStamp: Math.floor(Date.now() / 1000).toString(),
          nonceStr: Math.random().toString(36).substr(2, 32),
          package: `prepay_id=mock_recharge_${rechargeOrderId}`,
          signType: 'MD5',
          paySign: 'mock_sign_' + Math.random().toString(36).substr(2, 16),
        },
      };
    } catch (error: any) {
      this.logger.error(`充值失败: ${error.message}`);
      return { code: 500, msg: '充值失败', data: null };
    }
  }

  /**
   * 充值成功回调
   */
  @Post('recharge/callback')
  async rechargeCallback(@Body() body: any) {
    const { orderId } = body;

    this.logger.log(`充值成功回调: orderId=${orderId}`);

    if (!orderId) {
      return { code: 'FAIL', message: '订单号为空' };
    }

    try {
      const client = getSupabaseClient();

      // 1. 获取充值订单
      const { data: rechargeOrder, error: orderError } = await client
        .from('recharge_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !rechargeOrder) {
        return { code: 'FAIL', message: '订单不存在' };
      }

      if (rechargeOrder.status === 'completed') {
        return { code: 'SUCCESS', message: '已处理' };
      }

      // 2. 更新订单状态
      await client
        .from('recharge_orders')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      // 3. 增加余额
      const { data: balance } = await client
        .from('host_balances')
        .select('*')
        .eq('openid', rechargeOrder.openid)
        .single();

      if (balance) {
        await client
          .from('host_balances')
          .update({
            balance: balance.balance + rechargeOrder.amount,
            total_recharged: balance.total_recharged + rechargeOrder.amount,
            updated_at: new Date().toISOString(),
          })
          .eq('openid', rechargeOrder.openid);
      } else {
        await client.from('host_balances').insert({
          openid: rechargeOrder.openid,
          balance: rechargeOrder.amount,
          frozen_balance: 0,
          total_recharged: rechargeOrder.amount,
          total_spent: 0,
        });
      }

      // 4. 记录余额变动
      await client.from('balance_logs').insert({
        openid: rechargeOrder.openid,
        type: 'recharge',
        amount: rechargeOrder.amount,
        balance_after: (balance?.balance || 0) + rechargeOrder.amount,
        description: '充值余额',
        order_id: orderId,
      });

      this.logger.log(`充值成功: openid=${rechargeOrder.openid}, amount=${rechargeOrder.amount}`);

      return { code: 'SUCCESS', message: '成功' };
    } catch (error: any) {
      this.logger.error(`充值回调处理失败: ${error.message}`);
      return { code: 'FAIL', message: '处理失败' };
    }
  }

  /**
   * 查询充值记录
   */
  @Get('recharge/records')
  async getRechargeRecords(@Query('openid') queryOpenid: string, @Req() req: Request) {
    const openid = queryOpenid || req.user?.openid || 'test_openid';
    const limit = parseInt(req.query.limit as string) || 20;

    try {
      const client = getSupabaseClient();

      const { data, error } = await client
        .from('recharge_orders')
        .select('*')
        .eq('openid', openid)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        this.logger.error('查询充值记录失败:', error);
        return { code: 500, msg: '查询失败', data: null };
      }

      return {
        code: 200,
        msg: 'success',
        data: data || [],
      };
    } catch (error: any) {
      this.logger.error(`查询充值记录异常: ${error.message}`);
      return { code: 500, msg: '查询失败', data: null };
    }
  }

  /**
   * 查询余额变动记录
   */
  @Get('balance/logs')
  async getBalanceLogs(@Query('openid') queryOpenid: string, @Req() req: Request) {
    const openid = queryOpenid || req.user?.openid || 'test_openid';
    const limit = parseInt(req.query.limit as string) || 50;

    try {
      const client = getSupabaseClient();

      const { data, error } = await client
        .from('balance_logs')
        .select('*')
        .eq('openid', openid)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        this.logger.error('查询余额记录失败:', error);
        return { code: 500, msg: '查询失败', data: null };
      }

      return {
        code: 200,
        msg: 'success',
        data: data || [],
      };
    } catch (error: any) {
      this.logger.error(`查询余额记录异常: ${error.message}`);
      return { code: 500, msg: '查询失败', data: null };
    }
  }
}
