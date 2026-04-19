export declare class UserService {
    getUserStats(openid: string): Promise<{
        totalBanquets: number;
        totalGifts: number;
        totalAmount: number;
    }>;
    getGiftLedger(hostOpenid: string, page?: number, pageSize?: number): Promise<{
        records: any[];
        total: number;
    }>;
    getGuestGifts(guestOpenid: string): Promise<any[]>;
    getGuestBanquets(guestOpenid: string): Promise<any[]>;
    getUserInfo(openid: string): Promise<{
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
    }>;
    updateUserInfo(openid: string, data: {
        nickname?: string;
        avatar?: string;
    }): Promise<void>;
    activateVip(openid: string, months?: number): Promise<{
        code: number;
        msg: string;
        data: {
            vipExpireDate: string;
        };
    }>;
}
