import { ExcelExportService } from './excel-export.service';
export declare class ExcelExportController {
    private readonly excelExportService;
    private readonly logger;
    constructor(excelExportService: ExcelExportService);
    exportGiftLedger(body: {
        openid: string;
        banquetId?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<{
        code: number;
        msg: string;
        data: {
            url: string;
        };
    } | {
        code: number;
        msg: any;
        data: null;
    }>;
    exportBanquetReport(body: {
        openid: string;
        banquetId: string;
    }): Promise<{
        code: number;
        msg: string;
        data: {
            url: string;
        };
    } | {
        code: number;
        msg: any;
        data: null;
    }>;
}
