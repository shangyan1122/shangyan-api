import { PartnerService } from './partner.service';
export declare class PartnerController {
    private readonly partnerService;
    constructor(partnerService: PartnerService);
    apply(body: any): Promise<{
        code: number;
        msg: string;
        data: null;
    } | {
        code: number;
        msg: string;
        data: {
            id: string;
            status: "pending" | "approved" | "rejected";
        };
    }>;
    getStatus(id: string): Promise<{
        code: number;
        msg: string;
        data: null;
    } | {
        code: number;
        msg: string;
        data: {
            id: string;
            companyName: string;
            status: "pending" | "approved" | "rejected";
            createdAt: string;
            reviewedAt: string | undefined;
            reviewerNote: string | undefined;
        };
    }>;
    getList(page?: string, pageSize?: string, status?: string): Promise<{
        code: number;
        msg: string;
        data: {
            records: any[];
            total: number;
        };
    }>;
    review(body: {
        id: string;
        status: 'approved' | 'rejected';
        note?: string;
    }): Promise<{
        code: number;
        msg: string;
        data: null;
    } | {
        code: number;
        msg: string;
        data: {
            id: string;
            status: "pending" | "approved" | "rejected";
        };
    }>;
}
