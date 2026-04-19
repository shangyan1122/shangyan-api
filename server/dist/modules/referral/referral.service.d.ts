export interface ReferralStats {
    referralCode: string;
    totalInvitees: number;
    activeInvitees: number;
    totalCommission: number;
    availableCommission: number;
    pendingCommission: number;
    vipInvitees: number;
    expireDate: string;
    isFreePerson: boolean;
    referrerName?: string;
    referrerExpireDate?: string;
}
export interface Invitee {
    id: string;
    nickname: string;
    avatar: string;
    inviteDate: string;
    isVip: boolean;
    vipExpireDate?: string;
    totalSpent: number;
    commission: number;
    commissionExpireDate: string;
    isExpired: boolean;
}
export declare class ReferralService {
    private readonly logger;
    private supabase;
    constructor();
    isFreePerson(openid: string): Promise<boolean>;
    getReferralStats(openid: string): Promise<{
        code: number;
        msg: string;
        data: ReferralStats;
    }>;
    getInvitees(openid: string): Promise<{
        code: number;
        msg: string;
        data: Invitee[];
    }>;
    getOrCreateReferralCode(openid: string): Promise<{
        code: number;
        msg: string;
        data: {
            code: string;
        };
    }>;
    bindOnGift(guestOpenid: string, hostOpenid: string, banquetId: string): Promise<{
        code: number;
        msg: string;
        isNewBind: boolean;
    }>;
    calculateCommission(openid: string, amount: number, paymentId: string, type?: 'vip' | 'mall' | 'gift'): Promise<{
        success: boolean;
        commissionAmount: number;
        referrerId?: string;
    }>;
    handleFreePersonCreateBanquet(openid: string): Promise<void>;
    checkExpiredRelations(): Promise<{
        expiredCount: number;
    }>;
    bindReferrer(openid: string, referralCode: string): Promise<{
        code: number;
        msg: string;
    }>;
    getCommissionHistory(openid: string): Promise<{
        code: number;
        msg: string;
        data: any[];
    }>;
    ensureUserExists(openid: string, nickname?: string, avatar?: string): Promise<string>;
    handleExpiredRelationsCron(): Promise<void>;
}
