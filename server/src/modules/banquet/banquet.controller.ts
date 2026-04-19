import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { BanquetService } from './banquet.service';
import { GiftReminderService } from '../gift-reminder/gift-reminder.service';
import { AuthGuard, Public } from '@/common/guards/auth.guard';

/**
 * 宴会控制器
 * 处理宴会相关的所有操作
 */
@Controller('banquets')
@UseGuards(AuthGuard)
export class BanquetController {
  private readonly logger = new Logger(BanquetController.name);

  constructor(
    private readonly banquetService: BanquetService,
    private readonly giftReminderService: GiftReminderService
  ) {}

  /**
   * 获取用户的宴会列表
   * 支持按状态筛选
   *
   * 【安全】
   * - 禁止客户端传入 openid 参数
   * - 从已验证的请求中获取用户 openid
   */
  @Get()
  async getBanquets(@Query('status') status: string, @Req() req: Request) {
    // 【安全】从已验证的请求中获取 openid，禁止客户端传入
    const hostOpenid = req.user?.openid;

    if (!hostOpenid) {
      return {
        code: 401,
        msg: '请先登录',
        data: [],
      };
    }

    this.logger.log(`获取宴会列表: openid=${hostOpenid}, status=${status}`);

    try {
      const data = await this.banquetService.getBanquets(hostOpenid, status);

      return {
        code: 200,
        msg: 'success',
        data: data.map((item: any) => ({
          ...item,
          guestCount: item.guestCount || 0,
          totalAmount: item.totalAmount || 0,
        })),
      };
    } catch (error: any) {
      this.logger.error(`获取宴会列表失败: ${error.message}`);
      return {
        code: 500,
        msg: '获取宴会列表失败',
        data: [],
      };
    }
  }

  /**
   * 获取宴会详情
   * 公开接口，允许嘉宾查看
   */
  @Public()
  @Get(':id')
  async getBanquetById(@Param('id') id: string, @Req() req: Request) {
    this.logger.log(`获取宴会详情: id=${id}`);

    try {
      const data = await this.banquetService.getBanquetById(id);

      if (!data) {
        return {
          code: 404,
          msg: '宴会不存在',
          data: null,
        };
      }

      return {
        code: 200,
        msg: 'success',
        data: data,
      };
    } catch (error: any) {
      this.logger.error(`获取宴会详情失败: ${error.message}`);
      return {
        code: 500,
        msg: '获取宴会详情失败',
        data: null,
      };
    }
  }

  /**
   * 获取宴会二维码
   * 用于嘉宾扫码随礼
   */
  @Get(':id/qrcode')
  async getBanquetQrcode(@Param('id') id: string, @Req() req: Request) {
    this.logger.log(`获取宴会二维码: id=${id}`);

    try {
      const qrcodeData = await this.banquetService.getBanquetQrcode(id);

      return {
        code: 200,
        msg: 'success',
        data: qrcodeData,
      };
    } catch (error: any) {
      this.logger.error(`获取二维码失败: ${error.message}`);
      return {
        code: 500,
        msg: '获取二维码失败',
        data: null,
      };
    }
  }

  /**
   * 创建宴会
   */
  @Post()
  async createBanquet(@Body() body: any, @Req() req: Request) {
    const hostOpenid =
      body.openid || req.headers['x-wx-openid'] || req.user?.openid || 'test_openid_123';

    this.logger.log(`创建宴会: openid=${hostOpenid}, type=${body.type}, name=${body.name}`);

    // 参数验证
    if (!body.type || !body.name || !body.event_time || !body.location) {
      return {
        code: 400,
        msg: '请填写完整的宴会信息',
        data: null,
      };
    }

    // 验证宴会类型
    const validTypes = ['婚宴', '回门', '生日', '寿宴', '升学', '乔迁', '满月', '开锁'];
    if (!validTypes.includes(body.type)) {
      return {
        code: 400,
        msg: '宴会类型无效',
        data: null,
      };
    }

    try {
      const banquetData = {
        ...body,
        host_openid: hostOpenid,
        eventTime: body.event_time,
        returnRedPacket: body.return_red_packet || 0,
        returnGiftIds: body.return_gift_ids || [],
      };

      const data = await this.banquetService.createBanquet(banquetData);

      this.logger.log(`宴会创建成功: id=${data.id}`);

      // 发送人情提醒（异步执行，不阻塞响应）
      this.giftReminderService
        .sendReminders(data.id, hostOpenid)
        .catch((err) => this.logger.error('发送人情提醒失败:', err));

      return {
        code: 200,
        msg: '创建成功',
        data: data,
      };
    } catch (error: any) {
      this.logger.error(`创建宴会失败: ${error.message}`);
      return {
        code: 500,
        msg: '创建宴会失败',
        data: null,
      };
    }
  }

  /**
   * 更新宴会
   */
  @Put(':id')
  async updateBanquet(@Param('id') id: string, @Body() body: any, @Req() req: Request) {
    const hostOpenid = req.user?.openid || 'test_openid_123';

    this.logger.log(`更新宴会: id=${id}, openid=${hostOpenid}`);

    try {
      // 验证宴会所有权
      const banquet = await this.banquetService.getBanquetById(id);
      if (!banquet) {
        return {
          code: 404,
          msg: '宴会不存在',
          data: null,
        };
      }

      if (banquet.host_openid !== hostOpenid) {
        return {
          code: 403,
          msg: '无权限操作',
          data: null,
        };
      }

      await this.banquetService.updateBanquet(id, body);

      return {
        code: 200,
        msg: '更新成功',
        data: null,
      };
    } catch (error: any) {
      this.logger.error(`更新宴会失败: ${error.message}`);
      return {
        code: 500,
        msg: '更新宴会失败',
        data: null,
      };
    }
  }

  /**
   * 删除宴会（仅限草稿状态）
   */
  @Delete(':id')
  async deleteBanquet(@Param('id') id: string, @Req() req: Request) {
    const hostOpenid = req.user?.openid || 'test_openid_123';

    this.logger.log(`删除宴会: id=${id}, openid=${hostOpenid}`);

    try {
      const banquet = await this.banquetService.getBanquetById(id);

      if (!banquet) {
        return {
          code: 404,
          msg: '宴会不存在',
          data: null,
        };
      }

      if (banquet.host_openid !== hostOpenid) {
        return {
          code: 403,
          msg: '无权限操作',
          data: null,
        };
      }

      if (banquet.status !== 'draft') {
        return {
          code: 400,
          msg: '只能删除草稿状态的宴会',
          data: null,
        };
      }

      await this.banquetService.deleteBanquet(id);

      return {
        code: 200,
        msg: '删除成功',
        data: null,
      };
    } catch (error: any) {
      this.logger.error(`删除宴会失败: ${error.message}`);
      return {
        code: 500,
        msg: '删除宴会失败',
        data: null,
      };
    }
  }
}
