export declare class PaidFeaturesService {
    private readonly logger;
    getPaidFeaturesStatus(openid: string): Promise<{
        aiWelcomePage: {
            paid: boolean;
            usedCount: number;
        };
        ledgerExport: {
            paid: boolean;
            usedCount: number;
        };
        giftReminder: {
            paid: boolean;
            usedCount: number;
        };
    }>;
    getBanquetPaidFeatures(banquetId: string): Promise<{
        ledgerExport: {
            enabled: boolean;
            paid: boolean;
            paidAt?: undefined;
        };
        giftReminder: {
            enabled: boolean;
            paid: boolean;
            paidAt?: undefined;
        };
        aiPage: {
            enabled: boolean;
            paid: boolean;
            imageCount: number;
            paidAt?: undefined;
        };
    } | {
        ledgerExport: {
            enabled: any;
            paid: any;
            paidAt: any;
        };
        giftReminder: {
            enabled: any;
            paid: any;
            paidAt: any;
        };
        aiPage: {
            enabled: any;
            paid: any;
            paidAt: any;
            imageCount: number;
        };
    }>;
    checkFeatureEnabled(banquetId: string, feature: string): Promise<boolean>;
    createPaymentOrder(openid: string, banquetId: string, feature: string, amount: number): Promise<{
        orderId: any;
        orderNo: any;
        mock: boolean;
        message: string;
        amount?: undefined;
        productName?: undefined;
    } | {
        orderId: any;
        orderNo: any;
        amount: any;
        productName: any;
        mock?: undefined;
        message?: undefined;
    }>;
    handlePaymentSuccess(orderId: string, transactionId: string): Promise<{
        success: boolean;
        message: string;
        orderId?: undefined;
        banquetId?: undefined;
    } | {
        success: boolean;
        orderId: string;
        banquetId: any;
        message?: undefined;
    }>;
    private enableFeature;
    private getFeatureUpdateField;
    enableAIPage(banquetId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
