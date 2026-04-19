import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { GiftService } from './gift.service';
import { ReferralService } from '../referral/referral.service';
import { AuthGuard } from '@/common/guards/auth.guard';

@Controller('gifts')
@UseGuards(AuthGuard)
export class GiftController {
  constructor(
    private readonly giftService: GiftService,
    private readonly referralService: ReferralService
  ) {}

  @Post('check')
  async checkGuest(@Body() body: { banquetId: string; guestOpenid: string }) {
    const exists = await this.giftService.checkGuestExists(body.banquetId, body.guestOpenid);

    return {
      code: 200,
      message: 'success',
      data: { exists },
    };
  }

  @Post('create')
  async createGiftRecord(@Body() body: any) {
    // 检查是否已随礼
    const exists = await this.giftService.checkGuestExists(body.banquetId, body.guestOpenid);

    if (exists) {
      return {
        code: 400,
        message: '您已经随礼过了',
        data: null,
      };
    }

    const data = await this.giftService.createGiftRecord({
      banquet_id: body.banquetId,
      guest_openid: body.guestOpenid,
      guest_name: body.guestName,
      amount: body.amount,
      blessing: body.blessing,
      payment_status: 'pending',
    });

    // 🔗 核心逻辑：随礼时自动绑定上下级关系
    // 规则1+5：自由人随礼时绑定主办方为上级（3年有效期）
    try {
      // 获取宴会信息以获取主办方 openid
      const banquet = await this.giftService.getBanquetInfo(body.banquetId);
      if (banquet && banquet.host_openid !== body.guestOpenid) {
        // 调用 referral 服务绑定关系
        await this.referralService.bindOnGift(
          body.guestOpenid,
          banquet.host_openid,
          body.banquetId
        );
      }
    } catch (error) {
      // 绑定失败不影响随礼流程，仅记录日志
      console.error('绑定上下级关系失败:', error);
    }

    return {
      code: 200,
      message: 'success',
      data: data,
    };
  }

  /**
   * 补录单条随礼记录
   * POST /api/gifts/supplement
   *
   * 【安全】
   * - 从已验证的请求中获取用户 openid
   * - 验证用户是否是宴会主办方
   */
  @Post('supplement')
  async supplementGiftRecord(
    @Body()
    body: {
      banquetId: string;
      guestName: string;
      guestPhone?: string;
      amount: number;
      blessing?: string;
      giftTime?: string; // 补录的随礼时间
    },
    @Req() req: Request
  ) {
    // 【安全】从已验证的请求中获取 openid
    const hostOpenid = req.user?.openid;

    if (!hostOpenid) {
      return {
        code: 401,
        message: '请先登录',
        data: null,
      };
    }

    try {
      // 【安全】验证当前用户是否是宴会主办方
      const isHost = await this.giftService.verifyHostPermission(body.banquetId, hostOpenid);

      if (!isHost) {
        return {
          code: 403,
          message: '无权限补录，只有宴会主办方可以补录',
          data: null,
        };
      }

      // 创建补录记录
      const data = await this.giftService.supplementGiftRecord({
        banquet_id: body.banquetId,
        guest_name: body.guestName,
        guest_phone: body.guestPhone,
        amount: body.amount,
        blessing: body.blessing,
        gift_time: body.giftTime,
        is_supplement: true, // 标记为补录
        payment_status: 'completed', // 补录默认已支付
        guest_openid: `supplement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // 生成唯一标识
      });

      return {
        code: 200,
        message: '补录成功',
        data: data,
      };
    } catch (error) {
      return {
        code: 500,
        message: error.message || '补录失败',
        data: null,
      };
    }
  }

  /**
   * 批量补录随礼记录
   * POST /api/gifts/supplement/batch
   */
  @Post('supplement/batch')
  async batchSupplementGiftRecords(
    @Body()
    body: {
      banquetId: string;
      hostOpenid: string;
      records: Array<{
        guestName: string;
        guestPhone?: string;
        amount: number;
        blessing?: string;
        giftTime?: string;
      }>;
    }
  ) {
    try {
      // 验证主办方权限
      const isHost = await this.giftService.verifyHostPermission(body.banquetId, body.hostOpenid);

      if (!isHost) {
        return {
          code: 403,
          message: '无权限补录，只有宴会主办方可以补录',
          data: null,
        };
      }

      // 批量补录
      const results = await this.giftService.batchSupplementGiftRecords(
        body.banquetId,
        body.records
      );

      return {
        code: 200,
        message: `成功补录 ${results.success} 条，失败 ${results.failed} 条`,
        data: {
          success: results.success,
          failed: results.failed,
          records: results.records,
        },
      };
    } catch (error) {
      return {
        code: 500,
        message: error.message || '批量补录失败',
        data: null,
      };
    }
  }

  /**
   * 获取补录记录列表
   * GET /api/gifts/supplement/list
   */
  @Post('supplement/list')
  async getSupplementRecords(@Body() body: { banquetId: string; hostOpenid: string }) {
    try {
      // 验证主办方权限
      const isHost = await this.giftService.verifyHostPermission(body.banquetId, body.hostOpenid);

      if (!isHost) {
        return {
          code: 403,
          message: '无权限查看',
          data: null,
        };
      }

      const records = await this.giftService.getSupplementRecords(body.banquetId);

      return {
        code: 200,
        message: 'success',
        data: { records },
      };
    } catch (error) {
      return {
        code: 500,
        message: error.message || '获取失败',
        data: null,
      };
    }
  }

  /**
   * 删除补录记录
   * POST /api/gifts/supplement/delete
   */
  @Post('supplement/delete')
  async deleteSupplementRecord(
    @Body()
    body: {
      id: string; // 补录记录ID
      banquetId: string; // 宴会ID（用于前端传递）
      hostOpenid: string;
    }
  ) {
    try {
      // 验证权限并删除
      const result = await this.giftService.deleteSupplementRecord(body.id, body.hostOpenid);

      return {
        code: 200,
        message: '删除成功',
        data: result,
      };
    } catch (error) {
      return {
        code: 500,
        message: error.message || '删除失败',
        data: null,
      };
    }
  }
}
