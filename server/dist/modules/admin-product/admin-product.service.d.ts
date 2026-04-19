export interface AdminGiftProduct {
    id: string;
    name: string;
    description?: string;
    price: number;
    original_price: number;
    image: string;
    images?: string[];
    category: string;
    stock: number;
    sales: number;
    status: 'active' | 'inactive';
    gift_type: 'onsite' | 'delivery';
    alibaba_1688_product_id?: string;
    alibaba_1688_sku_id?: string;
    alibaba_1688_url?: string;
    supply_cost_price: number;
    alibaba_1688_sync_status: 'none' | 'pending' | 'synced' | 'failed';
    alibaba_1688_synced_at?: string;
    source: 'manual' | 'alibaba_1688';
    created_at: string;
    updated_at?: string;
}
export interface Alibaba1688Product {
    productId: string;
    name: string;
    image: string;
    images: string[];
    price: number;
    priceRange?: {
        min: number;
        max: number;
    };
    skuList?: {
        skuId: string;
        name: string;
        price: number;
    }[];
    category?: string;
    description?: string;
    url: string;
    shopName?: string;
    minOrderQuantity?: number;
}
export interface CreateProductParams {
    name: string;
    description?: string;
    price: number;
    original_price: number;
    image: string;
    images?: string[];
    category: string;
    stock: number;
    gift_type?: 'onsite' | 'delivery';
    alibaba_1688_product_id?: string;
    alibaba_1688_sku_id?: string;
    alibaba_1688_url?: string;
    supply_cost_price?: number;
    source?: 'manual' | 'alibaba_1688';
}
export declare class AdminProductService {
    private readonly logger;
    private readonly DEFAULT_MARKUP_RATE;
    getProducts(params?: {
        category?: string;
        status?: string;
        source?: string;
        gift_type?: string;
        keyword?: string;
        page?: number;
        pageSize?: number;
    }): Promise<{
        products: AdminGiftProduct[];
        total: number;
    }>;
    getProductById(id: string): Promise<AdminGiftProduct | null>;
    createProduct(params: CreateProductParams): Promise<AdminGiftProduct>;
    updateProduct(id: string, params: Partial<CreateProductParams>): Promise<AdminGiftProduct>;
    deleteProduct(id: string): Promise<void>;
    toggleProductStatus(id: string): Promise<AdminGiftProduct>;
    updateProductPrice(id: string, params: {
        price: number;
        originalPrice?: number;
        exchangeServiceFeeRate?: number;
        reason?: string;
    }): Promise<AdminGiftProduct>;
    search1688Products(keyword: string, page?: number, pageSize?: number): Promise<{
        products: Alibaba1688Product[];
        total: number;
    }>;
    importFrom1688(params: {
        productId: string;
        category: string;
        stock?: number;
        markupRate?: number;
    }): Promise<AdminGiftProduct>;
    batchImportFrom1688(items: {
        productId: string;
        category: string;
        stock?: number;
        markupRate?: number;
    }[]): Promise<{
        success: number;
        failed: number;
        products: AdminGiftProduct[];
    }>;
    getProductStats(): Promise<{
        total: number;
        active: number;
        inactive: number;
        from1688: number;
        manual: number;
    }>;
    getCategories(): Promise<{
        name: string;
        count: number;
    }[]>;
}
