import { PaidFeaturesService } from './paid-features.service';
export declare class PaidFeaturesController {
    private readonly paidFeaturesService;
    private readonly logger;
    constructor(paidFeaturesService: PaidFeaturesService);
    getPaidFeaturesStatus(openid: string): Promise<{
        code: number;
        msg: string;
        data: {
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
        };
    } | {
        code: number;
        msg: string;
        data: null;
    }>;
    getBanquetPaidFeatures(banquetId: string): Promise<{
        code: number;
        msg: string;
        data: {
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
        };
    } | {
        code: number;
        msg: string;
        data: null;
    }>;
    createPayment(body: {
        openid: string;
        banquetId: string;
        feature: string;
        amount: number;
    }): Promise<{
        code: number;
        msg: string;
        data: {
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
        };
    } | {
        code: number;
        msg: any;
        data: null;
    }>;
    handlePaymentCallback(body: any): Promise<{
        code: number;
        msg: string;
        data: {
            success: boolean;
            message: string;
            orderId?: undefined;
            banquetId?: undefined;
        } | {
            success: boolean;
            orderId: string;
            banquetId: any;
            message?: undefined;
        };
    } | {
        code: number;
        msg: string;
        data: null;
    }>;
    checkFeature(banquetId: string, feature: string): Promise<{
        code: number;
        msg: string;
        data: {
            enabled: boolean;
        };
    }>;
    enableAIPage(body: {
        banquetId: string;
    }): Promise<{
        code: number;
        msg: string;
        data: {
            success: boolean;
            message: string;
        };
    } | {
        code: number;
        msg: any;
        data: null;
    }>;
}
