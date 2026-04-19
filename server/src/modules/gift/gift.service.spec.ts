// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { GiftService } from './gift.service';

// Mock Supabase Client
jest.mock('@/storage/database/supabase-client', () => ({
  getSupabaseClient: jest.fn(),
}));

const mockSupabaseClient = {
  from: jest.fn() as any,
};

describe('GiftService', () => {
  let service: GiftService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const { getSupabaseClient } = require('@/storage/database/supabase-client');
    getSupabaseClient.mockReturnValue(mockSupabaseClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [GiftService],
    }).compile();

    service = module.get<GiftService>(GiftService);
  });

  describe('getBanquetInfo', () => {
    it('应该成功获取宴会信息', async () => {
      const mockBanquet = {
        id: 'banquet-1',
        name: '张三的婚宴',
        type: '婚宴',
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockBanquet, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getBanquetInfo('banquet-1');

      expect(result).toEqual(mockBanquet);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('banquets');
    });

    it('宴会不存在时应该返回null', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getBanquetInfo('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('checkGuestExists', () => {
    it('嘉宾已随礼时应该返回true', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [{ id: 'record-1' }],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.checkGuestExists('banquet-1', 'guest-1');

      expect(result).toBe(true);
    });

    it('嘉宾未随礼时应该返回false', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.checkGuestExists('banquet-1', 'guest-1');

      expect(result).toBe(false);
    });
  });

  describe('createGiftRecord', () => {
    it('应该成功创建随礼记录', async () => {
      const giftData = {
        banquet_id: 'banquet-1',
        guest_openid: 'guest-1',
        guest_name: '李四',
        amount: 100000,
        blessing: '百年好合',
      };

      const mockRecord = {
        id: 'gift-1',
        ...giftData,
        created_at: '2024-01-01',
      };

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockRecord, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.createGiftRecord(giftData);

      expect(result.id).toBe('gift-1');
      expect(result.guest_name).toBe('李四');
    });

    it('创建失败时应该抛出错误', async () => {
      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Insert failed' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(
        service.createGiftRecord({ banquet_id: '1', guest_openid: '1' })
      ).rejects.toThrow('Insert failed');
    });
  });

  describe('updatePaymentStatus', () => {
    it('应该成功更新支付状态', async () => {
      const mockRecord = {
        id: 'gift-1',
        payment_status: 'completed',
      };

      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockRecord, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.updatePaymentStatus('gift-1', 'completed');

      expect(result.payment_status).toBe('completed');
    });
  });

  describe('getGiftRecordByOrderId', () => {
    it('应该成功获取随礼记录', async () => {
      const mockRecord = {
        id: 'gift-1',
        banquet_id: 'banquet-1',
        guest_name: '张三',
        amount: 50000,
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockRecord, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getGiftRecordByOrderId('gift-1');

      expect(result).toEqual(mockRecord);
    });

    it('记录不存在时应该返回null', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getGiftRecordByOrderId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('verifyHostPermission', () => {
    it('主办方验证成功时应该返回true', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { host_openid: 'host-1' },
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.verifyHostPermission('banquet-1', 'host-1');

      expect(result).toBe(true);
    });

    it('非主办方时应该返回false', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { host_openid: 'host-1' },
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.verifyHostPermission('banquet-1', 'other-host');

      expect(result).toBe(false);
    });
  });

  describe('supplementGiftRecord', () => {
    it('应该成功补录随礼记录', async () => {
      const recordData = {
        banquet_id: 'banquet-1',
        guest_openid: 'supplement-1',
        guest_name: '补录嘉宾',
        amount: 20000,
        blessing: '补录祝福',
      };

      const mockRecord = {
        id: 'gift-1',
        ...recordData,
        is_supplement: true,
        payment_status: 'completed',
      };

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockRecord, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.supplementGiftRecord(recordData);

      expect(result.is_supplement).toBe(true);
      expect(result.guest_name).toBe('补录嘉宾');
    });
  });

  describe('batchSupplementGiftRecords', () => {
    it('应该成功批量补录随礼记录', async () => {
      const records = [
        { guestName: '嘉宾1', amount: 10000 },
        { guestName: '嘉宾2', amount: 20000 },
      ];

      const mockInsertedRecords = [
        { id: 'gift-1', guest_name: '嘉宾1', amount: 10000 },
        { id: 'gift-2', guest_name: '嘉宾2', amount: 20000 },
      ];

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: mockInsertedRecords,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.batchSupplementGiftRecords('banquet-1', records);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
    });
  });

  describe('checkReturnGift', () => {
    it('随礼金额大于回礼总额时应该触发回礼', async () => {
      const mockGiftRecord = {
        id: 'gift-1',
        banquet_id: 'banquet-1',
        amount: 100000,
      };

      const mockBanquet = {
        id: 'banquet-1',
        return_red_packet: 1000,
      };

      const mockGiftQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockGiftRecord, error: null }),
      };

      const mockBanquetQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockBanquet, error: null }),
      };

      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockGiftQuery)
        .mockReturnValueOnce(mockBanquetQuery)
        .mockReturnValueOnce(mockUpdateQuery);

      const result = await service.checkReturnGift('gift-1');

      expect(result?.eligible).toBe(true);
    });
  });
});
