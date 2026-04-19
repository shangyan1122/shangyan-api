export declare class AdminStatsService {
    private readonly logger;
    getStats(params: {
        startDate?: string;
        endDate?: string;
    }): Promise<{
        code: number;
        msg: string;
        data: any;
    }>;
    getGiftRankings(): Promise<{
        code: number;
        msg: string;
        data: any[];
    }>;
    getBanquetRankings(): Promise<{
        code: number;
        msg: string;
        data: any[];
    }>;
    getSalesRankings(): Promise<{
        code: number;
        msg: string;
        data: any[];
    }>;
    getDailyTrend(): Promise<{
        code: number;
        msg: string;
        data: any[];
    }>;
}
