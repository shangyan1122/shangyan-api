export interface ExchangeItem {
    id: string;
    name: string;
    price: number;
    image?: string;
    quantity: number;
    sourceType?: 'user_return_gift' | 'guest_mall_gift';
}
export interface CreateExchangeDto {
    userOpenid: string;
    exchangeType: 'n_to_1' | '1_to_n';
    sourceItems: ExchangeItem[];
    targetItems: ExchangeItem[];
}
export interface ExchangeRecord {
    id: string;
    exchangeNo: string;
    userOpenid: string;
    exchangeType: string;
    sourceItems: ExchangeItem[];
    sourceTotalValue: number;
    targetItems: ExchangeItem[];
    targetTotalValue: number;
    serviceFee: number;
    diffAmount: number;
    diffPayStatus: string;
    status: string;
    orderId?: string;
    createdAt: string;
}
export declare class GiftExchangeService {
    private readonly logger;
    private generateExchangeNo;
    createExchange(dto: CreateExchangeDto): Promise<ExchangeRecord>;
    getExchangeById(exchangeId: string): Promise<ExchangeRecord | null>;
    getUserExchanges(userOpenid: string, page?: number, pageSize?: number): Promise<{
        records: ExchangeRecord[];
        total: number;
    }>;
    handleDiffPaymentSuccess(exchangeNo: string, transactionId: string): Promise<boolean>;
    completeExchange(exchangeId: string): Promise<boolean>;
    cancelExchange(exchangeId: string): Promise<boolean>;
    getUserAvailableGifts(userOpenid: string): Promise<any[]>;
    previewExchange(sourceItems: ExchangeItem[], targetItems: ExchangeItem[]): Promise<{
        sourceTotalValue: number;
        targetTotalValue: number;
        serviceFee: number;
        diffAmount: number;
        needPay: boolean;
    }>;
}
