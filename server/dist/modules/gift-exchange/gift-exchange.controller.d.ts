import { GiftExchangeService, CreateExchangeDto } from './gift-exchange.service';
export declare class GiftExchangeController {
    private readonly exchangeService;
    private readonly logger;
    constructor(exchangeService: GiftExchangeService);
    previewExchange(body: {
        sourceItems: any[];
        targetItems: any[];
    }): Promise<{
        code: number;
        msg: string;
        data: {
            sourceTotalValue: number;
            targetTotalValue: number;
            serviceFee: number;
            diffAmount: number;
            needPay: boolean;
        };
    } | {
        code: number;
        msg: any;
        data: null;
    }>;
    createExchange(body: CreateExchangeDto): Promise<{
        code: number;
        msg: string;
        data: import("./gift-exchange.service").ExchangeRecord;
    } | {
        code: number;
        msg: any;
        data: null;
    }>;
    getAvailableGifts(openid: string): Promise<{
        code: number;
        msg: string;
        data: any[];
    }>;
    getExchangeRecords(openid: string, page?: string, pageSize?: string): Promise<{
        code: number;
        msg: string;
        data: {
            records: import("./gift-exchange.service").ExchangeRecord[];
            total: number;
        };
    }>;
    getExchangeById(id: string): Promise<{
        code: number;
        msg: string;
        data: null;
    } | {
        code: number;
        msg: string;
        data: import("./gift-exchange.service").ExchangeRecord;
    }>;
    handleDiffPaymentSuccess(body: {
        exchangeNo: string;
        transactionId: string;
    }): Promise<{
        code: number;
        msg: any;
        data: {
            success: boolean;
        };
    }>;
    completeExchange(body: {
        exchangeId: string;
    }): Promise<{
        code: number;
        msg: any;
        data: {
            success: boolean;
        };
    }>;
    cancelExchange(body: {
        exchangeId: string;
    }): Promise<{
        code: number;
        msg: any;
        data: {
            success: boolean;
        };
    }>;
}
