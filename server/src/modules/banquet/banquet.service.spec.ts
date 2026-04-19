// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { BanquetService } from './banquet.service';
import { AiService } from '../ai/ai.service';
import { WechatConfigService } from '@/common/services/wechat-config.service';

// Mock Supabase Client
jest.mock('@/storage/database/supabase-client', () => ({
  getSupabaseClient: jest.fn(),
}));

const mockSupabaseClient = {
  from: jest.fn() as any,
};

const mockAiService = {
  generateWelcome: jest.fn() as any,
  generateThanks: jest.fn() as any,
};

const mockWechatConfigService = {
  generateMiniProgramCode: jest.fn() as any,
  isConfigured: jest.fn().mockReturnValue(true) as any,
};

describe('BanquetService', () => {
  let service: BanquetService;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    const { getSupabaseClient } = require('@/storage/database/supabase-client');
    getSupabaseClient.mockReturnValue(mockSupabaseClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BanquetService,
        { provide: AiService, useValue: mockAiService },
        { provide: WechatConfigService, useValue: mockWechatConfigService },
      ],
    }).compile();

    service = module.get<BanquetService>(BanquetService);
  });

  describe('getBanquets', () => {
    it('应该成功获取用户的宴会列表', async () => {
      const mockBanquets = [
        { id: '1', name: '张三的婚宴', type: '婚宴', status: 'active' },
        { id: '2', name: '李四的寿宴', type: '寿宴', status: 'active' },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockBanquets, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getBanquets('test-openid');

      expect(result).toEqual(mockBanquets);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('banquets');
      expect(mockQuery.eq).toHaveBeenCalledWith('host_openid', 'test-openid');
    });

    it('应该根据状态筛选宴会列表', async () => {
      const mockBanquets = [{ id: '1', name: '张三的婚宴', type: '婚宴', status: 'active' }];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockBanquets, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getBanquets('test-openid', 'active');

      expect(result).toEqual(mockBanquets);
      expect(mockQuery.eq).toHaveBeenCalledWith('host_openid', 'test-openid');
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'active');
    });

    it('查询失败时应该抛出错误', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(service.getBanquets('test-openid')).rejects.toThrow('Database error');
    });
  });

  describe('getBanquetById', () => {
    it('应该成功获取宴会详情', async () => {
      const mockBanquet = {
        id: '1',
        name: '张三的婚宴',
        type: '婚宴',
        status: 'active',
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockBanquet, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getBanquetById('1');

      expect(result).toEqual(mockBanquet);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('banquets');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1');
    });
  });

  describe('createBanquet', () => {
    it('应该成功创建宴会并生成AI内容', async () => {
      const banquetData = {
        host_openid: 'test-openid',
        type: '婚宴',
        name: '张三的婚宴',
        location: '北京饭店',
        event_time: '2024-12-01 12:00:00',
      };

      const mockCreatedBanquet = {
        id: 'new-banquet-id',
        ...banquetData,
        status: 'active',
        ai_welcome_page: '欢迎词',
        ai_thank_page: '感谢词',
      };

      // Mock AI 服务
      mockAiService.generateWelcome.mockResolvedValue({
        data: { welcome: '欢迎词' },
      });
      mockAiService.generateThanks.mockResolvedValue({
        data: { thanks: '感谢词' },
      });

      // Mock 数据库插入
      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCreatedBanquet, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockInsertQuery);

      // Mock 二维码生成
      mockWechatConfigService.generateMiniProgramCode.mockResolvedValue({
        base64: 'mock-qrcode-base64',
      });

      const result = await service.createBanquet(banquetData);

      expect(mockAiService.generateWelcome).toHaveBeenCalled();
      expect(mockAiService.generateThanks).toHaveBeenCalled();
      expect(result.id).toBe('new-banquet-id');
    });

    it('AI生成失败时应该使用默认内容', async () => {
      const banquetData = {
        host_openid: 'test-openid',
        type: '婚宴',
        name: '张三的婚宴',
        location: '北京饭店',
      };

      // Mock AI 服务失败
      mockAiService.generateWelcome.mockRejectedValue(new Error('AI error'));
      mockAiService.generateThanks.mockRejectedValue(new Error('AI error'));

      const mockCreatedBanquet = {
        id: 'new-banquet-id',
        host_openid: 'test-openid',
        type: '婚宴',
        name: '张三的婚宴',
        location: '北京饭店',
        status: 'active',
        ai_welcome_page:
          '欢迎莅临张三的婚宴！感谢您在百忙之中抽出宝贵时间参加我们的婚宴，您的到来让这个特殊的日子更加精彩！',
        ai_thank_page:
          '感谢您参加张三的婚宴！您的祝福和心意让我们倍感温暖，祝您身体健康，万事如意！',
      };

      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCreatedBanquet, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockInsertQuery);
      mockWechatConfigService.generateMiniProgramCode.mockResolvedValue({
        base64: 'mock-qrcode-base64',
      });

      const result = await service.createBanquet(banquetData);

      expect(result.ai_welcome_page).toContain('欢迎');
      expect(result.ai_thank_page).toContain('感谢');
    });
  });

  describe('updateBanquet', () => {
    it('应该成功更新宴会', async () => {
      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(service.updateBanquet('1', { name: '更新后的宴会' })).resolves.not.toThrow();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('banquets');
    });

    it('更新失败时应该抛出错误', async () => {
      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Update failed' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(service.updateBanquet('1', { name: '更新后的宴会' })).rejects.toThrow(
        'Update failed'
      );
    });
  });

  describe('deleteBanquet', () => {
    it('应该成功删除宴会', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(service.deleteBanquet('1')).resolves.not.toThrow();
    });

    it('删除失败时应该抛出错误', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Delete failed' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(service.deleteBanquet('1')).rejects.toThrow('Delete failed');
    });
  });
});
