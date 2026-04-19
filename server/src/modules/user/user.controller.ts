import { Controller, Get, Query, Req, Logger, Post, Body } from '@nestjs/common';
import { Request } from 'express';
import { UserService } from './user.service';

/**
 * 用户控制器
 * 处理用户相关的接口
 */
@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  /**
   * 获取用户统计数据
   * 返回用户的宴会数、随礼记录数、累计金额等
   */
  @Get('stats')
  async getUserStats(@Req() req: Request) {
    const openid = req.user?.openid || 'test_openid_123';

    this.logger.log(`获取用户统计: openid=${openid}`);

    try {
      const stats = await this.userService.getUserStats(openid);

      return {
        code: 200,
        message: 'success',
        data: {
          totalBanquets: stats.totalBanquets || 0,
          totalGifts: stats.totalGifts || 0,
          totalAmount: stats.totalAmount || 0,
        },
      };
    } catch (error: any) {
      this.logger.error(`获取用户统计失败: ${error.message}`);
      return {
        code: 500,
        message: '获取统计数据失败',
        data: {
          totalBanquets: 0,
          totalGifts: 0,
          totalAmount: 0,
        },
      };
    }
  }

  /**
   * 获取用户的礼账（作为主办方的随礼记录）
   * 分页返回所有随礼记录
   */
  @Get('gift-ledger')
  async getGiftLedger(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Req() req: Request
  ) {
    const openid = req.user?.openid || 'test_openid_123';
    const pageNum = parseInt(page) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize) || 20, 100);

    this.logger.log(`获取礼账: openid=${openid}, page=${pageNum}, pageSize=${pageSizeNum}`);

    try {
      const result = await this.userService.getGiftLedger(openid, pageNum, pageSizeNum);

      return {
        code: 200,
        message: 'success',
        data: result,
      };
    } catch (error: any) {
      this.logger.error(`获取礼账失败: ${error.message}`);
      return {
        code: 500,
        message: '获取礼账失败',
        data: {
          records: [],
          total: 0,
          page: pageNum,
          pageSize: pageSizeNum,
        },
      };
    }
  }

  /**
   * 获取用户作为嘉宾的随礼记录
   */
  @Get('my-gifts')
  async getMyGifts(@Req() req: Request) {
    const openid = req.user?.openid || 'test_guest_openid';

    this.logger.log(`获取我的随礼记录: openid=${openid}`);

    try {
      const records = await this.userService.getGuestGifts(openid);

      return {
        code: 200,
        message: 'success',
        data: records,
      };
    } catch (error: any) {
      this.logger.error(`获取随礼记录失败: ${error.message}`);
      return {
        code: 500,
        message: '获取随礼记录失败',
        data: [],
      };
    }
  }

  /**
   * 获取用户参加的宴会列表（我的随礼）
   */
  @Get('my-banquets')
  async getMyBanquets(@Query('openid') openid: string, @Req() req: Request) {
    const userOpenid = openid || req.user?.openid || '';

    this.logger.log(`获取我参加的宴会: openid=${userOpenid}`);

    try {
      const banquets = await this.userService.getGuestBanquets(userOpenid);

      return {
        code: 200,
        message: 'success',
        data: banquets,
      };
    } catch (error: any) {
      this.logger.error(`获取宴会列表失败: ${error.message}`);
      return {
        code: 500,
        message: '获取宴会列表失败',
        data: [],
      };
    }
  }

  /**
   * 获取用户信息
   */
  @Get('info')
  async getUserInfo(@Query('openid') openid: string, @Req() req: Request) {
    const userOpenid = openid || req.user?.openid;

    if (!userOpenid) {
      return {
        code: 401,
        message: '未登录',
        data: null,
      };
    }

    try {
      const userInfo = await this.userService.getUserInfo(userOpenid);

      return {
        code: 200,
        message: 'success',
        data: userInfo,
      };
    } catch (error: any) {
      this.logger.error(`获取用户信息失败: ${error.message}`);
      return {
        code: 500,
        message: '获取用户信息失败',
        data: null,
      };
    }
  }

  /**
   * 更新用户信息
   */
  @Post('update')
  async updateUserInfo(@Body() body: any, @Req() req: Request) {
    const openid = req.user?.openid;

    if (!openid) {
      return {
        code: 401,
        message: '未登录',
        data: null,
      };
    }

    const { nickname, avatar } = body;

    if (!nickname && !avatar) {
      return {
        code: 400,
        message: '没有需要更新的内容',
        data: null,
      };
    }

    try {
      await this.userService.updateUserInfo(openid, { nickname, avatar });

      return {
        code: 200,
        message: '更新成功',
        data: null,
      };
    } catch (error: any) {
      this.logger.error(`更新用户信息失败: ${error.message}`);
      return {
        code: 500,
        message: '更新失败',
        data: null,
      };
    }
  }

  /**
   * 开通VIP
   */
  @Post('vip/activate')
  async activateVip(@Body() body: any, @Req() req: Request) {
    const openid = body.openid || req.user?.openid;

    if (!openid) {
      return {
        code: 401,
        message: '未登录',
        data: null,
      };
    }

    const months = body.months || 12;

    try {
      const result = await this.userService.activateVip(openid, months);

      return {
        code: result.code,
        message: result.msg,
        data: result.data,
      };
    } catch (error: any) {
      this.logger.error(`开通VIP失败: ${error.message}`);
      return {
        code: 500,
        message: '开通VIP失败',
        data: null,
      };
    }
  }
}
