export interface CreateOrderDto {
    userOpenid: string;
    items: Array<{
        productId: string;
        quantity: number;
    }>;
    orderType: 'normal' | 'return_gift' | 'exchange';
    banquetId?: string;
    recipientInfo?: {
        name: string;
        phone: string;
        province?: string;
        city?: string;
        district?: string;
        address: string;
    };
    remark?: string;
}
export interface OrderItem {
    id: string;
    orderId: string;
    productId: string;
    productName: string;
    productImage: string;
    productPrice: number;
    quantity: number;
    totalPrice: number;
    isReturnGift: boolean;
}
export interface Order {
    id: string;
    orderNo: string;
    userOpenid: string;
    orderType: string;
    banquetId?: string;
    totalAmount: number;
    discountAmount: number;
    shippingFee: number;
    payAmount: number;
    payStatus: string;
    payTime?: string;
    payTransactionId?: string;
    shipStatus: string;
    shipTime?: string;
    recipientName?: string;
    recipientPhone?: string;
    recipientAddress?: string;
    status: string;
    remark?: string;
    createdAt: string;
    items?: OrderItem[];
    logistics?: any;
}
export declare class MallOrderService {
    private readonly logger;
    private generateOrderNo;
    createOrder(dto: CreateOrderDto): Promise<Order>;
    getOrderById(orderId: string): Promise<Order | null>;
    getUserOrders(userOpenid: string, status?: string, page?: number, pageSize?: number): Promise<{
        orders: Order[];
        total: number;
    }>;
    handlePaymentSuccess(orderNo: string, transactionId: string): Promise<boolean>;
    shipOrder(orderId: string, logisticsInfo: {
        company: string;
        code: string;
        trackingNo: string;
    }): Promise<boolean>;
    confirmReceive(orderId: string): Promise<boolean>;
    cancelOrder(orderId: string, reason?: string): Promise<boolean>;
    getPendingShipCount(): Promise<number>;
    getAllOrders(status?: string, page?: number, pageSize?: number): Promise<{
        orders: Order[];
        total: number;
    }>;
}
