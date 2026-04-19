export interface RecommendOfficerInfo {
    id: string;
    openid: string;
    realName: string;
    idCard?: string;
    phone?: string;
    status: string;
    vipCommissionRate: number;
    mallCommissionRate: number;
    totalCommission: number;
    availableCommission: number;
    totalInvitees: number;
    createdAt: string;
}
export interface OfficerStats {
    totalInvitees: number;
    activeInvitees: number;
    totalCommission: number;
    availableCommission: number;
    pendingCommission: number;
    vipCommissionRate: number;
    mallCommissionRate: number;
}
export declare class RecommendOfficerService {
    private readonly logger;
    private supabase;
    constructor();
    apply(openid: string, realName: string, idCard?: string, phone?: string): Promise<{
        code: number;
        msg: string;
        data?: RecommendOfficerInfo;
    }>;
    getStatus(openid: string): Promise<{
        code: number;
        msg: string;
        data?: OfficerStats & {
            isOfficer: boolean;
            officerInfo?: RecommendOfficerInfo;
        };
    }>;
    getInvitees(openid: string): Promise<{
        code: number;
        msg: string;
        data: any[];
    }>;
    bindUser(officerId: string, userId: string): Promise<{
        code: number;
        msg: string;
        isNewBind: boolean;
    }>;
    calculateCommission(openid: string, amount: number, paymentId: string, type?: 'vip' | 'mall' | 'gift'): Promise<{
        success: boolean;
        commissionAmount: number;
        officerId?: string;
    }>;
    getList(params: {
        page?: number;
        pageSize?: number;
        status?: string;
        keyword?: string;
    }): Promise<{
        code: number;
        msg: string;
        data: {
            list: any[];
            total: number;
        };
    }>;
    updateOfficer(officerId: string, updates: {
        vipCommissionRate?: number;
        mallCommissionRate?: number;
        status?: string;
        remark?: string;
    }): Promise<{
        code: number;
        msg: string;
    }>;
    getDetail(officerId: string): Promise<{
        code: number;
        msg: string;
        data?: any;
    }>;
}
