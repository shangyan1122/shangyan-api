import { Controller, Get, Post, Body, Query, Req, UseGuards, Logger } from '@nestjs/common';
import { Request } from 'express';
import { WithdrawService } from './withdraw.service';
import { AuthGuard } from '@/common/guards/auth.guard';

/**
 * 提现控制器
 *
 * 【安全说明】
 * - 所有接口都需要身份验证
 * - 从请求头获取已验证的用户 openid，禁止客户端传入
 * - 提现金额有范围限制
 */
@Controller('withdraw')
@UseGuards(AuthGuard)
export class WithdrawController {
  private readonly logger = new Logger(WithdrawController.name);

  constructor(private readonly withdrawService: WithdrawService) {}

  /**
   * 获取可提现余额
   */
  @Get('balance')
  async getBalance(@Req() req: Request) {
    // 【安全】从已验证的请求中获取 openid
    const openid = req.user?.openid;

    if (!openid) {
      return {
        code: 401,
        msg: '请先登录',
        data: null,
      };
    }

    this.logger.log(`查询余额: openid=${openid}`);

    const balance = await this.withdrawService.getAvailableBalance(openid);

    return {
      code: 200,
      msg: 'success',
      data: {
        balance,
        balanceYuan: (balance / 100).toFixed(2),
      },
    };
  }

  /**
   * 申请提现
   *
   * 【安全】
   * - 需要身份验证
   * - 验证提现金额范围
   * - 验证余额是否充足
   */
  @Post('apply')
  async applyWithdraw(@Body() body: { amount: number }, @Req() req: Request) {
    // 【安全】从已验证的请求中获取 openid
    const openid = req.user?.openid;

    if (!openid) {
      return {
        code: 401,
        msg: '请先登录',
        data: null,
      };
    }

    const { amount } = body;

    // 验证金额
    if (!amount || amount <= 0) {
      return {
        code: 400,
        msg: '提现金额必须大于0',
        data: null,
      };
    }

    // 金额转换为分（前端传的是元）
    const amountInCents = Math.floor(amount * 100);

    // 验证最小提现金额
    if (amountInCents < 10000) {
      // 最低100元
      return {
        code: 400,
        msg: '最低提现金额为100元',
        data: null,
      };
    }

    // 验证最大提现金额（单次最高20000元）
    if (amountInCents > 2000000) {
      return {
        code: 400,
        msg: '单次提现金额不能超过20000元',
        data: null,
      };
    }

    this.logger.log(`申请提现: openid=${openid}, amount=${amountInCents}分`);

    const result = await this.withdrawService.applyWithdraw(openid, amountInCents);

    if (result.success) {
      return {
        code: 200,
        msg: '提现申请成功',
        data: { withdrawId: result.withdrawId },
      };
    } else {
      return {
        code: 400,
        msg: result.errorMsg || '提现失败',
        data: null,
      };
    }
  }

  /**
   * 获取提现记录
   */
  @Get('records')
  async getRecords(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Req() req: Request
  ) {
    // 【安全】从已验证的请求中获取 openid
    const openid = req.user?.openid;

    if (!openid) {
      return {
        code: 401,
        msg: '请先登录',
        data: null,
      };
    }

    const result = await this.withdrawService.getWithdrawRecords(
      openid,
      parseInt(page),
      parseInt(pageSize)
    );

    return {
      code: 200,
      msg: 'success',
      data: result,
    };
  }

  /**
   * 获取提现详情
   *
   * 【安全】验证提现记录是否属于当前用户
   */
  @Get('detail')
  async getDetail(@Query('id') id: string, @Req() req: Request) {
    // 【安全】从已验证的请求中获取 openid
    const openid = req.user?.openid;

    if (!openid) {
      return {
        code: 401,
        msg: '请先登录',
        data: null,
      };
    }

    const detail = await this.withdrawService.getWithdrawDetail(id);

    if (!detail) {
      return {
        code: 404,
        msg: '提现记录不存在',
        data: null,
      };
    }

    // 【安全】验证提现记录是否属于当前用户
    if (detail.host_openid !== openid) {
      return {
        code: 403,
        msg: '无权查看此提现记录',
        data: null,
      };
    }

    return {
      code: 200,
      msg: 'success',
      data: detail,
    };
  }
}
