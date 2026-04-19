import { ReturnGiftService, ReturnGiftSetting, GuestReturnGift } from './return-gift.service';
export declare class ReturnGiftController {
    private readonly returnGiftService;
    constructor(returnGiftService: ReturnGiftService);
    saveSettings(body: any): Promise<{
        code: number;
        msg: string;
        data: ReturnGiftSetting;
    }>;
    getSettings(banquetId: string): Promise<{
        code: number;
        msg: string;
        data: ReturnGiftSetting | null;
    }>;
    triggerReturnGift(body: {
        gift_record_id: string;
    }): Promise<{
        code: number;
        msg: string;
        data: GuestReturnGift | null;
    }>;
    getGuestReturnGift(giftRecordId: string): Promise<{
        code: number;
        msg: string;
        data: any;
    }>;
    claimMallGift(body: {
        return_gift_id: string;
        claim_type: 'delivery' | 'exchange';
        delivery_info?: {
            name: string;
            phone: string;
            address: string;
        };
    }): Promise<{
        code: number;
        msg: string;
        data: {
            success: boolean;
            gift: {
                product_id: string;
                product_name: string;
                product_price: number;
                product_image: string;
                claim_type: "delivery" | "exchange";
            };
        };
    }>;
    claimOnsiteGift(body: {
        return_gift_id: string;
    }): Promise<{
        code: number;
        msg: string;
        data: {
            success: boolean;
            gift: {
                id: string;
                name: string;
                image: string;
                price: number;
                exchange_code: string;
            };
        };
    }>;
    exchangeOnsiteGift(body: {
        exchange_code: string;
    }): Promise<{
        code: number;
        msg: string;
        data: {
            success: boolean;
            gift: {
                name: any;
                image: any;
                price: any;
            };
        };
    }>;
    exchangeOnsiteGiftWithAuth(body: {
        exchange_code: string;
        verifier_wechat: string;
        verifier_openid?: string;
    }): Promise<{
        code: number;
        msg: string;
        data: {
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
        };
    }>;
    getUnclaimedStats(banquetId: string): Promise<{
        code: number;
        msg: string;
        data: {
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
        } | null;
    }>;
    refundUnclaimedGifts(body: {
        banquet_id: string;
    }): Promise<{
        code: number;
        msg: any;
        data: {
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
        };
    }>;
    autoShip(): Promise<{
        code: number;
        msg: any;
        data: {
            count: number;
        };
    }>;
    getPendingShipOrders(): Promise<{
        code: number;
        msg: any;
        data: any[] | never[];
    }>;
    sendDeliveryReminders(): Promise<{
        code: number;
        msg: any;
        data: {
            count: number;
        };
    }>;
    getPendingDeliveryRecords(banquetId?: string): Promise<{
        code: number;
        msg: any;
        data: any[] | never[];
    }>;
    updateDeliveryInfo(body: {
        return_gift_id: string;
        recipient_name: string;
        recipient_phone: string;
        recipient_address: string;
    }): Promise<{
        code: number;
        msg: any;
        data: any;
    }>;
}
