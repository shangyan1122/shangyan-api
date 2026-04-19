import { GiftReminderService } from './gift-reminder.service';
export declare class GiftReminderController {
    private readonly giftReminderService;
    private readonly logger;
    constructor(giftReminderService: GiftReminderService);
    createReminder(body: {
        openid: string;
        guestName: string;
        guestPhone?: string;
        giftAmount: number;
        giftDate: string;
        banquetName: string;
        banquetType: string;
        reminderFrequency?: 'monthly' | 'quarterly' | 'yearly' | 'custom';
        notes?: string;
    }): Promise<{
        code: number;
        msg: string;
        data: import("./gift-reminder.service").GiftReminder;
    } | {
        code: number;
        msg: any;
        data: null;
    }>;
    getReminders(openid: string): Promise<{
        code: number;
        msg: string;
        data: import("./gift-reminder.service").GiftReminder[];
    }>;
    updateReminder(body: {
        id: string;
        openid: string;
        reminderEnabled?: boolean;
        reminderFrequency?: 'monthly' | 'quarterly' | 'yearly' | 'custom';
        notes?: string;
    }): Promise<{
        code: number;
        msg: any;
        data: null;
    }>;
    deleteReminder(body: {
        id: string;
        openid: string;
    }): Promise<{
        code: number;
        msg: any;
        data: null;
    }>;
}
