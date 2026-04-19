"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const globals_1 = require("@jest/globals");
const mall_service_1 = require("./mall.service");
globals_1.jest.mock('@/storage/database/supabase-client', () => ({
    getSupabaseClient: globals_1.jest.fn(),
}));
const mockSupabaseClient = {
    from: globals_1.jest.fn(),
};
(0, globals_1.describe)('MallService', () => {
    let service;
    (0, globals_1.beforeEach)(async () => {
        globals_1.jest.clearAllMocks();
        const { getSupabaseClient } = require('@/storage/database/supabase-client');
        getSupabaseClient.mockReturnValue(mockSupabaseClient);
        const module = await testing_1.Test.createTestingModule({
            providers: [mall_service_1.MallService],
        }).compile();
        service = module.get(mall_service_1.MallService);
    });
    (0, globals_1.describe)('getProducts', () => {
        (0, globals_1.it)('应该成功获取商品列表', async () => {
            const mockProducts = [
                {
                    id: '1',
                    name: '精美茶叶礼盒',
                    price: 9900,
                    original_price: 12900,
                    image: 'https://example.com/tea.jpg',
                    category: '茶叶',
                    stock: 100,
                    sales: 50,
                    status: 'active',
                    created_at: '2024-01-01',
                },
            ];
            const mockQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                gt: globals_1.jest.fn().mockReturnThis(),
                order: globals_1.jest.fn().mockReturnThis(),
                range: globals_1.jest.fn().mockResolvedValue({
                    data: mockProducts,
                    count: 1,
                    error: null,
                }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.getProducts();
            (0, globals_1.expect)(result.products).toEqual(mockProducts);
            (0, globals_1.expect)(result.total).toBe(1);
        });
        (0, globals_1.it)('查询失败时应该返回空列表', async () => {
            const mockQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                gt: globals_1.jest.fn().mockReturnThis(),
                order: globals_1.jest.fn().mockReturnThis(),
                range: globals_1.jest.fn().mockResolvedValue({
                    data: null,
                    count: 0,
                    error: { message: 'Database error' },
                }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.getProducts();
            (0, globals_1.expect)(result.products).toEqual([]);
            (0, globals_1.expect)(result.total).toBe(0);
        });
    });
    (0, globals_1.describe)('getProductById', () => {
        (0, globals_1.it)('应该成功获取商品详情', async () => {
            const mockProduct = {
                id: '1',
                name: '精美茶叶礼盒',
                price: 9900,
                original_price: 12900,
                image: 'https://example.com/tea.jpg',
                category: '茶叶',
                stock: 100,
                sales: 50,
                status: 'active',
                created_at: '2024-01-01',
            };
            const mockQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                single: globals_1.jest.fn().mockResolvedValue({ data: mockProduct, error: null }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.getProductById('1');
            (0, globals_1.expect)(result).toEqual(mockProduct);
        });
        (0, globals_1.it)('商品不存在时应该返回null', async () => {
            const mockQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                single: globals_1.jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Not found' },
                }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.getProductById('non-existent');
            (0, globals_1.expect)(result).toBeNull();
        });
    });
    (0, globals_1.describe)('getHotProducts', () => {
        (0, globals_1.it)('应该成功获取热门商品', async () => {
            const mockProducts = [
                {
                    id: '1',
                    name: '热门商品',
                    price: 9900,
                    original_price: 12900,
                    image: 'https://example.com/hot.jpg',
                    category: '茶叶',
                    stock: 100,
                    sales: 500,
                    status: 'active',
                    created_at: '2024-01-01',
                },
            ];
            const mockQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                gt: globals_1.jest.fn().mockReturnThis(),
                order: globals_1.jest.fn().mockReturnThis(),
                limit: globals_1.jest.fn().mockResolvedValue({ data: mockProducts, error: null }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.getHotProducts(6);
            (0, globals_1.expect)(result).toEqual(mockProducts);
        });
    });
    (0, globals_1.describe)('addToCart', () => {
        (0, globals_1.it)('应该成功添加商品到购物车', async () => {
            const mockProduct = {
                id: '1',
                name: '精美茶叶礼盒',
                price: 9900,
                original_price: 12900,
                image: 'https://example.com/tea.jpg',
                category: '茶叶',
                stock: 100,
                sales: 50,
                status: 'active',
                created_at: '2024-01-01',
            };
            const mockCartItem = {
                id: 'cart-1',
                user_openid: 'user-1',
                product_id: '1',
                quantity: 1,
                created_at: '2024-01-01',
            };
            const mockProductQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                single: globals_1.jest.fn().mockResolvedValue({ data: mockProduct, error: null }),
            };
            const mockExistingQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                single: globals_1.jest.fn().mockResolvedValue({ data: null, error: null }),
            };
            const mockInsertQuery = {
                insert: globals_1.jest.fn().mockReturnThis(),
                select: globals_1.jest.fn().mockReturnThis(),
                single: globals_1.jest.fn().mockResolvedValue({ data: mockCartItem, error: null }),
            };
            mockSupabaseClient.from
                .mockReturnValueOnce(mockProductQuery)
                .mockReturnValueOnce(mockExistingQuery)
                .mockReturnValueOnce(mockInsertQuery);
            const result = await service.addToCart('user-1', '1', 1);
            (0, globals_1.expect)(result).toEqual(mockCartItem);
        });
        (0, globals_1.it)('商品不存在时应该抛出错误', async () => {
            const mockQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                single: globals_1.jest.fn().mockResolvedValue({ data: null, error: null }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            await (0, globals_1.expect)(service.addToCart('user-1', 'non-existent', 1)).rejects.toThrow('商品不存在');
        });
        (0, globals_1.it)('库存不足时应该抛出错误', async () => {
            const mockProduct = {
                id: '1',
                name: '精美茶叶礼盒',
                price: 9900,
                original_price: 12900,
                image: 'https://example.com/tea.jpg',
                category: '茶叶',
                stock: 0,
                sales: 50,
                status: 'active',
                created_at: '2024-01-01',
            };
            const mockQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                single: globals_1.jest.fn().mockResolvedValue({ data: mockProduct, error: null }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            await (0, globals_1.expect)(service.addToCart('user-1', '1', 1)).rejects.toThrow('库存不足');
        });
    });
    (0, globals_1.describe)('getCart', () => {
        (0, globals_1.it)('应该成功获取购物车列表', async () => {
            const mockCartItems = [
                {
                    id: 'cart-1',
                    user_openid: 'user-1',
                    product_id: '1',
                    quantity: 2,
                    created_at: '2024-01-01',
                },
            ];
            const mockQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                order: globals_1.jest.fn().mockResolvedValue({ data: mockCartItems, error: null }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.getCart('user-1');
            (0, globals_1.expect)(result).toEqual(mockCartItems);
        });
        (0, globals_1.it)('查询失败时应该返回空列表', async () => {
            const mockQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                order: globals_1.jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Database error' },
                }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.getCart('user-1');
            (0, globals_1.expect)(result).toEqual([]);
        });
    });
    (0, globals_1.describe)('updateCartQuantity', () => {
        (0, globals_1.it)('数量为0时应该删除购物车项', async () => {
            const mockQuery = {
                delete: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.updateCartQuantity('user-1', 'cart-1', 0);
            (0, globals_1.expect)(result).toBeNull();
        });
        (0, globals_1.it)('应该成功更新购物车数量', async () => {
            const mockCartItem = {
                id: 'cart-1',
                user_openid: 'user-1',
                product_id: '1',
                quantity: 3,
                created_at: '2024-01-01',
            };
            const mockQuery = {
                update: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                select: globals_1.jest.fn().mockReturnThis(),
                single: globals_1.jest.fn().mockResolvedValue({ data: mockCartItem, error: null }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.updateCartQuantity('user-1', 'cart-1', 3);
            (0, globals_1.expect)(result).toEqual(mockCartItem);
        });
    });
    (0, globals_1.describe)('clearCart', () => {
        (0, globals_1.it)('应该成功清空购物车', async () => {
            const mockQuery = {
                delete: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockResolvedValue({ error: null }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.clearCart('user-1');
            (0, globals_1.expect)(result).toBe(true);
        });
        (0, globals_1.it)('清空失败时应该返回false', async () => {
            const mockQuery = {
                delete: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockResolvedValue({
                    error: { message: 'Database error' },
                }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.clearCart('user-1');
            (0, globals_1.expect)(result).toBe(false);
        });
    });
    (0, globals_1.describe)('getCartCount', () => {
        (0, globals_1.it)('应该正确计算购物车商品数量', async () => {
            const mockData = [{ quantity: 2 }, { quantity: 3 }];
            const mockQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockResolvedValue({ data: mockData, error: null }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.getCartCount('user-1');
            (0, globals_1.expect)(result).toBe(5);
        });
        (0, globals_1.it)('查询失败时应该返回0', async () => {
            const mockQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Database error' },
                }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.getCartCount('user-1');
            (0, globals_1.expect)(result).toBe(0);
        });
    });
    (0, globals_1.describe)('getSpecialties', () => {
        (0, globals_1.it)('应该成功获取地方特产', async () => {
            const mockProducts = [
                {
                    id: '1',
                    name: '山西老陈醋',
                    price: 5900,
                    original_price: 7900,
                    image: 'https://example.com/vinegar.jpg',
                    category: '调味品',
                    stock: 100,
                    sales: 200,
                    status: 'active',
                    is_specialty: true,
                    region: '山西',
                    created_at: '2024-01-01',
                },
            ];
            const mockQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                gt: globals_1.jest.fn().mockReturnThis(),
                order: globals_1.jest.fn().mockReturnThis(),
                limit: globals_1.jest.fn().mockResolvedValue({ data: mockProducts, error: null }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.getSpecialties();
            (0, globals_1.expect)(result).toEqual(mockProducts);
        });
    });
    (0, globals_1.describe)('getRecommendedProducts', () => {
        (0, globals_1.it)('应该成功获取推荐商品', async () => {
            const mockProducts = [
                {
                    id: '1',
                    name: '推荐商品',
                    price: 9900,
                    original_price: 12900,
                    image: 'https://example.com/recommended.jpg',
                    category: '茶叶',
                    stock: 100,
                    sales: 300,
                    status: 'active',
                    is_recommended: true,
                    rank_score: 100,
                    created_at: '2024-01-01',
                },
            ];
            const mockQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                gt: globals_1.jest.fn().mockReturnThis(),
                order: globals_1.jest.fn().mockReturnThis(),
                limit: globals_1.jest.fn().mockResolvedValue({ data: mockProducts, error: null }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.getRecommendedProducts(6);
            (0, globals_1.expect)(result).toEqual(mockProducts);
        });
    });
});
//# sourceMappingURL=mall.service.spec.js.map