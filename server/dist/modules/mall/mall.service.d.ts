export interface GiftProduct {
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
    region?: string;
    is_specialty?: boolean;
    is_recommended?: boolean;
    rank_score?: number;
    tags?: string[];
    created_at: string;
    updated_at?: string;
}
export interface CartItem {
    id: string;
    user_openid: string;
    product_id: string;
    quantity: number;
    product?: GiftProduct;
    created_at: string;
}
export declare class MallService {
    private readonly logger;
    getProducts(category?: string, page?: number, pageSize?: number, sceneCategory?: string, priceTier?: string, limit?: number): Promise<{
        products: any[];
        total: number;
    }>;
    getProductById(id: string): Promise<GiftProduct | null>;
    getHotProducts(limit?: number): Promise<GiftProduct[]>;
    addToCart(userOpenid: string, productId: string, quantity?: number): Promise<CartItem>;
    getCart(userOpenid: string): Promise<CartItem[]>;
    updateCartQuantity(userOpenid: string, cartItemId: string, quantity: number): Promise<CartItem | null>;
    clearCart(userOpenid: string): Promise<boolean>;
    getCartCount(userOpenid: string): Promise<number>;
    getSpecialties(region?: string): Promise<GiftProduct[]>;
    getRecommendedProducts(limit?: number): Promise<GiftProduct[]>;
    getRankedProducts(limit?: number): Promise<GiftProduct[]>;
    getUserReturnGifts(openid: string): Promise<{
        id: any;
        product_id: any;
        product_name: any;
        product_price: any;
        product_image: any;
        banquet_id: any;
        banquet_name: string;
        created_at: any;
    }[]>;
    exchangeGifts(openid: string, returnGiftIds: string[], targetProductId: string, diffAmount: number): Promise<{
        success: boolean;
        exchangeId: any;
        newGiftId: any;
        originalValue: any;
        serviceFee: number;
        actualValue: number;
        diffAmount: number;
    }>;
    getExchangeRecords(openid: string): Promise<any[]>;
}
