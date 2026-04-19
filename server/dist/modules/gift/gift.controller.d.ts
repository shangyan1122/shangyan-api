import { Request } from 'express';
import { GiftService } from './gift.service';
import { ReferralService } from '../referral/referral.service';
export declare class GiftController {
    private readonly giftService;
    private readonly referralService;
    constructor(giftService: GiftService, referralService: ReferralService);
    checkGuest(body: {
        banquetId: string;
        guestOpenid: string;
    }): Promise<{
        code: number;
        message: string;
        data: {
            exists: boolean;
        };
    }>;
    createGiftRecord(body: any): Promise<{
        code: number;
        message: string;
        data: any;
    }>;
    supplementGiftRecord(body: {
        banquetId: string;
        guestName: string;
        guestPhone?: string;
        amount: number;
        blessing?: string;
        giftTime?: string;
    }, req: Request): Promise<{
        code: number;
        message: string;
        data: any;
    } | {
        code: number;
        message: any;
        data: null;
    }>;
    batchSupplementGiftRecords(body: {
        banquetId: string;
        hostOpenid: string;
        records: Array<{
            guestName: string;
            guestPhone?: string;
            amount: number;
            blessing?: string;
            giftTime?: string;
        }>;
    }): Promise<{
        code: number;
        message: string;
        data: {
            success: number;
            failed: number;
            records: any[];
        };
    } | {
        code: number;
        message: any;
        data: null;
    }>;
    getSupplementRecords(body: {
        banquetId: string;
        hostOpenid: string;
    }): Promise<{
        code: number;
        message: string;
        data: {
            records: any[];
        };
    } | {
        code: number;
        message: any;
        data: null;
    }>;
    deleteSupplementRecord(body: {
        id: string;
        banquetId: string;
        hostOpenid: string;
    }): Promise<{
        code: number;
        message: string;
        data: {
            success: boolean;
        };
    } | {
        code: number;
        message: any;
        data: null;
    }>;
}
