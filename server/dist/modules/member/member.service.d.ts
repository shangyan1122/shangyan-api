export interface MemberStatus {
    isMember: boolean;
    expireTime?: string;
    features: {
        aiWelcomePage: boolean;
        ledgerExport: boolean;
        customCover: boolean;
        giftReminder: boolean;
    };
}
export interface MemberPurchase {
    id: string;
    openid: string;
    feature_id: string;
    amount: number;
    status: 'pending' | 'paid' | 'refunded';
    payment_order_id?: string;
    created_at: string;
}
export declare class MemberService {
    private readonly logger;
    getMemberStatus(openid: string): Promise<MemberStatus>;
    createPurchaseOrder(openid: string, featureId: string, amount: number, mockPay?: boolean): Promise<any>;
    handlePaymentSuccess(orderId: string): Promise<{
        success: boolean;
    }>;
    checkFeatureUnlocked(openid: string, featureId: string): Promise<boolean>;
}
