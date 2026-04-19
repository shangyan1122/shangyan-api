export declare class AdminFinanceService {
    private readonly logger;
    getStats(): Promise<{
        code: number;
        msg: string;
        data: any;
    }>;
    getTransactions(params: {
        page?: number;
        pageSize?: number;
        type?: string;
        category?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<{
        code: number;
        msg: string;
        data: {
            list: any[];
            total: number;
            page: number;
            pageSize: number;
        };
    }>;
    approveWithdraw(recordId: string): Promise<{
        code: number;
        msg: string;
        data: null;
    }>;
    rejectWithdraw(recordId: string): Promise<{
        code: number;
        msg: string;
        data: null;
    }>;
}
