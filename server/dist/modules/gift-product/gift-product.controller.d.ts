export declare class GiftProductController {
    private readonly logger;
    getProducts(category?: string): Promise<{
        code: number;
        msg: string;
        data: any[];
    }>;
    getCategories(): Promise<{
        code: number;
        msg: string;
        data: {
            name: string;
            count: number;
        }[];
    }>;
    getProductById(id: string): Promise<{
        code: number;
        msg: string;
        data: any;
    }>;
}
