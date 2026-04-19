import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { LLMClient, Config } from 'coze-coding-dev-sdk';
import { WechatSubscribeService } from '../wechat-subscribe/wechat-subscribe.service';

const supabase = getSupabaseClient();

export interface GiftReminder {
  id: string;
  openid: string;
  guest_name: string;
  guest_phone?: string;
  guest_openid?: string; // 嘉宾openid（用于事件触发）
  source_banquet_id?: string; // 来源宴会ID
  gift_amount: number;
  gift_date: string;
  banquet_name: string;
  banquet_type: string;
  last_contact_date?: string;
  reminder_enabled: boolean;
  reminder_frequency: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  next_reminder_date: string;
  notes?: string;
}

@Injectable()
export class GiftReminderService {
  private readonly logger = new Logger(GiftReminderService.name);
  private llmClient: LLMClient;

  constructor(
    @Inject(forwardRef(() => WechatSubscribeService))
    private readonly subscribeService: WechatSubscribeService
  ) {
    const config = new Config();
    this.llmClient = new LLMClient(config);
  }

  /**
   * 定时任务：检查并发送提醒
   * 每天上午 9 点执行
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkAndSendReminders() {
    this.logger.log('开始检查人情往来提醒...');

    const today = new Date().toISOString().split('T')[0];

    // 查询需要提醒的记录
    const { data: reminders, error } = await supabase
      .from('gift_reminders')
      .select('*')
      .eq('reminder_enabled', true)
      .lte('next_reminder_date', today);

    if (error) {
      this.logger.error('查询提醒记录失败:', error);
      return;
    }

    if (!reminders || reminders.length === 0) {
      this.logger.log('没有需要发送的提醒');
      return;
    }

    this.logger.log(`找到 ${reminders.length} 条提醒记录`);

    // 发送提醒
    for (const reminder of reminders) {
      try {
        await this.sendReminder(reminder);

        // 更新下次提醒时间
        await this.updateNextReminderDate(reminder);
      } catch (error) {
        this.logger.error(`发送提醒失败: ${reminder.id}`, error);
      }
    }
  }

  /**
   * 发送提醒
   */
  private async sendReminder(reminder: GiftReminder) {
    // 生成提醒内容
    const reminderContent = await this.generateReminderContent(reminder);

    this.logger.log(`
发送提醒:
  用户: ${reminder.openid}
  宾客: ${reminder.guest_name}
  内容: ${reminderContent}
    `);

    // 发送微信小程序订阅消息
    try {
      await this.subscribeService.sendGiftReminder({
        openid: reminder.openid,
        guestName: reminder.guest_name,
        giftAmount: reminder.gift_amount,
        giftDate: reminder.gift_date,
        banquetName: reminder.banquet_name,
        reminderContent,
      });
      this.logger.log('订阅消息发送成功');
    } catch (error: any) {
      this.logger.error(`订阅消息发送失败: ${error.message}`);
    }

    // 更新最后联系时间
    await supabase
      .from('gift_reminders')
      .update({ last_contact_date: new Date().toISOString() })
      .eq('id', reminder.id);
  }

  /**
   * 生成提醒内容
   */
  private async generateReminderContent(reminder: GiftReminder): Promise<string> {
    const daysSince = Math.floor(
      (Date.now() - new Date(reminder.gift_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    const prompt = `你是一个人情往来的提醒助手。请根据以下信息生成一条温馨的提醒消息：

宾客姓名: ${reminder.guest_name}
礼金金额: ¥${(reminder.gift_amount / 100).toFixed(0)}
宴会: ${reminder.banquet_name} (${reminder.banquet_type})
随礼日期: ${reminder.gift_date}
距离今天: ${daysSince}天

要求：
1. 语气温馨、友好
2. 提醒用户保持人情往来
3. 建议合适的回礼或联系时机
4. 不要太长，控制在50字以内

请直接输出提醒内容：`;

    try {
      const response = await this.llmClient.invoke([{ role: 'user', content: prompt }], {
        temperature: 0.7,
      });

      return response.content;
    } catch (error) {
      this.logger.error('生成提醒内容失败:', error);

      // 降级为固定模板
      return `【人情提醒】${reminder.guest_name}曾在${reminder.banquet_name}随礼¥${(reminder.gift_amount / 100).toFixed(0)}，已过去${daysSince}天，记得保持联系哦~`;
    }
  }

  /**
   * 更新下次提醒时间
   */
  private async updateNextReminderDate(reminder: GiftReminder) {
    const nextDate = this.calculateNextReminderDate(reminder.reminder_frequency);

    await supabase
      .from('gift_reminders')
      .update({ next_reminder_date: nextDate })
      .eq('id', reminder.id);
  }

  /**
   * 计算下次提醒时间
   */
  private calculateNextReminderDate(frequency: string): string {
    const now = new Date();

    switch (frequency) {
      case 'monthly':
        now.setMonth(now.getMonth() + 1);
        break;
      case 'quarterly':
        now.setMonth(now.getMonth() + 3);
        break;
      case 'yearly':
        now.setFullYear(now.getFullYear() + 1);
        break;
      default:
        now.setMonth(now.getMonth() + 1);
    }

    return now.toISOString().split('T')[0];
  }

  /**
   * 发送人情提醒（创建宴会后触发）
   * 核心逻辑：当嘉宾创建宴会时，通知曾经收到该嘉宾随礼的主办方
   *
   * 流程：
   * 1. 查询该用户（openid）在 gift_records 中的随礼记录
   * 2. 找出收到该用户随礼的所有宴会主办方
   * 3. 检查这些主办方是否开通了"人情提醒"功能
   * 4. 如果开通，发送订阅消息通知
   */
  async sendReminders(banquetId: string, openid: string): Promise<void> {
    this.logger.log(`触发人情提醒检测: 宴会ID=${banquetId}, 创建者openid=${openid}`);

    try {
      // 1. 获取新创建的宴会信息
      const { data: newBanquet, error: banquetError } = await supabase
        .from('banquets')
        .select('id, name, type, host_openid, host_name')
        .eq('id', banquetId)
        .single();

      if (banquetError || !newBanquet) {
        this.logger.error('获取宴会信息失败:', banquetError);
        return;
      }

      // 2. 查询该用户曾在哪些宴会上随礼过
      // 通过 gift_records 表查找：openid = 当前创建者的openid
      const { data: giftRecords, error: giftError } = await supabase
        .from('gift_records')
        .select(
          `
          id,
          banquet_id,
          guest_name,
          amount,
          created_at,
          banquets!inner(
            id,
            name,
            type,
            host_openid
          )
        `
        )
        .eq('openid', openid)
        .eq('payment_status', 'paid');

      if (giftError) {
        this.logger.error('查询随礼记录失败:', giftError);
        return;
      }

      if (!giftRecords || giftRecords.length === 0) {
        this.logger.log('该用户未曾随礼给其他人，无需触发人情提醒');
        return;
      }

      this.logger.log(`该用户曾随礼 ${giftRecords.length} 次，开始检查主办方人情提醒状态`);

      // 3. 对每个随礼记录，检查宴会主办方是否开通了人情提醒
      for (const record of giftRecords) {
        const hostOpenid = (record.banquets as any).host_openid;
        const hostBanquetId = record.banquet_id;
        const hostBanquetName = (record.banquets as any).name;
        const giftAmount = record.amount;
        const guestName = record.guest_name || '嘉宾';
        const giftDate = new Date(record.created_at).toLocaleDateString('zh-CN');

        // 检查主办方是否为自己（不通知自己）
        if (hostOpenid === openid) {
          continue;
        }

        // 4. 检查该主办方是否开通了人情提醒
        const { data: paidFeatures, error: featureError } = await supabase
          .from('banquet_paid_features')
          .select('gift_reminder_enabled')
          .eq('banquet_id', hostBanquetId)
          .single();

        if (featureError || !paidFeatures?.gift_reminder_enabled) {
          this.logger.log(`主办方 ${hostOpenid} 未开通人情提醒，跳过`);
          continue;
        }

        // 5. 发送订阅消息通知主办方
        this.logger.log(`发送人情提醒给主办方: ${hostOpenid}`);

        try {
          const reminderContent = `【人情提醒】${guestName}正在举办${newBanquet.name || '宴会'}，他曾在您的"${hostBanquetName}"随礼¥${(giftAmount / 100).toFixed(0)}，是时候礼尚往来了~`;

          await this.subscribeService.sendGiftReminder({
            openid: hostOpenid,
            guestName: guestName,
            giftAmount: giftAmount,
            giftDate: giftDate,
            banquetName: hostBanquetName,
            reminderContent,
          });

          this.logger.log(`人情提醒发送成功: 主办方=${hostOpenid}, 嘉宾=${guestName}`);

          // 6. 记录到 gift_reminders 表（如果不存在）
          await this.upsertReminderRecord({
            hostOpenid,
            guestOpenid: openid,
            guestName,
            giftAmount,
            giftDate,
            banquetId: hostBanquetId,
            banquetName: hostBanquetName,
            banquetType: (record.banquets as any).type,
          });
        } catch (error: any) {
          this.logger.error(`发送人情提醒失败: ${error.message}`);
        }
      }
    } catch (error: any) {
      this.logger.error('人情提醒检测失败:', error);
    }
  }

  /**
   * 创建或更新提醒记录
   */
  private async upsertReminderRecord(params: {
    hostOpenid: string;
    guestOpenid: string;
    guestName: string;
    giftAmount: number;
    giftDate: string;
    banquetId: string;
    banquetName: string;
    banquetType: string;
  }): Promise<void> {
    const {
      hostOpenid,
      guestOpenid,
      guestName,
      giftAmount,
      giftDate,
      banquetId,
      banquetName,
      banquetType,
    } = params;

    // 检查是否已存在
    const { data: existing } = await supabase
      .from('gift_reminders')
      .select('id')
      .eq('openid', hostOpenid)
      .eq('guest_openid', guestOpenid)
      .eq('source_banquet_id', banquetId)
      .single();

    if (existing) {
      // 更新最后联系时间
      await supabase
        .from('gift_reminders')
        .update({ last_contact_date: new Date().toISOString() })
        .eq('id', existing.id);
      return;
    }

    // 创建新记录
    const nextReminderDate = this.calculateNextReminderDate('quarterly');

    await supabase.from('gift_reminders').insert({
      openid: hostOpenid,
      guest_name: guestName,
      guest_openid: guestOpenid,
      source_banquet_id: banquetId,
      gift_amount: giftAmount,
      gift_date: giftDate,
      banquet_name: banquetName,
      banquet_type: banquetType,
      reminder_enabled: true,
      reminder_frequency: 'quarterly',
      next_reminder_date: nextReminderDate,
    });
  }

  /**
   * 创建提醒记录
   */
  async createReminder(params: {
    openid: string;
    guestName: string;
    guestPhone?: string;
    giftAmount: number;
    giftDate: string;
    banquetName: string;
    banquetType: string;
    reminderFrequency?: 'monthly' | 'quarterly' | 'yearly' | 'custom';
    notes?: string;
  }): Promise<GiftReminder> {
    const {
      openid,
      guestName,
      guestPhone,
      giftAmount,
      giftDate,
      banquetName,
      banquetType,
      reminderFrequency = 'quarterly',
      notes,
    } = params;

    const nextReminderDate = this.calculateNextReminderDate(reminderFrequency);

    const { data, error } = await supabase
      .from('gift_reminders')
      .insert({
        openid,
        guest_name: guestName,
        guest_phone: guestPhone,
        gift_amount: giftAmount,
        gift_date: giftDate,
        banquet_name: banquetName,
        banquet_type: banquetType,
        reminder_enabled: true,
        reminder_frequency: reminderFrequency,
        next_reminder_date: nextReminderDate,
        notes,
      })
      .select()
      .single();

    if (error) {
      this.logger.error('创建提醒记录失败:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * 获取用户的提醒列表
   */
  async getUserReminders(openid: string): Promise<GiftReminder[]> {
    const { data, error } = await supabase
      .from('gift_reminders')
      .select('*')
      .eq('openid', openid)
      .order('next_reminder_date', { ascending: true });

    if (error) {
      this.logger.error('获取提醒列表失败:', error);
      return [];
    }

    return data || [];
  }

  /**
   * 更新提醒设置
   */
  async updateReminder(params: {
    id: string;
    openid: string;
    reminderEnabled?: boolean;
    reminderFrequency?: 'monthly' | 'quarterly' | 'yearly' | 'custom';
    notes?: string;
  }): Promise<void> {
    const { id, openid, reminderEnabled, reminderFrequency, notes } = params;

    const updateData: any = {};

    if (reminderEnabled !== undefined) {
      updateData.reminder_enabled = reminderEnabled;
    }

    if (reminderFrequency) {
      updateData.reminder_frequency = reminderFrequency;
      updateData.next_reminder_date = this.calculateNextReminderDate(reminderFrequency);
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const { error } = await supabase
      .from('gift_reminders')
      .update(updateData)
      .eq('id', id)
      .eq('openid', openid);

    if (error) {
      this.logger.error('更新提醒设置失败:', error);
      throw new Error(error.message);
    }
  }

  /**
   * 删除提醒
   */
  async deleteReminder(id: string, openid: string): Promise<void> {
    const { error } = await supabase
      .from('gift_reminders')
      .delete()
      .eq('id', id)
      .eq('openid', openid);

    if (error) {
      this.logger.error('删除提醒失败:', error);
      throw new Error(error.message);
    }
  }
}
