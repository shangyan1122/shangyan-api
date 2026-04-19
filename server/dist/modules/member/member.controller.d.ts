import { MemberService } from './member.service';
export declare class MemberController {
    private readonly memberService;
    private readonly logger;
    constructor(memberService: MemberService);
    getMemberStatus(openid: string): Promise<{
        code: number;
        msg: string;
        data: import("./member.service").MemberStatus;
    } | {
        code: number;
        msg: string;
        data: null;
    }>;
    createPurchase(body: {
        openid: string;
        featureId: string;
        amount: number;
        mockPay?: boolean;
    }): Promise<{
        code: number;
        msg: string;
        data: any;
    } | {
        code: number;
        msg: any;
        data: null;
    }>;
    handlePaymentCallback(body: any): Promise<{
        code: number;
        msg: string;
        data: {
            success: boolean;
        };
    } | {
        code: number;
        msg: string;
        data: null;
    }>;
    checkFeature(openid: string, featureId: string): Promise<{
        code: number;
        msg: string;
        data: {
            unlocked: boolean;
        };
    }>;
}
