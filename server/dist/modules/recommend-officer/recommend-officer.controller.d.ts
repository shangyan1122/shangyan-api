import { RecommendOfficerService } from './recommend-officer.service';
export declare class RecommendOfficerController {
    private readonly service;
    constructor(service: RecommendOfficerService);
    apply(body: {
        realName: string;
        idCard?: string;
        phone?: string;
        openid?: string;
    }, req: any): Promise<{
        code: number;
        msg: string;
        data?: import("./recommend-officer.service").RecommendOfficerInfo;
    }>;
    getStatus(openid: string, req: any): Promise<{
        code: number;
        msg: string;
        data?: import("./recommend-officer.service").OfficerStats & {
            isOfficer: boolean;
            officerInfo?: import("./recommend-officer.service").RecommendOfficerInfo;
        };
    }>;
    getInvitees(openid: string, req: any): Promise<{
        code: number;
        msg: string;
        data: any[];
    }>;
    bindUser(body: {
        officerId: string;
        openid?: string;
    }, req: any): Promise<{
        code: number;
        msg: string;
        isNewBind: boolean;
    } | {
        code: number;
        msg: string;
    }>;
}
export declare class AdminRecommendOfficerController {
    private readonly service;
    constructor(service: RecommendOfficerService);
    getList(page?: string, pageSize?: string, status?: string, keyword?: string): Promise<{
        code: number;
        msg: string;
        data: {
            list: any[];
            total: number;
        };
    }>;
    getDetail(id: string): Promise<{
        code: number;
        msg: string;
        data?: any;
    }>;
    updateOfficer(id: string, body: {
        vipCommissionRate?: number;
        mallCommissionRate?: number;
        status?: string;
        remark?: string;
    }): Promise<{
        code: number;
        msg: string;
    }>;
}
