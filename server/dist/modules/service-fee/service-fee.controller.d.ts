import { ServiceFeeService } from './service-fee.service';
import { ShoppingVoucherService } from './shopping-voucher.service';
export declare class ServiceFeeController {
    private readonly serviceFeeService;
    private readonly voucherService;
    constructor(serviceFeeService: ServiceFeeService, voucherService: ShoppingVoucherService);
    calculateServiceFee(banquetId: string): Promise<{
        code: number;
        msg: string;
        data: import("./service-fee.service").FeeStatistics;
    }>;
    issueVoucher(banquetId: string): Promise<{
        code: number;
        msg: string;
        data: import("./shopping-voucher.service").ShoppingVoucher | null;
    }>;
    getVoucherBalance(openid: string): Promise<{
        code: number;
        msg: string;
        data: {
            balance: number;
        };
    }>;
    getVoucherList(openid: string): Promise<{
        code: number;
        msg: string;
        data: import("./shopping-voucher.service").ShoppingVoucher[];
    }>;
    useVoucher(body: {
        openid: string;
        amount: number;
        orderId?: string;
    }): Promise<{
        code: number;
        msg: string;
        data: {
            success: boolean;
            usedAmount: number;
            remainingBalance: number;
        };
    }>;
    issueVoucherManually(body: {
        openid: string;
        amount: number;
        description: string;
    }): Promise<{
        code: number;
        msg: string;
        data: import("./shopping-voucher.service").ShoppingVoucher | null;
    }>;
}
