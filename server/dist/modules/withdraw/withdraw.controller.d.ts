import { Request } from 'express';
import { WithdrawService } from './withdraw.service';
export declare class WithdrawController {
    private readonly withdrawService;
    private readonly logger;
    constructor(withdrawService: WithdrawService);
    getBalance(req: Request): Promise<{
        code: number;
        msg: string;
        data: null;
    } | {
        code: number;
        msg: string;
        data: {
            balance: number;
            balanceYuan: string;
        };
    }>;
    applyWithdraw(body: {
        amount: number;
    }, req: Request): Promise<{
        code: number;
        msg: string;
        data: null;
    } | {
        code: number;
        msg: string;
        data: {
            withdrawId: string | undefined;
        };
    }>;
    getRecords(page: string | undefined, pageSize: string | undefined, req: Request): Promise<{
        code: number;
        msg: string;
        data: null;
    } | {
        code: number;
        msg: string;
        data: {
            records: any[];
            total: number;
        };
    }>;
    getDetail(id: string, req: Request): Promise<{
        code: number;
        msg: string;
        data: any;
    }>;
}
