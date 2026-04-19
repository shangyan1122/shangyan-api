export declare class WechatPayService {
    private readonly logger;
    private paymentService;
    constructor();
    private initPaymentService;
    createJsapiOrder(params: {
        openid: string;
        amount: number;
        description: string;
        orderId: string;
    }): Promise<{
        success: boolean;
        data: {
            timeStamp: string;
            nonceStr: string;
            package: string;
            signType: string;
            paySign: any;
            prepayId: any;
        };
        message?: undefined;
    } | {
        success: boolean;
        message: any;
        data?: undefined;
    }>;
    queryOrder(orderId: string): Promise<{
        success: boolean;
        data: any;
        message?: undefined;
    } | {
        success: boolean;
        message: any;
        data?: undefined;
    }>;
    closeOrder(orderId: string): Promise<{
        success: boolean;
        message?: undefined;
    } | {
        success: boolean;
        message: any;
    }>;
    refund(params: {
        orderId: string;
        refundId: string;
        totalAmount: number;
        refundAmount: number;
        reason?: string;
    }): Promise<{
        success: boolean;
        data: any;
        message?: undefined;
    } | {
        success: boolean;
        message: any;
        data?: undefined;
    }>;
    verifyNotify(headers: any, body: string): boolean;
    decryptNotify(resource: any): any;
    transferToBalance(params: {
        openid: string;
        amount: number;
        description: string;
        orderId?: string;
    }): Promise<{
        success: boolean;
        paymentNo?: string;
        errorMsg?: string;
    }>;
}
