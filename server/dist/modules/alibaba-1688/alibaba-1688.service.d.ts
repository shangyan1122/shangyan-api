export interface Alibaba1688Config {
    id: string;
    app_key: string;
    app_secret: string;
    access_token?: string;
    refresh_token?: string;
    token_expires_at?: string;
    dropship_enabled: boolean;
    default_markup_rate: number;
    status: 'active' | 'inactive' | 'expired';
    created_at: string;
    updated_at: string;
}
export interface DropshipOrder {
    id: string;
    banquet_id: string;
    return_gift_id: string;
    guest_openid: string;
    alibaba_order_id?: string;
    alibaba_order_status?: string;
    product_id: string;
    sku_id?: string;
    product_name?: string;
    product_image?: string;
    quantity: number;
    supply_cost_price: number;
    sale_price: number;
    profit?: number;
    recipient_name?: string;
    recipient_phone?: string;
    recipient_province?: string;
    recipient_city?: string;
    recipient_district?: string;
    recipient_address?: string;
    express_company?: string;
    express_no?: string;
    shipped_at?: string;
    delivered_at?: string;
    status: 'pending' | 'ordered' | 'shipped' | 'delivered' | 'cancelled' | 'failed';
    error_message?: string;
    created_at: string;
    updated_at: string;
}
export interface CreateDropshipOrderParams {
    banquetId: string;
    returnGiftId: string;
    guestOpenid: string;
    productId: string;
    skuId?: string;
    productName: string;
    productImage?: string;
    supplyCostPrice: number;
    salePrice: number;
    quantity?: number;
    recipientName: string;
    recipientPhone: string;
    recipientProvince: string;
    recipientCity: string;
    recipientDistrict: string;
    recipientAddress: string;
}
export declare class Alibaba1688Service {
    private readonly logger;
    private readonly ALIBABA_API_BASE_URL;
    private readonly ALIBABA_API_VERSION;
    constructor();
    getConfig(): Promise<Alibaba1688Config | null>;
    isDropshipEnabled(): Promise<boolean>;
    saveConfig(configData: Partial<Alibaba1688Config>): Promise<Alibaba1688Config>;
    updateConfig(id: string, configData: Partial<Alibaba1688Config>): Promise<Alibaba1688Config>;
    toggleDropship(enabled: boolean): Promise<void>;
    calculateSalePrice(supplyCostPrice: number, markupRate?: number): number;
    createDropshipOrder(params: CreateDropshipOrderParams): Promise<DropshipOrder>;
    private submitOrderTo1688;
    syncLogistics(orderId: string): Promise<void>;
    syncAllPendingLogistics(): Promise<void>;
    getDropshipOrders(filters?: {
        banquetId?: string;
        status?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        orders: DropshipOrder[];
        total: number;
    }>;
    getDropshipOrderById(orderId: string): Promise<DropshipOrder | null>;
    private logOperation;
    private generateSignature;
    private call1688Api;
    getDropshipStats(banquetId?: string): Promise<{
        totalOrders: number;
        pendingOrders: number;
        shippedOrders: number;
        deliveredOrders: number;
        failedOrders: number;
        totalProfit: number;
    }>;
}
