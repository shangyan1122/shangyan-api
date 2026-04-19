"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const globals_1 = require("@jest/globals");
const banquet_service_1 = require("./banquet.service");
const ai_service_1 = require("../ai/ai.service");
const wechat_config_service_1 = require("../../common/services/wechat-config.service");
globals_1.jest.mock('@/storage/database/supabase-client', () => ({
    getSupabaseClient: globals_1.jest.fn(),
}));
const mockSupabaseClient = {
    from: globals_1.jest.fn(),
};
const mockAiService = {
    generateWelcome: globals_1.jest.fn(),
    generateThanks: globals_1.jest.fn(),
};
const mockWechatConfigService = {
    generateMiniProgramCode: globals_1.jest.fn(),
    isConfigured: globals_1.jest.fn().mockReturnValue(true),
};
(0, globals_1.describe)('BanquetService', () => {
    let service;
    (0, globals_1.beforeEach)(async () => {
        globals_1.jest.clearAllMocks();
        const { getSupabaseClient } = require('@/storage/database/supabase-client');
        getSupabaseClient.mockReturnValue(mockSupabaseClient);
        const module = await testing_1.Test.createTestingModule({
            providers: [
                banquet_service_1.BanquetService,
                { provide: ai_service_1.AiService, useValue: mockAiService },
                { provide: wechat_config_service_1.WechatConfigService, useValue: mockWechatConfigService },
            ],
        }).compile();
        service = module.get(banquet_service_1.BanquetService);
    });
    (0, globals_1.describe)('getBanquets', () => {
        (0, globals_1.it)('应该成功获取用户的宴会列表', async () => {
            const mockBanquets = [
                { id: '1', name: '张三的婚宴', type: '婚宴', status: 'active' },
                { id: '2', name: '李四的寿宴', type: '寿宴', status: 'active' },
            ];
            const mockQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                order: globals_1.jest.fn().mockResolvedValue({ data: mockBanquets, error: null }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.getBanquets('test-openid');
            (0, globals_1.expect)(result).toEqual(mockBanquets);
            (0, globals_1.expect)(mockSupabaseClient.from).toHaveBeenCalledWith('banquets');
            (0, globals_1.expect)(mockQuery.eq).toHaveBeenCalledWith('host_openid', 'test-openid');
        });
        (0, globals_1.it)('应该根据状态筛选宴会列表', async () => {
            const mockBanquets = [{ id: '1', name: '张三的婚宴', type: '婚宴', status: 'active' }];
            const mockQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                order: globals_1.jest.fn().mockResolvedValue({ data: mockBanquets, error: null }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.getBanquets('test-openid', 'active');
            (0, globals_1.expect)(result).toEqual(mockBanquets);
            (0, globals_1.expect)(mockQuery.eq).toHaveBeenCalledWith('host_openid', 'test-openid');
            (0, globals_1.expect)(mockQuery.eq).toHaveBeenCalledWith('status', 'active');
        });
        (0, globals_1.it)('查询失败时应该抛出错误', async () => {
            const mockQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                order: globals_1.jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Database error' },
                }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            await (0, globals_1.expect)(service.getBanquets('test-openid')).rejects.toThrow('Database error');
        });
    });
    (0, globals_1.describe)('getBanquetById', () => {
        (0, globals_1.it)('应该成功获取宴会详情', async () => {
            const mockBanquet = {
                id: '1',
                name: '张三的婚宴',
                type: '婚宴',
                status: 'active',
            };
            const mockQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                single: globals_1.jest.fn().mockResolvedValue({ data: mockBanquet, error: null }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.getBanquetById('1');
            (0, globals_1.expect)(result).toEqual(mockBanquet);
            (0, globals_1.expect)(mockSupabaseClient.from).toHaveBeenCalledWith('banquets');
            (0, globals_1.expect)(mockQuery.eq).toHaveBeenCalledWith('id', '1');
        });
    });
    (0, globals_1.describe)('createBanquet', () => {
        (0, globals_1.it)('应该成功创建宴会并生成AI内容', async () => {
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
            mockAiService.generateWelcome.mockResolvedValue({
                data: { welcome: '欢迎词' },
            });
            mockAiService.generateThanks.mockResolvedValue({
                data: { thanks: '感谢词' },
            });
            const mockInsertQuery = {
                insert: globals_1.jest.fn().mockReturnThis(),
                select: globals_1.jest.fn().mockReturnThis(),
                single: globals_1.jest.fn().mockResolvedValue({ data: mockCreatedBanquet, error: null }),
            };
            mockSupabaseClient.from.mockReturnValue(mockInsertQuery);
            mockWechatConfigService.generateMiniProgramCode.mockResolvedValue({
                base64: 'mock-qrcode-base64',
            });
            const result = await service.createBanquet(banquetData);
            (0, globals_1.expect)(mockAiService.generateWelcome).toHaveBeenCalled();
            (0, globals_1.expect)(mockAiService.generateThanks).toHaveBeenCalled();
            (0, globals_1.expect)(result.id).toBe('new-banquet-id');
        });
        (0, globals_1.it)('AI生成失败时应该使用默认内容', async () => {
            const banquetData = {
                host_openid: 'test-openid',
                type: '婚宴',
                name: '张三的婚宴',
                location: '北京饭店',
            };
            mockAiService.generateWelcome.mockRejectedValue(new Error('AI error'));
            mockAiService.generateThanks.mockRejectedValue(new Error('AI error'));
            const mockCreatedBanquet = {
                id: 'new-banquet-id',
                host_openid: 'test-openid',
                type: '婚宴',
                name: '张三的婚宴',
                location: '北京饭店',
                status: 'active',
                ai_welcome_page: '欢迎莅临张三的婚宴！感谢您在百忙之中抽出宝贵时间参加我们的婚宴，您的到来让这个特殊的日子更加精彩！',
                ai_thank_page: '感谢您参加张三的婚宴！您的祝福和心意让我们倍感温暖，祝您身体健康，万事如意！',
            };
            const mockInsertQuery = {
                insert: globals_1.jest.fn().mockReturnThis(),
                select: globals_1.jest.fn().mockReturnThis(),
                single: globals_1.jest.fn().mockResolvedValue({ data: mockCreatedBanquet, error: null }),
            };
            mockSupabaseClient.from.mockReturnValue(mockInsertQuery);
            mockWechatConfigService.generateMiniProgramCode.mockResolvedValue({
                base64: 'mock-qrcode-base64',
            });
            const result = await service.createBanquet(banquetData);
            (0, globals_1.expect)(result.ai_welcome_page).toContain('欢迎');
            (0, globals_1.expect)(result.ai_thank_page).toContain('感谢');
        });
    });
    (0, globals_1.describe)('updateBanquet', () => {
        (0, globals_1.it)('应该成功更新宴会', async () => {
            const mockQuery = {
                update: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockResolvedValue({ error: null }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            await (0, globals_1.expect)(service.updateBanquet('1', { name: '更新后的宴会' })).resolves.not.toThrow();
            (0, globals_1.expect)(mockSupabaseClient.from).toHaveBeenCalledWith('banquets');
        });
        (0, globals_1.it)('更新失败时应该抛出错误', async () => {
            const mockQuery = {
                update: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockResolvedValue({
                    error: { message: 'Update failed' },
                }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            await (0, globals_1.expect)(service.updateBanquet('1', { name: '更新后的宴会' })).rejects.toThrow('Update failed');
        });
    });
    (0, globals_1.describe)('deleteBanquet', () => {
        (0, globals_1.it)('应该成功删除宴会', async () => {
            const mockQuery = {
                delete: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockResolvedValue({ error: null }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            await (0, globals_1.expect)(service.deleteBanquet('1')).resolves.not.toThrow();
        });
        (0, globals_1.it)('删除失败时应该抛出错误', async () => {
            const mockQuery = {
                delete: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockResolvedValue({
                    error: { message: 'Delete failed' },
                }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            await (0, globals_1.expect)(service.deleteBanquet('1')).rejects.toThrow('Delete failed');
        });
    });
});
//# sourceMappingURL=banquet.service.spec.js.map