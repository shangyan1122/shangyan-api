export interface WechatPaymentParams {
    banquetId: string;
    guestOpenid: string;
    guestName: string;
    amount: number;
    description: string;
    blessing?: string;
}
export interface PaymentResult {
    orderId: string;
    prepayId?: string;
    appId?: string;
    timeStamp: string;
    nonceStr: string;
    package: string;
    signType: string;
    paySign: string;
    isMock?: boolean;
}
export declare class PaymentService {
    private readonly logger;
    private profitSharingService;
    private readonly appId;
    private readonly mchId;
    private readonly apiKey;
    private readonly notifyUrl;
    private readonly apiV3Key;
    private pfxCert;
    private certPassphrase;
    constructor();
    private loadMerchantCert;
    private createCertAgent;
    createWechatPayment(params: WechatPaymentParams): Promise<PaymentResult>;
    private createMockPayment;
    handlePaymentCallback(body: any): Promise<{
        success: boolean;
        orderId?: string;
        errorMsg?: string;
    }>;
    transferToHost(openid: string, amount: number, description: string): Promise<{
        success: boolean;
        paymentNo?: string;
        errorMsg?: string;
    }>;
    verifyCallback(body: any): Promise<boolean>;
    parseCallbackData(body: any): Promise<{
        out_trade_no: string;
        transaction_id: string;
        openid: string;
        attach?: string;
    }>;
    queryPaymentStatus(orderId: string): Promise<any>;
    private generateNonceStr;
    private generateSignature;
    private generatePaySign;
    private buildXml;
    private parseXml;
    setProfitSharingService(service: any): void;
    private executeProfitSharingWithRetry;
}
