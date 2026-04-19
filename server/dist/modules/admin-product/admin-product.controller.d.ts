import { AdminProductService, CreateProductParams } from './admin-product.service';
export declare class AdminProductController {
    private readonly adminProductService;
    private readonly logger;
    constructor(adminProductService: AdminProductService);
    getProducts(category?: string, status?: string, source?: string, gift_type?: string, keyword?: string, page?: string, pageSize?: string): Promise<{
        code: number;
        msg: string;
        data: import("./admin-product.service").AdminGiftProduct[];
        total: number;
    } | {
        code: number;
        msg: string;
        data: never[];
        total?: undefined;
    }>;
    getProductStats(): Promise<{
        code: number;
        msg: string;
        data: {
            total: number;
            active: number;
            inactive: number;
            from1688: number;
            manual: number;
        };
    } | {
        code: number;
        msg: string;
        data: null;
    }>;
    getCategories(): Promise<{
        code: number;
        msg: string;
        data: {
            name: string;
            count: number;
        }[];
    }>;
    search1688Products(keyword: string, page?: string, pageSize?: string): Promise<{
        code: number;
        msg: string;
        data: import("./admin-product.service").Alibaba1688Product[];
        total: number;
    } | {
        code: number;
        msg: string;
        data: never[];
        total?: undefined;
    }>;
    getProductById(id: string): Promise<{
        code: number;
        msg: string;
        data: null;
    } | {
        code: number;
        msg: string;
        data: import("./admin-product.service").AdminGiftProduct;
    }>;
    createProduct(body: CreateProductParams): Promise<{
        code: number;
        msg: string;
        data: import("./admin-product.service").AdminGiftProduct;
    } | {
        code: number;
        msg: string;
        data: null;
    }>;
    importFrom1688(body: {
        productId: string;
        category: string;
        stock?: number;
        markupRate?: number;
    }): Promise<{
        code: number;
        msg: string;
        data: import("./admin-product.service").AdminGiftProduct;
    } | {
        code: number;
        msg: any;
        data: null;
    }>;
    batchImportFrom1688(body: {
        items: {
            productId: string;
            category: string;
            stock?: number;
            markupRate?: number;
        }[];
    }): Promise<{
        code: number;
        msg: string;
        data: import("./admin-product.service").AdminGiftProduct[];
    } | {
        code: number;
        msg: string;
        data: null;
    }>;
    updateProduct(id: string, body: Partial<CreateProductParams>): Promise<{
        code: number;
        msg: string;
        data: import("./admin-product.service").AdminGiftProduct;
    } | {
        code: number;
        msg: string;
        data: null;
    }>;
    toggleProductStatus(id: string): Promise<{
        code: number;
        msg: string;
        data: import("./admin-product.service").AdminGiftProduct;
    } | {
        code: number;
        msg: string;
        data: null;
    }>;
    updateProductPrice(id: string, body: {
        price: number;
        originalPrice?: number;
        exchangeServiceFeeRate?: number;
        reason?: string;
    }): Promise<{
        code: number;
        msg: string;
        data: import("./admin-product.service").AdminGiftProduct;
    } | {
        code: number;
        msg: any;
        data: null;
    }>;
    deleteProduct(id: string): Promise<{
        code: number;
        msg: string;
    }>;
}
