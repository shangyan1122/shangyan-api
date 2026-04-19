import { Controller, Get, Post, Put, Delete, Body, Query } from '@nestjs/common';
import { GiftReminderService } from './gift-reminder.service';
import { Logger } from '@nestjs/common';

@Controller('gift-reminder')
export class GiftReminderController {
  private readonly logger = new Logger(GiftReminderController.name);

  constructor(private readonly giftReminderService: GiftReminderService) {}

  /**
   * 创建提醒
   */
  @Post('create')
  async createReminder(
    @Body()
    body: {
      openid: string;
      guestName: string;
      guestPhone?: string;
      giftAmount: number;
      giftDate: string;
      banquetName: string;
      banquetType: string;
      reminderFrequency?: 'monthly' | 'quarterly' | 'yearly' | 'custom';
      notes?: string;
    }
  ) {
    this.logger.log(`创建提醒: ${body.openid} - ${body.guestName}`);

    try {
      const reminder = await this.giftReminderService.createReminder(body);

      return {
        code: 200,
        msg: '创建成功',
        data: reminder,
      };
    } catch (error) {
      this.logger.error('创建提醒失败:', error);
      return {
        code: 500,
        msg: error.message || '创建失败',
        data: null,
      };
    }
  }

  /**
   * 获取用户提醒列表
   */
  @Get('list')
  async getReminders(@Query('openid') openid: string) {
    this.logger.log(`获取提醒列表: ${openid}`);

    try {
      const reminders = await this.giftReminderService.getUserReminders(openid);

      return {
        code: 200,
        msg: 'success',
        data: reminders,
      };
    } catch (error) {
      this.logger.error('获取提醒列表失败:', error);
      return {
        code: 500,
        msg: '获取失败',
        data: [],
      };
    }
  }

  /**
   * 更新提醒设置
   */
  @Put('update')
  async updateReminder(
    @Body()
    body: {
      id: string;
      openid: string;
      reminderEnabled?: boolean;
      reminderFrequency?: 'monthly' | 'quarterly' | 'yearly' | 'custom';
      notes?: string;
    }
  ) {
    this.logger.log(`更新提醒: ${body.id}`);

    try {
      await this.giftReminderService.updateReminder(body);

      return {
        code: 200,
        msg: '更新成功',
        data: null,
      };
    } catch (error) {
      this.logger.error('更新提醒失败:', error);
      return {
        code: 500,
        msg: error.message || '更新失败',
        data: null,
      };
    }
  }

  /**
   * 删除提醒
   */
  @Delete('delete')
  async deleteReminder(@Body() body: { id: string; openid: string }) {
    this.logger.log(`删除提醒: ${body.id}`);

    try {
      await this.giftReminderService.deleteReminder(body.id, body.openid);

      return {
        code: 200,
        msg: '删除成功',
        data: null,
      };
    } catch (error) {
      this.logger.error('删除提醒失败:', error);
      return {
        code: 500,
        msg: error.message || '删除失败',
        data: null,
      };
    }
  }
}
