import { Request } from 'express';
export declare class OnsiteGiftController {
    private readonly logger;
    generateClaimCode(body: {
        banquetId: string;
        guestOpenid: string;
        guestName?: string;
    }): Promise<{
        code: number;
        msg: string;
        data: null;
    } | {
        code: number;
        msg: string;
        data: {
            codes: {
                code: string;
                giftId: string;
                giftName: string;
                giftImage: string;
            }[];
        };
    }>;
    getMyCodes(banquetId: string, guestOpenid: string): Promise<{
        code: number;
        msg: string;
        data: {
            code: any;
            giftName: any;
            giftImage: any;
            status: any;
            claimedAt: any;
            usedAt: any;
        }[];
    }>;
    getCodeInfo(code: string): Promise<{
        code: number;
        msg: string;
        data: null;
    } | {
        code: number;
        msg: string;
        data: {
            code: any;
            giftName: any;
            giftImage: any;
            status: any;
            guestName: any;
            banquet: any;
        };
    }>;
    redeemCode(body: {
        code: string;
        verifierOpenid?: string;
    }, req: Request): Promise<{
        code: number;
        msg: string;
        data: null;
    } | {
        code: number;
        msg: string;
        data: {
            giftName: any;
            guestName: any;
        };
    }>;
    getBanquetGifts(banquetId: string, req: Request): Promise<{
        code: number;
        msg: string;
        data: {
            id: any;
            name: any;
            image: any;
            price: any;
            displayPrice: string;
            totalCount: any;
            remainingCount: any;
        }[];
    }>;
    getGiftStats(banquetId: string, page: string | undefined, pageSize: string | undefined, req: Request): Promise<{
        code: number;
        msg: string;
        data: null;
    } | {
        code: number;
        msg: string;
        data: {
            giftStats: {
                id: any;
                name: any;
                image: any;
                price: any;
                displayPrice: string;
                totalCount: any;
                remainingCount: any;
                claimedCount: number;
                claimedPercentage: string;
            }[];
            totalStats: {
                totalGifts: number;
                totalCount: any;
                totalRemaining: any;
                totalClaimed: any;
            };
            redemptionRecords: {
                id: any;
                code: any;
                guestName: any;
                giftName: any;
                verifierOpenid: any;
                redeemedAt: any;
            }[];
            pagination: {
                page: number;
                pageSize: number;
                total: number;
                totalPages: number;
            };
        };
    }>;
    private generateRandomCode;
}
