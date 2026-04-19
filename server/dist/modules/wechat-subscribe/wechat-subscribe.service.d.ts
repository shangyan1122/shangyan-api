export interface SubscribeMessage {
    touser: string;
    template_id: string;
    page?: string;
    data: Record<string, {
        value: string;
    }>;
    miniprogram_state?: 'developer' | 'trial' | 'formal';
    lang?: 'zh_CN' | 'zh_TW' | 'en';
}
export declare class WechatSubscribeService {
    private readonly logger;
    private readonly appId;
    private readonly appSecret;
    private accessToken;
    private tokenExpireTime;
    private getAccessToken;
    sendSubscribeMessage(message: SubscribeMessage): Promise<{
        success: boolean;
        errcode?: number;
        errmsg?: string;
    }>;
    sendGiftReminder(params: {
        openid: string;
        guestName: string;
        giftAmount: number;
        giftDate: string;
        banquetName: string;
        reminderContent: string;
    }): Promise<{
        success: boolean;
    }>;
    sendReturnGiftNotify(params: {
        openid: string;
        guestName: string;
        banquetName: string;
        giftName: string;
        claimCode: string;
    }): Promise<{
        success: boolean;
    }>;
    sendGuestBanquetNotify(params: {
        openid: string;
        guestName: string;
        guestBanquetName: string;
        giftAmount: number;
        sourceBanquetName: string;
        tip?: string;
    }): Promise<{
        success: boolean;
    }>;
    sendPaymentSuccess(params: {
        openid: string;
        banquetName: string;
        guestName: string;
        amount: number;
        time: string;
    }): Promise<{
        success: boolean;
    }>;
    sendBanquetReminder(params: {
        openid: string;
        banquetName: string;
        banquetType: string;
        eventTime: string;
        location: string;
    }): Promise<{
        success: boolean;
    }>;
    recordSubscription(params: {
        openid: string;
        templateId: string;
        subscribeStatus: 'accept' | 'reject' | 'ban';
    }): Promise<void>;
    checkSubscription(openid: string, templateId: string): Promise<boolean>;
    batchSendSubscribeMessages(messages: SubscribeMessage[]): Promise<{
        success: number;
        failed: number;
    }>;
    sendStockWarning(params: {
        openid: string;
        banquetName: string;
        productName: string;
        totalCount: number;
        remainingCount: number;
        remainingPercentage: string;
    }): Promise<{
        success: boolean;
    }>;
    sendDeliveryReminder(params: {
        openid: string;
        banquetName: string;
        productName: string;
        claimedAt: string;
    }): Promise<{
        success: boolean;
    }>;
}
