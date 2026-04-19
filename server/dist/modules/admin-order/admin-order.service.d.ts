export declare class AdminOrderService {
    private readonly logger;
    getOrders(params: {
        page?: number;
        pageSize?: number;
        status?: string;
        search?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<{
        code: number;
        msg: string;
        data: {
            list: any[];
            total: number;
            page: number;
            pageSize: number;
        };
    }>;
    getOrderDetail(orderId: string): Promise<{
        code: number;
        msg: string;
        data: any;
    }>;
    shipOrder(orderId: string): Promise<{
        code: number;
        msg: string;
        data: null;
    }>;
    completeOrder(orderId: string): Promise<{
        code: number;
        msg: string;
        data: null;
    }>;
    refundOrder(orderId: string): Promise<{
        code: number;
        msg: string;
        data: null;
    }>;
}
