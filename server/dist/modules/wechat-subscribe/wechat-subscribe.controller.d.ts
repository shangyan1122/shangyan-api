import { WechatSubscribeService } from './wechat-subscribe.service';
export declare class WechatSubscribeController {
    private readonly subscribeService;
    private readonly logger;
    constructor(subscribeService: WechatSubscribeService);
    recordSubscription(body: {
        openid: string;
        templateId: string;
        subscribeStatus: 'accept' | 'reject' | 'ban';
    }): Promise<{
        code: number;
        msg: string;
    }>;
    checkSubscription(query: {
        openid: string;
        templateId: string;
    }): Promise<{
        code: number;
        data: {
            subscribed: boolean;
        };
    }>;
    sendTestMessage(body: {
        openid: string;
        type: 'gift_reminder' | 'return_gift' | 'payment_success' | 'banquet_reminder';
        data: any;
    }): Promise<{
        code: number;
        msg: string;
        data?: undefined;
    } | {
        code: number;
        msg: string;
        data: {
            success: boolean;
        };
    }>;
}
