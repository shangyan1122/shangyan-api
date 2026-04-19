import { AdminFinanceService } from './admin-finance.service';
export declare class AdminFinanceController {
    private readonly adminFinanceService;
    private readonly logger;
    constructor(adminFinanceService: AdminFinanceService);
    getStats(): Promise<{
        code: number;
        msg: string;
        data: any;
    }>;
    getTransactions(page?: string, pageSize?: string, type?: string, category?: string, startDate?: string, endDate?: string): Promise<{
        code: number;
        msg: string;
        data: {
            list: any[];
            total: number;
            page: number;
            pageSize: number;
        };
    }>;
    approveWithdraw(id: string): Promise<{
        code: number;
        msg: string;
        data: null;
    }>;
    rejectWithdraw(id: string): Promise<{
        code: number;
        msg: string;
        data: null;
    }>;
}
