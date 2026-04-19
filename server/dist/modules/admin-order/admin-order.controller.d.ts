import { AdminOrderService } from './admin-order.service';
export declare class AdminOrderController {
    private readonly adminOrderService;
    private readonly logger;
    constructor(adminOrderService: AdminOrderService);
    getOrders(page?: string, pageSize?: string, status?: string, search?: string, startDate?: string, endDate?: string): Promise<{
        code: number;
        msg: string;
        data: {
            list: any[];
            total: number;
            page: number;
            pageSize: number;
        };
    }>;
    getOrderDetail(id: string): Promise<{
        code: number;
        msg: string;
        data: any;
    }>;
    shipOrder(id: string): Promise<{
        code: number;
        msg: string;
        data: null;
    }>;
    completeOrder(id: string): Promise<{
        code: number;
        msg: string;
        data: null;
    }>;
    refundOrder(id: string): Promise<{
        code: number;
        msg: string;
        data: null;
    }>;
}
