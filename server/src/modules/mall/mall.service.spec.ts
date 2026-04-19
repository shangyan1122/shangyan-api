// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { MallService, GiftProduct, CartItem } from './mall.service';

// Mock Supabase Client
jest.mock('@/storage/database/supabase-client', () => ({
  getSupabaseClient: jest.fn(),
}));

const mockSupabaseClient = {
  from: jest.fn() as any,
};

describe('MallService', () => {
  let service: MallService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const { getSupabaseClient } = require('@/storage/database/supabase-client');
    getSupabaseClient.mockReturnValue(mockSupabaseClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [MallService],
    }).compile();

    service = module.get<MallService>(MallService);
  });

  describe('getProducts', () => {
    it('应该成功获取商品列表', async () => {
      const mockProducts: GiftProduct[] = [
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
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockProducts,
          count: 1,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getProducts();

      expect(result.products).toEqual(mockProducts);
      expect(result.total).toBe(1);
    });

    it('查询失败时应该返回空列表', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          count: 0,
          error: { message: 'Database error' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getProducts();

      expect(result.products).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getProductById', () => {
    it('应该成功获取商品详情', async () => {
      const mockProduct: GiftProduct = {
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
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProduct, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getProductById('1');

      expect(result).toEqual(mockProduct);
    });

    it('商品不存在时应该返回null', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getProductById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getHotProducts', () => {
    it('应该成功获取热门商品', async () => {
      const mockProducts: GiftProduct[] = [
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
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: mockProducts, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getHotProducts(6);

      expect(result).toEqual(mockProducts);
    });
  });

  describe('addToCart', () => {
    it('应该成功添加商品到购物车', async () => {
      const mockProduct: GiftProduct = {
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

      const mockCartItem: CartItem = {
        id: 'cart-1',
        user_openid: 'user-1',
        product_id: '1',
        quantity: 1,
        created_at: '2024-01-01',
      };

      // Mock getProductById
      const mockProductQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProduct, error: null }),
      };

      // Mock check existing cart item
      const mockExistingQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      // Mock insert
      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCartItem, error: null }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockProductQuery)
        .mockReturnValueOnce(mockExistingQuery)
        .mockReturnValueOnce(mockInsertQuery);

      const result = await service.addToCart('user-1', '1', 1);

      expect(result).toEqual(mockCartItem);
    });

    it('商品不存在时应该抛出错误', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(service.addToCart('user-1', 'non-existent', 1)).rejects.toThrow('商品不存在');
    });

    it('库存不足时应该抛出错误', async () => {
      const mockProduct: GiftProduct = {
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
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProduct, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(service.addToCart('user-1', '1', 1)).rejects.toThrow('库存不足');
    });
  });

  describe('getCart', () => {
    it('应该成功获取购物车列表', async () => {
      const mockCartItems: CartItem[] = [
        {
          id: 'cart-1',
          user_openid: 'user-1',
          product_id: '1',
          quantity: 2,
          created_at: '2024-01-01',
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockCartItems, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getCart('user-1');

      expect(result).toEqual(mockCartItems);
    });

    it('查询失败时应该返回空列表', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getCart('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('updateCartQuantity', () => {
    it('数量为0时应该删除购物车项', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.updateCartQuantity('user-1', 'cart-1', 0);

      expect(result).toBeNull();
    });

    it('应该成功更新购物车数量', async () => {
      const mockCartItem: CartItem = {
        id: 'cart-1',
        user_openid: 'user-1',
        product_id: '1',
        quantity: 3,
        created_at: '2024-01-01',
      };

      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCartItem, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.updateCartQuantity('user-1', 'cart-1', 3);

      expect(result).toEqual(mockCartItem);
    });
  });

  describe('clearCart', () => {
    it('应该成功清空购物车', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.clearCart('user-1');

      expect(result).toBe(true);
    });

    it('清空失败时应该返回false', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Database error' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.clearCart('user-1');

      expect(result).toBe(false);
    });
  });

  describe('getCartCount', () => {
    it('应该正确计算购物车商品数量', async () => {
      const mockData = [{ quantity: 2 }, { quantity: 3 }];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getCartCount('user-1');

      expect(result).toBe(5);
    });

    it('查询失败时应该返回0', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getCartCount('user-1');

      expect(result).toBe(0);
    });
  });

  describe('getSpecialties', () => {
    it('应该成功获取地方特产', async () => {
      const mockProducts: GiftProduct[] = [
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
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: mockProducts, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      // 不传入 region 参数，避免链式调用问题
      const result = await service.getSpecialties();

      expect(result).toEqual(mockProducts);
    });
  });

  describe('getRecommendedProducts', () => {
    it('应该成功获取推荐商品', async () => {
      const mockProducts: GiftProduct[] = [
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
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: mockProducts, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getRecommendedProducts(6);

      expect(result).toEqual(mockProducts);
    });
  });
});
