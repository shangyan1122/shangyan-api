import { PaymentService } from '../payment/payment.service';
export declare class WithdrawService {
    private readonly paymentService;
    private readonly logger;
    constructor(paymentService: PaymentService);
    getWithdrawRecords(openid: string, page?: number, pageSize?: number): Promise<{
        records: any[];
        total: number;
    }>;
    getAvailableBalance(openid: string): Promise<number>;
    applyWithdraw(openid: string, amount: number): Promise<{
        success: boolean;
        withdrawId?: string;
        errorMsg?: string;
    }>;
    getWithdrawDetail(withdrawId: string): Promise<any>;
}
