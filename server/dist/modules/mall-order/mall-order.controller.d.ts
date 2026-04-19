import { MallOrderService, CreateOrderDto } from './mall-order.service';
export declare class MallOrderController {
    private readonly orderService;
    private readonly logger;
    constructor(orderService: MallOrderService);
    createOrder(body: CreateOrderDto): Promise<{
        code: number;
        msg: string;
        data: import("./mall-order.service").Order;
    } | {
        code: number;
        msg: any;
        data: null;
    }>;
    getUserOrders(openid: string, status?: string, page?: string, pageSize?: string): Promise<{
        code: number;
        msg: string;
        data: {
            orders: import("./mall-order.service").Order[];
            total: number;
        };
    }>;
    getOrderById(id: string): Promise<{
        code: number;
        msg: string;
        data: null;
    } | {
        code: number;
        msg: string;
        data: import("./mall-order.service").Order;
    }>;
    handlePaymentSuccess(body: {
        orderNo: string;
        transactionId: string;
    }): Promise<{
        code: number;
        msg: any;
        data: {
            success: boolean;
        };
    }>;
    shipOrder(body: {
        orderId: string;
        company: string;
        code: string;
        trackingNo: string;
    }): Promise<{
        code: number;
        msg: any;
        data: {
            success: boolean;
        };
    }>;
    confirmReceive(body: {
        orderId: string;
    }): Promise<{
        code: number;
        msg: any;
        data: {
            success: boolean;
        };
    }>;
    cancelOrder(body: {
        orderId: string;
        reason?: string;
    }): Promise<{
        code: number;
        msg: any;
        data: {
            success: boolean;
        };
    }>;
    getAdminStats(): Promise<{
        code: number;
        msg: string;
        data: {
            pendingShipCount: number;
        };
    } | {
        code: number;
        msg: string;
        data: null;
    }>;
    getAllOrders(status?: string, page?: string, pageSize?: string): Promise<{
        code: number;
        msg: string;
        data: {
            orders: import("./mall-order.service").Order[];
            total: number;
        };
    }>;
}
