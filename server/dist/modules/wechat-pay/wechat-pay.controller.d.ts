import { Request } from 'express';
import { WechatPayService } from './wechat-pay.service';
import { MemberService } from '../member/member.service';
export declare class WechatPayController {
    private readonly wechatPayService;
    private readonly memberService;
    private readonly logger;
    constructor(wechatPayService: WechatPayService, memberService: MemberService);
    createOrder(body: {
        openid: string;
        amount: number;
        description: string;
        orderId: string;
    }): Promise<{
        code: number;
        msg: string;
        data: {
            timeStamp: string;
            nonceStr: string;
            package: string;
            signType: string;
            paySign: any;
            prepayId: any;
        } | undefined;
    } | {
        code: number;
        msg: any;
        data: null;
    }>;
    queryOrder(body: {
        orderId: string;
    }): Promise<{
        code: number;
        msg: string;
        data: any;
    } | {
        code: number;
        msg: any;
        data: null;
    }>;
    refund(body: {
        orderId: string;
        refundId: string;
        totalAmount: number;
        refundAmount: number;
        reason?: string;
    }): Promise<{
        code: number;
        msg: string;
        data: any;
    } | {
        code: number;
        msg: any;
        data: null;
    }>;
    handleNotify(headers: any, req: Request): Promise<{
        code: string;
        message: string;
    }>;
}
