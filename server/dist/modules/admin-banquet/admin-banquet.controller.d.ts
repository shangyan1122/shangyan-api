import { AdminBanquetService } from './admin-banquet.service';
export declare class AdminBanquetController {
    private readonly adminBanquetService;
    private readonly logger;
    constructor(adminBanquetService: AdminBanquetService);
    getBanquets(page?: string, pageSize?: string, type?: string, status?: string, search?: string): Promise<{
        code: number;
        msg: string;
        data: {
            list: any[];
            total: number;
            page: number;
            pageSize: number;
        };
    }>;
    getBanquetDetail(id: string): Promise<{
        code: number;
        msg: string;
        data: any;
    }>;
    deleteBanquet(id: string): Promise<{
        code: number;
        msg: string;
        data: null;
    }>;
}
