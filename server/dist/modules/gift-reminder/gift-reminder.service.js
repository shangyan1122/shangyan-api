"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var GiftReminderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GiftReminderService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const supabase_client_1 = require("../../storage/database/supabase-client");
const coze_coding_dev_sdk_1 = require("coze-coding-dev-sdk");
const wechat_subscribe_service_1 = require("../wechat-subscribe/wechat-subscribe.service");
const supabase = (0, supabase_client_1.getSupabaseClient)();
let GiftReminderService = GiftReminderService_1 = class GiftReminderService {
    constructor(subscribeService) {
        this.subscribeService = subscribeService;
        this.logger = new common_1.Logger(GiftReminderService_1.name);
        const config = new coze_coding_dev_sdk_1.Config();
        this.llmClient = new coze_coding_dev_sdk_1.LLMClient(config);
    }
    async checkAndSendReminders() {
        this.logger.log('开始检查人情往来提醒...');
        const today = new Date().toISOString().split('T')[0];
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
        for (const reminder of reminders) {
            try {
                await this.sendReminder(reminder);
                await this.updateNextReminderDate(reminder);
            }
            catch (error) {
                this.logger.error(`发送提醒失败: ${reminder.id}`, error);
            }
        }
    }
    async sendReminder(reminder) {
        const reminderContent = await this.generateReminderContent(reminder);
        this.logger.log(`
发送提醒:
  用户: ${reminder.openid}
  宾客: ${reminder.guest_name}
  内容: ${reminderContent}
    `);
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
        }
        catch (error) {
            this.logger.error(`订阅消息发送失败: ${error.message}`);
        }
        await supabase
            .from('gift_reminders')
            .update({ last_contact_date: new Date().toISOString() })
            .eq('id', reminder.id);
    }
    async generateReminderContent(reminder) {
        const daysSince = Math.floor((Date.now() - new Date(reminder.gift_date).getTime()) / (1000 * 60 * 60 * 24));
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
        }
        catch (error) {
            this.logger.error('生成提醒内容失败:', error);
            return `【人情提醒】${reminder.guest_name}曾在${reminder.banquet_name}随礼¥${(reminder.gift_amount / 100).toFixed(0)}，已过去${daysSince}天，记得保持联系哦~`;
        }
    }
    async updateNextReminderDate(reminder) {
        const nextDate = this.calculateNextReminderDate(reminder.reminder_frequency);
        await supabase
            .from('gift_reminders')
            .update({ next_reminder_date: nextDate })
            .eq('id', reminder.id);
    }
    calculateNextReminderDate(frequency) {
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
    async sendReminders(banquetId, openid) {
        this.logger.log(`触发人情提醒检测: 宴会ID=${banquetId}, 创建者openid=${openid}`);
        try {
            const { data: newBanquet, error: banquetError } = await supabase
                .from('banquets')
                .select('id, name, type, host_openid, host_name')
                .eq('id', banquetId)
                .single();
            if (banquetError || !newBanquet) {
                this.logger.error('获取宴会信息失败:', banquetError);
                return;
            }
            const { data: giftRecords, error: giftError } = await supabase
                .from('gift_records')
                .select(`
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
        `)
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
            for (const record of giftRecords) {
                const hostOpenid = record.banquets.host_openid;
                const hostBanquetId = record.banquet_id;
                const hostBanquetName = record.banquets.name;
                const giftAmount = record.amount;
                const guestName = record.guest_name || '嘉宾';
                const giftDate = new Date(record.created_at).toLocaleDateString('zh-CN');
                if (hostOpenid === openid) {
                    continue;
                }
                const { data: paidFeatures, error: featureError } = await supabase
                    .from('banquet_paid_features')
                    .select('gift_reminder_enabled')
                    .eq('banquet_id', hostBanquetId)
                    .single();
                if (featureError || !paidFeatures?.gift_reminder_enabled) {
                    this.logger.log(`主办方 ${hostOpenid} 未开通人情提醒，跳过`);
                    continue;
                }
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
                    await this.upsertReminderRecord({
                        hostOpenid,
                        guestOpenid: openid,
                        guestName,
                        giftAmount,
                        giftDate,
                        banquetId: hostBanquetId,
                        banquetName: hostBanquetName,
                        banquetType: record.banquets.type,
                    });
                }
                catch (error) {
                    this.logger.error(`发送人情提醒失败: ${error.message}`);
                }
            }
        }
        catch (error) {
            this.logger.error('人情提醒检测失败:', error);
        }
    }
    async upsertReminderRecord(params) {
        const { hostOpenid, guestOpenid, guestName, giftAmount, giftDate, banquetId, banquetName, banquetType, } = params;
        const { data: existing } = await supabase
            .from('gift_reminders')
            .select('id')
            .eq('openid', hostOpenid)
            .eq('guest_openid', guestOpenid)
            .eq('source_banquet_id', banquetId)
            .single();
        if (existing) {
            await supabase
                .from('gift_reminders')
                .update({ last_contact_date: new Date().toISOString() })
                .eq('id', existing.id);
            return;
        }
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
    async createReminder(params) {
        const { openid, guestName, guestPhone, giftAmount, giftDate, banquetName, banquetType, reminderFrequency = 'quarterly', notes, } = params;
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
    async getUserReminders(openid) {
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
    async updateReminder(params) {
        const { id, openid, reminderEnabled, reminderFrequency, notes } = params;
        const updateData = {};
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
    async deleteReminder(id, openid) {
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
};
exports.GiftReminderService = GiftReminderService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_9AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GiftReminderService.prototype, "checkAndSendReminders", null);
exports.GiftReminderService = GiftReminderService = GiftReminderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)((0, common_1.forwardRef)(() => wechat_subscribe_service_1.WechatSubscribeService))),
    __metadata("design:paramtypes", [wechat_subscribe_service_1.WechatSubscribeService])
], GiftReminderService);
//# sourceMappingURL=gift-reminder.service.js.map