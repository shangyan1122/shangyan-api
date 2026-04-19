import { WechatConfigService } from '@/common/services/wechat-config.service';
export declare class AuthController {
    private readonly wechatConfigService;
    private readonly logger;
    constructor(wechatConfigService: WechatConfigService);
    login(body: {
        code: string;
    }): Promise<{
        code: number;
        msg: string;
        data: {
            openid: string;
            token: string;
            userInfo: {
                id: any;
                nickname: any;
                avatar: any;
                phone: any;
                isVip: boolean;
                vipExpireDate: string;
            };
        };
    } | {
        code: number;
        msg: any;
        data: null;
    }>;
    guestLogin(body: {
        openid: string;
    }): Promise<{
        code: number;
        msg: string;
        data: null;
    } | {
        code: number;
        msg: string;
        data: {
            openid: string;
            token: string;
            userInfo: {
                id: any;
                nickname: any;
                avatar: any;
                phone: any;
                isVip: boolean;
                vipExpireDate: string;
            };
        };
    }>;
    getUserInfo(openid: string): Promise<{
        code: number;
        msg: string;
        data: null;
    } | {
        code: number;
        msg: string;
        data: {
            id: any;
            openid: any;
            nickname: any;
            avatar: any;
            phone: any;
            isVip: boolean;
            vipExpireDate: string;
        };
    }>;
    updateProfile(body: {
        openid: string;
        nickname?: string;
        avatar?: string;
    }): Promise<{
        code: number;
        msg: string;
        data: null;
    }>;
    checkLogin(openid: string): Promise<{
        code: number;
        msg: string;
        data: {
            isLogin: boolean;
            openid?: undefined;
        };
    } | {
        code: number;
        msg: string;
        data: {
            isLogin: boolean;
            openid: string;
        };
    }>;
}
