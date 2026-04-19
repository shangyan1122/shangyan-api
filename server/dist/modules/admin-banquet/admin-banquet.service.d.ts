export declare class AdminBanquetService {
    private readonly logger;
    getBanquets(params: {
        page?: number;
        pageSize?: number;
        type?: string;
        status?: string;
        search?: string;
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
    getBanquetDetail(banquetId: string): Promise<{
        code: number;
        msg: string;
        data: any;
    }>;
    deleteBanquet(banquetId: string): Promise<{
        code: number;
        msg: string;
        data: null;
    }>;
}
