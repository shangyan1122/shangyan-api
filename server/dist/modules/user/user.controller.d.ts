import { Request } from 'express';
import { UserService } from './user.service';
export declare class UserController {
    private readonly userService;
    private readonly logger;
    constructor(userService: UserService);
    getUserStats(req: Request): Promise<{
        code: number;
        message: string;
        data: {
            totalBanquets: number;
            totalGifts: number;
            totalAmount: number;
        };
    }>;
    getGiftLedger(page: string | undefined, pageSize: string | undefined, req: Request): Promise<{
        code: number;
        message: string;
        data: {
            records: any[];
            total: number;
        };
    } | {
        code: number;
        message: string;
        data: {
            records: never[];
            total: number;
            page: number;
            pageSize: number;
        };
    }>;
    getMyGifts(req: Request): Promise<{
        code: number;
        message: string;
        data: any[];
    }>;
    getMyBanquets(openid: string, req: Request): Promise<{
        code: number;
        message: string;
        data: any[];
    }>;
    getUserInfo(openid: string, req: Request): Promise<{
        code: number;
        message: string;
        data: null;
    } | {
        code: number;
        message: string;
        data: {
            openid: string;
            nickname: string;
            avatar: string;
            phone: string;
            isVip: boolean;
            vipExpireDate: string;
            id?: undefined;
        } | {
            id: any;
            openid: any;
            nickname: any;
            avatar: any;
            phone: any;
            isVip: boolean;
            vipExpireDate: string;
        };
    }>;
    updateUserInfo(body: any, req: Request): Promise<{
        code: number;
        message: string;
        data: null;
    }>;
    activateVip(body: any, req: Request): Promise<{
        code: number;
        message: string;
        data: null;
    } | {
        code: number;
        message: string;
        data: {
            vipExpireDate: string;
        };
    }>;
}
