import { ServiceFeeService } from './service-fee.service';
export interface ShoppingVoucher {
    id: string;
    openid: string;
    banquet_id?: string;
    voucher_code: string;
    amount: number;
    balance: number;
    source_type: 'promotion' | 'manual';
    source_description?: string;
    status: 'active' | 'used_up' | 'expired';
    expired_at?: string;
    total_used: number;
    last_used_at?: string;
    created_at: string;
}
export declare class ShoppingVoucherService {
    private readonly serviceFeeService;
    private readonly logger;
    constructor(serviceFeeService: ServiceFeeService);
    issueVoucherOnBanquetEnd(banquetId: string): Promise<ShoppingVoucher | null>;
    private generateVoucherCode;
    useVoucher(openid: string, amount: number, orderId?: string): Promise<{
        success: boolean;
        usedAmount: number;
        remainingBalance: number;
    }>;
    getUserVoucherBalance(openid: string): Promise<number>;
    getUserVouchers(openid: string): Promise<ShoppingVoucher[]>;
    issueVoucherManually(openid: string, amount: number, description: string): Promise<ShoppingVoucher | null>;
    checkAndIssueVouchersForEndedBanquets(): Promise<void>;
}
