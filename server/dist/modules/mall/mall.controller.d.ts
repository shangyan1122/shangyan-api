import { MallService } from './mall.service';
export declare class MallController {
    private readonly mallService;
    private readonly logger;
    constructor(mallService: MallService);
    getProducts(category?: string, sceneCategory?: string, priceTier?: string, limit?: string, page?: string, pageSize?: string): Promise<{
        code: number;
        msg: string;
        data: {
            products: any[];
            total: number;
        };
    }>;
    getSpecialties(region?: string): Promise<{
        code: number;
        msg: string;
        data: {
            specialties: import("./mall.service").GiftProduct[];
        };
    }>;
    getHotProducts(limit?: string): Promise<{
        code: number;
        msg: string;
        data: import("./mall.service").GiftProduct[];
    }>;
    getRecommendedProducts(limit?: string): Promise<{
        code: number;
        msg: string;
        data: import("./mall.service").GiftProduct[];
    }>;
    getRankedProducts(limit?: string): Promise<{
        code: number;
        msg: string;
        data: import("./mall.service").GiftProduct[];
    }>;
    getProduct(id: string): Promise<{
        code: number;
        msg: string;
        data: null;
    } | {
        code: number;
        msg: string;
        data: import("./mall.service").GiftProduct;
    }>;
    addToCart(body: {
        openid?: string;
        productId: string;
        quantity?: number;
    }): Promise<{
        code: number;
        msg: string;
        data: {
            id: string;
            quantity: number;
        };
    } | {
        code: number;
        msg: any;
        data: null;
    }>;
    getCart(openid?: string): Promise<{
        code: number;
        msg: string;
        data: {
            items: {
                product: any;
                subtotal: number;
                id: string;
                user_openid: string;
                product_id: string;
                quantity: number;
                created_at: string;
            }[];
            totalAmount: number;
            itemCount: number;
        };
    }>;
    updateCart(body: {
        openid?: string;
        cartItemId: string;
        quantity: number;
    }): Promise<{
        code: number;
        msg: any;
        data: null;
    }>;
    clearCart(body: {
        openid?: string;
    }): Promise<{
        code: number;
        msg: string;
        data: null;
    }>;
    getCartCount(openid?: string): Promise<{
        code: number;
        msg: string;
        data: {
            count: number;
        };
    }>;
    getUserReturnGifts(openid: string): Promise<{
        code: number;
        msg: string;
        data: null;
    } | {
        code: number;
        msg: string;
        data: {
            id: any;
            product_id: any;
            product_name: any;
            product_price: any;
            product_image: any;
            banquet_id: any;
            banquet_name: string;
            created_at: any;
        }[];
    }>;
    exchangeGift(body: {
        openid: string;
        returnGiftIds: string[];
        targetProductId: string;
        diffAmount: number;
    }): Promise<{
        code: number;
        msg: string;
        data: {
            success: boolean;
            exchangeId: any;
            newGiftId: any;
            originalValue: any;
            serviceFee: number;
            actualValue: number;
            diffAmount: number;
        };
    } | {
        code: number;
        msg: any;
        data: null;
    }>;
    getExchangeRecords(openid: string): Promise<{
        code: number;
        msg: string;
        data: null;
    } | {
        code: number;
        msg: string;
        data: any[];
    }>;
}
