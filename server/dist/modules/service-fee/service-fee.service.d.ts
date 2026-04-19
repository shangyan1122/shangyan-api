export interface ServiceFeeRecord {
    id: string;
    banquet_id: string;
    gift_record_id: string;
    guest_return_gift_id?: string;
    gift_amount: number;
    fee_rate: number;
    fee_amount: number;
    gift_type: 'mall' | 'onsite' | 'none';
    voucher_returned: boolean;
    voucher_id?: string;
    created_at: string;
}
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
export interface FeeStatistics {
    banquet_id: string;
    total_gifts: number;
    mall_gifts: number;
    onsite_gifts: number;
    total_gift_amount: number;
    total_fee_amount: number;
    mall_fee_amount: number;
    onsite_fee_amount: number;
}
export declare class ServiceFeeService {
    private readonly logger;
    private readonly FEE_RATE;
    calculateBanquetServiceFee(banquetId: string): Promise<FeeStatistics>;
    private getExistingStatistics;
    getUserVoucherBalance(openid: string): Promise<number>;
    getUserVouchers(openid: string): Promise<ShoppingVoucher[]>;
}
