import { Request } from 'express';
import { BanquetService } from './banquet.service';
import { GiftReminderService } from '../gift-reminder/gift-reminder.service';
export declare class BanquetController {
    private readonly banquetService;
    private readonly giftReminderService;
    private readonly logger;
    constructor(banquetService: BanquetService, giftReminderService: GiftReminderService);
    getBanquets(status: string, req: Request): Promise<{
        code: number;
        msg: string;
        data: any[];
    }>;
    getBanquetById(id: string, req: Request): Promise<{
        code: number;
        msg: string;
        data: any;
    }>;
    getBanquetQrcode(id: string, req: Request): Promise<{
        code: number;
        msg: string;
        data: {
            qrcodeUrl: string;
            page: string;
            scene: string;
            sceneFormat: string;
            originalId: string;
            tip: string | undefined;
            error?: undefined;
        } | {
            qrcodeUrl: string;
            page: string;
            scene: string;
            error: any;
            sceneFormat?: undefined;
            originalId?: undefined;
            tip?: undefined;
        };
    } | {
        code: number;
        msg: string;
        data: null;
    }>;
    createBanquet(body: any, req: Request): Promise<{
        code: number;
        msg: string;
        data: any;
    }>;
    updateBanquet(id: string, body: any, req: Request): Promise<{
        code: number;
        msg: string;
        data: null;
    }>;
    deleteBanquet(id: string, req: Request): Promise<{
        code: number;
        msg: string;
        data: null;
    }>;
}
