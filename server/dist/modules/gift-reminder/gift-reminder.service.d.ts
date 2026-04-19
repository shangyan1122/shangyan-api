import { WechatSubscribeService } from '../wechat-subscribe/wechat-subscribe.service';
export interface GiftReminder {
    id: string;
    openid: string;
    guest_name: string;
    guest_phone?: string;
    guest_openid?: string;
    source_banquet_id?: string;
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
export declare class GiftReminderService {
    private readonly subscribeService;
    private readonly logger;
    private llmClient;
    constructor(subscribeService: WechatSubscribeService);
    checkAndSendReminders(): Promise<void>;
    private sendReminder;
    private generateReminderContent;
    private updateNextReminderDate;
    private calculateNextReminderDate;
    sendReminders(banquetId: string, openid: string): Promise<void>;
    private upsertReminderRecord;
    createReminder(params: {
        openid: string;
        guestName: string;
        guestPhone?: string;
        giftAmount: number;
        giftDate: string;
        banquetName: string;
        banquetType: string;
        reminderFrequency?: 'monthly' | 'quarterly' | 'yearly' | 'custom';
        notes?: string;
    }): Promise<GiftReminder>;
    getUserReminders(openid: string): Promise<GiftReminder[]>;
    updateReminder(params: {
        id: string;
        openid: string;
        reminderEnabled?: boolean;
        reminderFrequency?: 'monthly' | 'quarterly' | 'yearly' | 'custom';
        notes?: string;
    }): Promise<void>;
    deleteReminder(id: string, openid: string): Promise<void>;
}
