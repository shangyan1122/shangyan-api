export interface ProfitSharingResult {
    success: boolean;
    transactionId?: string;
    outOrderNo?: string;
    errorMsg?: string;
    hostAmount?: number;
    platformAmount?: number;
}
export interface ProfitSharingReceiver {
    openid: string;
    name?: string;
    relationType: 'PARTNER' | 'SERVICE_PROVIDER' | 'STORE' | 'STAFF' | 'STORE_OWNER' | 'SUPPLIER' | 'CUSTOM' | 'USER';
}
export declare class ProfitSharingService {
    private readonly logger;
    private paymentService;
    constructor();
    private initPaymentService;
    executeProfitSharing(transactionId: string, hostOpenid: string, amount: number, orderId: string): Promise<ProfitSharingResult>;
    private addProfitSharingReceiver;
    executeProfitSharingWithRetry(transactionId: string, hostOpenid: string, amount: number, orderId: string, maxRetries?: number): Promise<ProfitSharingResult>;
    private notifyAdmin;
    private updateProfitSharingRecord;
    private mockProfitSharing;
    queryProfitSharing(outOrderNo: string): Promise<any>;
    unfreezeRemaining(transactionId: string, orderId: string): Promise<boolean>;
    private sleep;
}
