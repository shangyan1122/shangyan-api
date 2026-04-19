// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock Supabase Client
const mockFrom = jest.fn();

jest.mock('@/storage/database/supabase-client', () => ({
  getSupabaseClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

import { ReturnGiftService, ReturnGiftSetting, GuestReturnGift } from './return-gift.service';
import { WechatPayService } from '../wechat-pay/wechat-pay.service';

const mockWechatPayService = {
  transferToBalance: jest.fn() as any,
};

// 辅助函数：创建链式 mock
const createMockChain = (result: any) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
    range: jest.fn().mockResolvedValue(result),
  };
  return chain;
};

// 辅助函数：创建 update mock chain
const createUpdateChain = () => {
  return {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ error: null }),
  };
};

describe('ReturnGiftService', () => {
  let service: ReturnGiftService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockFrom.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReturnGiftService, { provide: WechatPayService, useValue: mockWechatPayService }],
    }).compile();

    service = module.get<ReturnGiftService>(ReturnGiftService);
  });

  describe('saveReturnGiftSettings', () => {
    it('应该成功创建回礼设置', async () => {
      const settings = {
        red_packet_enabled: true,
        red_packet_amount: 1000,
      };

      const mockSetting: ReturnGiftSetting = {
        id: 'setting-1',
        banquet_id: 'banquet-1',
        red_packet_enabled: true,
        red_packet_amount: 1000,
        mall_gift_enabled: false,
        mall_gift_items: [],
        onsite_gift_enabled: false,
        onsite_gift_items: [],
        gift_claim_mode: 'all',
        total_budget: 0,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      // Mock 检查是否已存在 -> 不存在
      mockFrom.mockReturnValueOnce(createMockChain({ data: null, error: null }));
      // Mock 创建
      mockFrom.mockReturnValueOnce(createMockChain({ data: mockSetting, error: null }));

      const result = await service.saveReturnGiftSettings('banquet-1', settings);

      expect(result.red_packet_enabled).toBe(true);
      expect(result.red_packet_amount).toBe(1000);
    });

    it('应该成功更新已有回礼设置', async () => {
      const settings = {
        red_packet_amount: 2000,
      };

      const existingSetting: ReturnGiftSetting = {
        id: 'setting-1',
        banquet_id: 'banquet-1',
        red_packet_enabled: true,
        red_packet_amount: 1000,
        mall_gift_enabled: false,
        mall_gift_items: [],
        onsite_gift_enabled: false,
        onsite_gift_items: [],
        gift_claim_mode: 'all',
        total_budget: 0,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const updatedSetting = { ...existingSetting, red_packet_amount: 2000 };

      // Mock 检查是否已存在 -> 存在
      mockFrom.mockReturnValueOnce(createMockChain({ data: existingSetting, error: null }));
      // Mock 更新
      mockFrom.mockReturnValueOnce(createMockChain({ data: updatedSetting, error: null }));

      const result = await service.saveReturnGiftSettings('banquet-1', settings);

      expect(result.red_packet_amount).toBe(2000);
    });

    it('创建失败时应该抛出错误', async () => {
      const settings = {
        red_packet_enabled: true,
      };

      // Mock 检查存在失败
      mockFrom.mockReturnValueOnce(createMockChain({ data: null, error: null }));
      // Mock 创建失败
      mockFrom.mockReturnValueOnce(
        createMockChain({
          data: null,
          error: { message: 'Database error' },
        })
      );

      await expect(service.saveReturnGiftSettings('banquet-1', settings)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('getReturnGiftSettings', () => {
    it('应该成功获取回礼设置', async () => {
      const mockSetting: ReturnGiftSetting = {
        id: 'setting-1',
        banquet_id: 'banquet-unique-1',
        red_packet_enabled: true,
        red_packet_amount: 1000,
        mall_gift_enabled: false,
        mall_gift_items: [],
        onsite_gift_enabled: false,
        onsite_gift_items: [],
        gift_claim_mode: 'all',
        total_budget: 0,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      mockFrom.mockReturnValueOnce(createMockChain({ data: mockSetting, error: null }));

      const result = await service.getReturnGiftSettings('banquet-unique-1');

      expect(result?.red_packet_enabled).toBe(true);
    });

    it('回礼设置不存在时应该返回null', async () => {
      // Mock 从 return_gift_settings 表查询失败
      mockFrom.mockReturnValueOnce(
        createMockChain({
          data: null,
          error: { code: 'PGRST116' },
        })
      );
      // Mock 从 banquets 表查询 return_gift_config
      mockFrom.mockReturnValueOnce(
        createMockChain({
          data: { return_gift_config: null },
          error: null,
        })
      );

      const result = await service.getReturnGiftSettings('banquet-nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('triggerReturnGift', () => {
    it('随礼记录不存在时应该抛出错误', async () => {
      mockFrom.mockReturnValueOnce(
        createMockChain({
          data: null,
          error: { message: 'Not found' },
        })
      );

      await expect(service.triggerReturnGift('non-existent')).rejects.toThrow('随礼记录不存在');
    });
  });

  describe('getGuestReturnGift', () => {
    it('应该成功获取嘉宾回礼记录', async () => {
      const mockGiftRecord = {
        id: 'gift-unique-1',
        banquet_id: 'banquet-unique-1',
        guest_openid: 'guest-1',
        amount: 100000,
      };

      const mockReturnGift: GuestReturnGift = {
        id: 'return-1',
        gift_record_id: 'gift-unique-1',
        banquet_id: 'banquet-unique-1',
        guest_openid: 'guest-1',
        red_packet_amount: 1000,
        red_packet_status: 'sent',
        mall_gift_claimed: false,
        onsite_gift_claimed: false,
        status: 'pending',
        created_at: '2024-01-01',
      };

      // Mock 1: 获取随礼记录
      mockFrom.mockReturnValueOnce(createMockChain({ data: mockGiftRecord, error: null }));

      // Mock 2: 获取回礼记录
      mockFrom.mockReturnValueOnce(createMockChain({ data: mockReturnGift, error: null }));

      const result = await service.getGuestReturnGift('gift-unique-1');

      expect(result?.id).toBe('return-1');
    });

    it('随礼记录不存在时应该返回null', async () => {
      mockFrom.mockReturnValueOnce(
        createMockChain({
          data: null,
          error: { message: 'Not found' },
        })
      );

      const result = await service.getGuestReturnGift('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('claimOnsiteGift', () => {
    it('已领取时应该抛出错误', async () => {
      const mockReturnGift = {
        id: 'return-unique-1',
        onsite_gift_claimed: true,
        banquets: {},
      };

      mockFrom.mockReturnValueOnce(createMockChain({ data: mockReturnGift, error: null }));

      await expect(service.claimOnsiteGift('return-unique-1')).rejects.toThrow('现场礼品已领取');
    });

    it('回礼记录不存在时应该抛出错误', async () => {
      mockFrom.mockReturnValueOnce(
        createMockChain({
          data: null,
          error: { message: 'Not found' },
        })
      );

      await expect(service.claimOnsiteGift('non-existent')).rejects.toThrow('回礼记录不存在');
    });
  });

  describe('claimMallGift', () => {
    it('已领取时应该抛出错误', async () => {
      const mockReturnGift = {
        id: 'return-mall-unique-1',
        mall_gift_claimed: true,
        banquets: {},
      };

      mockFrom.mockReturnValueOnce(createMockChain({ data: mockReturnGift, error: null }));

      await expect(service.claimMallGift('return-mall-unique-1', 'delivery')).rejects.toThrow(
        '商城礼品已领取'
      );
    });

    it('回礼记录不存在时应该抛出错误', async () => {
      mockFrom.mockReturnValueOnce(
        createMockChain({
          data: null,
          error: { message: 'Not found' },
        })
      );

      await expect(service.claimMallGift('non-existent', 'delivery')).rejects.toThrow(
        '回礼记录不存在'
      );
    });
  });

  describe('exchangeOnsiteGift', () => {
    it('应该成功核销现场礼品', async () => {
      const today = new Date().toISOString();
      const mockReturnGift = {
        id: 'return-exchange-1',
        banquet_id: 'banquet-1',
        exchange_status: 'pending',
        onsite_gift_name: '茶叶礼盒',
        onsite_gift_image: 'https://example.com/tea.jpg',
        onsite_gift_price: 10000,
        banquets: { event_time: today },
      };

      // Mock 1: 查找回礼记录
      mockFrom.mockReturnValueOnce(createMockChain({ data: mockReturnGift, error: null }));

      // Mock 2: 更新状态
      mockFrom.mockReturnValueOnce(createUpdateChain());

      const result = await service.exchangeOnsiteGift('CODE123');

      expect(result.success).toBe(true);
    });

    it('已核销时应该抛出错误', async () => {
      const mockReturnGift = {
        id: 'return-exchange-2',
        exchange_status: 'exchanged',
      };

      mockFrom.mockReturnValueOnce(createMockChain({ data: mockReturnGift, error: null }));

      await expect(service.exchangeOnsiteGift('CODE123')).rejects.toThrow('礼品已核销');
    });

    it('兑换码无效时应该抛出错误', async () => {
      mockFrom.mockReturnValueOnce(
        createMockChain({
          data: null,
          error: { message: 'Not found' },
        })
      );

      await expect(service.exchangeOnsiteGift('NONEXISTENT')).rejects.toThrow('兑换码无效');
    });

    it('兑换码过期时应该抛出错误', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // 昨天
      const mockReturnGift = {
        id: 'return-exchange-3',
        banquet_id: 'banquet-1',
        exchange_status: 'pending',
        banquets: { event_time: pastDate },
      };

      // Mock 1: 查找回礼记录
      mockFrom.mockReturnValueOnce(createMockChain({ data: mockReturnGift, error: null }));

      // Mock 2: 更新状态（过期也要更新）
      mockFrom.mockReturnValueOnce(createUpdateChain());

      await expect(service.exchangeOnsiteGift('EXPIRED')).rejects.toThrow('兑换码已过期');
    });
  });
});
