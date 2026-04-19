import { Request } from 'express';
export declare class MerchantController {
    private readonly logger;
    getAccount(req: Request): Promise<{
        code: number;
        msg: string;
        data: any;
    }>;
    recharge(body: {
        amount: number;
        paymentMethod?: string;
    }, req: Request): Promise<{
        code: number;
        msg: string;
        data: null;
    } | {
        code: number;
        msg: string;
        data: {
            orderId: string;
            amount: number;
            isMock: boolean;
            timeStamp: string;
            nonceStr: string;
            package: string;
            signType: string;
            paySign: string;
        };
    }>;
    rechargeCallback(body: any): Promise<{
        code: string;
        message: string;
    }>;
    getRechargeRecords(queryOpenid: string, req: Request): Promise<{
        code: number;
        msg: string;
        data: null;
    } | {
        code: number;
        msg: string;
        data: any[];
    }>;
    getBalanceLogs(queryOpenid: string, req: Request): Promise<{
        code: number;
        msg: string;
        data: null;
    } | {
        code: number;
        msg: string;
        data: any[];
    }>;
}
