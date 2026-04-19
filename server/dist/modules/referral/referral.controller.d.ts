import { ReferralService } from './referral.service';
export declare class ReferralController {
    private readonly referralService;
    constructor(referralService: ReferralService);
    getStats(openid: string, req: any): Promise<{
        code: number;
        msg: string;
        data: import("./referral.service").ReferralStats;
    }>;
    getInvitees(openid: string, req: any): Promise<{
        code: number;
        msg: string;
        data: import("./referral.service").Invitee[];
    }>;
    getReferralCode(openid: string, req: any): Promise<{
        code: number;
        msg: string;
        data: {
            code: string;
        };
    }>;
    bindReferrer(body: {
        openid?: string;
        code: string;
    }, req: any): Promise<{
        code: number;
        msg: string;
    }>;
    bindOnGift(body: {
        guestOpenid?: string;
        hostOpenid: string;
        banquetId: string;
    }, req: any): Promise<{
        code: number;
        msg: string;
        isNewBind: boolean;
    }>;
    checkIsFree(openid: string, req: any): Promise<{
        code: number;
        msg: string;
        data: {
            isFreePerson: boolean;
        };
    }>;
    calculateCommission(body: {
        openid: string;
        amount: number;
        paymentId: string;
        type: 'vip' | 'mall' | 'gift';
    }): Promise<{
        success: boolean;
        commissionAmount: number;
        referrerId?: string;
    }>;
    handleFreePersonCreateBanquet(body: {
        openid: string;
    }): Promise<{
        code: number;
        msg: string;
    }>;
    getCommissions(openid: string, req: any): Promise<{
        code: number;
        msg: string;
        data: any[];
    }>;
    checkExpired(): Promise<{
        code: number;
        msg: string;
        data: {
            expiredCount: number;
        };
    }>;
    login(body: {
        openid?: string;
        nickname?: string;
        avatar?: string;
    }, req: any): Promise<{
        code: number;
        msg: string;
        data: {
            userId: string;
        };
    }>;
}
