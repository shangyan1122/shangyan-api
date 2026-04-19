import { WechatPayService } from '../wechat-pay/wechat-pay.service';
import { WechatSubscribeService } from '../wechat-subscribe/wechat-subscribe.service';
export interface ReturnGiftSetting {
    id: string;
    banquet_id: string;
    red_packet_enabled: boolean;
    red_packet_amount: number;
    mall_gift_enabled: boolean;
    mall_gift_items: MallGiftItem[];
    onsite_gift_enabled: boolean;
    onsite_gift_items: OnsiteGiftItem[];
    gift_claim_mode: 'all' | 'choose_one';
    gift_threshold: number;
    total_budget: number;
    created_at: string;
    updated_at: string;
}
export interface MallGiftItem {
    product_id: string;
    product_name: string;
    product_price: number;
    product_image: string;
    total_count: number;
    remaining_count: number;
}
export interface OnsiteGiftItem {
    id: string;
    name: string;
    image: string;
    price: number;
    total_count: number;
    remaining_count: number;
}
export interface GuestReturnGift {
    id: string;
    gift_record_id: string;
    banquet_id: string;
    guest_openid: string;
    red_packet_amount: number;
    red_packet_status: 'pending' | 'sent' | 'failed';
    red_packet_sent_at?: string;
    red_packet_error_msg?: string;
    mall_gift_claimed: boolean;
    mall_product_id?: string;
    mall_product_name?: string;
    mall_product_price?: number;
    mall_product_image?: string;
    mall_claim_type?: 'delivery' | 'exchange';
    delivery_status?: 'pending' | 'shipped' | 'delivered';
    recipient_name?: string;
    recipient_phone?: string;
    recipient_address?: string;
    express_company?: string;
    express_no?: string;
    onsite_gift_claimed: boolean;
    onsite_gift_id?: string;
    onsite_gift_name?: string;
    onsite_gift_image?: string;
    onsite_gift_price?: number;
    exchange_code?: string;
    exchange_status?: 'pending' | 'exchanged' | 'expired';
    exchanged_at?: string;
    status: 'pending' | 'completed' | 'partially_claimed';
    created_at: string;
}
export declare class ReturnGiftService {
    private readonly wechatPayService;
    private readonly wechatSubscribeService;
    private readonly logger;
    constructor(wechatPayService: WechatPayService, wechatSubscribeService: WechatSubscribeService);
    saveReturnGiftSettings(banquetId: string, settings: Partial<ReturnGiftSetting>): Promise<ReturnGiftSetting>;
    getReturnGiftSettings(banquetId: string): Promise<ReturnGiftSetting | null>;
    triggerReturnGift(giftRecordId: string): Promise<GuestReturnGift | null>;
    sendRedPacket(returnGiftId: string, openid: string, amount: number): Promise<{
        success: boolean;
        paymentNo: string | undefined;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        paymentNo?: undefined;
    }>;
    claimMallGift(returnGiftId: string, claimType: 'delivery' | 'exchange', deliveryInfo?: {
        name: string;
        phone: string;
        address: string;
    }): Promise<{
        success: boolean;
        gift: {
            product_id: string;
            product_name: string;
            product_price: number;
            product_image: string;
            claim_type: "delivery" | "exchange";
        };
    }>;
    claimOnsiteGift(returnGiftId: string): Promise<{
        success: boolean;
        gift: {
            id: string;
            name: string;
            image: string;
            price: number;
            exchange_code: string;
        };
    }>;
    exchangeOnsiteGift(exchangeCode: string): Promise<{
        success: boolean;
        gift: {
            name: any;
            image: any;
            price: any;
        };
    }>;
    exchangeOnsiteGiftWithAuth(exchangeCode: string, verifierWechat: string, verifierOpenid?: string): Promise<{
        success: boolean;
        gift: {
            name: any;
            image: any;
            price: any;
            guestName: any;
        };
        banquet: {
            name: any;
            type: any;
        };
    }>;
    private logRedemptionAttempt;
    getGuestReturnGift(giftRecordId: string): Promise<any>;
    private updateReturnGiftStatus;
    private generateExchangeCode;
    getUnclaimedGiftsStats(banquetId: string): Promise<{
        mall_gifts: {
            product_id: string;
            product_name: string;
            total: number;
            remaining: number;
            claimed: number;
        }[];
        onsite_gifts: {
            id: string;
            name: string;
            total: number;
            remaining: number;
            claimed: number;
        }[];
        total_unclaimed_value: number;
    } | null>;
    private calculateUnclaimedValue;
    refundUnclaimedGifts(banquetId: string): Promise<{
        success: boolean;
        message: string;
        refund_amount?: undefined;
        cannot_refund_amount?: undefined;
        cannot_refund_details?: undefined;
        refund_details?: undefined;
    } | {
        success: boolean;
        message: string;
        refund_amount: number;
        cannot_refund_amount: number;
        cannot_refund_details: any[];
        refund_details?: undefined;
    } | {
        success: boolean;
        message: any;
        cannot_refund_amount: number;
        cannot_refund_details: any[];
        refund_amount?: undefined;
        refund_details?: undefined;
    } | {
        success: boolean;
        refund_amount: number;
        refund_details: any[];
        cannot_refund_amount: number;
        cannot_refund_details: any[];
        message: string;
    }>;
    private sendMallGiftStockWarning;
    autoConfirmShipment(): Promise<{
        success: boolean;
        message: any;
        count: number;
    }>;
    private sendAutoShipNotice;
    getPendingShipOrders(): Promise<{
        success: boolean;
        data: any[];
        message?: undefined;
    } | {
        success: boolean;
        message: any;
        data: never[];
    }>;
    sendDeliveryReminderNotices(): Promise<{
        success: boolean;
        message: any;
        count: number;
    }>;
    getPendingDeliveryRecords(banquetId?: string): Promise<{
        success: boolean;
        data: any[];
        message?: undefined;
    } | {
        success: boolean;
        message: any;
        data: never[];
    }>;
    updateDeliveryInfo(returnGiftId: string, recipientName: string, recipientPhone: string, recipientAddress: string): Promise<{
        success: boolean;
        message: string;
        data: any;
    } | {
        success: boolean;
        message: any;
        data: null;
    }>;
}
