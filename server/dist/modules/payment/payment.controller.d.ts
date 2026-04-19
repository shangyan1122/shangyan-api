import { Request } from 'express';
import { PaymentService } from './payment.service';
import { ReturnGiftService } from '../return-gift/return-gift.service';
export declare class PaymentController {
    private readonly paymentService;
    private readonly returnGiftService;
    private readonly logger;
    constructor(paymentService: PaymentService, returnGiftService: ReturnGiftService);
    createGiftPayment(body: any, req: Request): Promise<{
        code: number;
        msg: string;
        data: null;
    } | {
        code: number;
        msg: string;
        data: import("./payment.service").PaymentResult;
    }>;
    paymentNotify(body: any): Promise<{
        code: string;
        message: string;
    }>;
    mockPaymentSuccess(body: {
        orderId: string;
    }): Promise<{
        code: number;
        msg: string;
        data: null;
    } | {
        code: number;
        msg: string;
        data: {
            orderId: string;
            amount: any;
            transferred: boolean;
        };
    }>;
    queryPayment(orderId: string): Promise<{
        code: number;
        msg: string;
        data: any;
    }>;
}
