export interface GiftRecord {
    id: string;
    guest_name: string;
    guest_phone?: string;
    amount: number;
    blessing?: string;
    created_at: string;
    banquet_id: string;
    banquet_name: string;
    banquet_type: string;
    event_time: string;
}
export declare class ExcelExportService {
    private readonly logger;
    exportGiftLedger(params: {
        openid: string;
        banquetId?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<string>;
    exportBanquetReport(params: {
        openid: string;
        banquetId: string;
    }): Promise<string>;
}
