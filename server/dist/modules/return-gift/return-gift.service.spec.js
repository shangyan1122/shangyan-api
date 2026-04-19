"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const globals_1 = require("@jest/globals");
const mockFrom = globals_1.jest.fn();
globals_1.jest.mock('@/storage/database/supabase-client', () => ({
    getSupabaseClient: globals_1.jest.fn(() => ({
        from: mockFrom,
    })),
}));
const return_gift_service_1 = require("./return-gift.service");
const wechat_pay_service_1 = require("../wechat-pay/wechat-pay.service");
const mockWechatPayService = {
    transferToBalance: globals_1.jest.fn(),
};
const createMockChain = (result) => {
    const chain = {
        select: globals_1.jest.fn().mockReturnThis(),
        eq: globals_1.jest.fn().mockReturnThis(),
        single: globals_1.jest.fn().mockResolvedValue(result),
        insert: globals_1.jest.fn().mockReturnThis(),
        update: globals_1.jest.fn().mockReturnThis(),
        delete: globals_1.jest.fn().mockReturnThis(),
        order: globals_1.jest.fn().mockReturnThis(),
        limit: globals_1.jest.fn().mockResolvedValue(result),
        range: globals_1.jest.fn().mockResolvedValue(result),
    };
    return chain;
};
const createUpdateChain = () => {
    return {
        update: globals_1.jest.fn().mockReturnThis(),
        eq: globals_1.jest.fn().mockResolvedValue({ error: null }),
    };
};
(0, globals_1.describe)('ReturnGiftService', () => {
    let service;
    (0, globals_1.beforeEach)(async () => {
        globals_1.jest.clearAllMocks();
        mockFrom.mockReset();
        const module = await testing_1.Test.createTestingModule({
            providers: [return_gift_service_1.ReturnGiftService, { provide: wechat_pay_service_1.WechatPayService, useValue: mockWechatPayService }],
        }).compile();
        service = module.get(return_gift_service_1.ReturnGiftService);
    });
    (0, globals_1.describe)('saveReturnGiftSettings', () => {
        (0, globals_1.it)('应该成功创建回礼设置', async () => {
            const settings = {
                red_packet_enabled: true,
                red_packet_amount: 1000,
            };
            const mockSetting = {
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
            mockFrom.mockReturnValueOnce(createMockChain({ data: null, error: null }));
            mockFrom.mockReturnValueOnce(createMockChain({ data: mockSetting, error: null }));
            const result = await service.saveReturnGiftSettings('banquet-1', settings);
            (0, globals_1.expect)(result.red_packet_enabled).toBe(true);
            (0, globals_1.expect)(result.red_packet_amount).toBe(1000);
        });
        (0, globals_1.it)('应该成功更新已有回礼设置', async () => {
            const settings = {
                red_packet_amount: 2000,
            };
            const existingSetting = {
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
            mockFrom.mockReturnValueOnce(createMockChain({ data: existingSetting, error: null }));
            mockFrom.mockReturnValueOnce(createMockChain({ data: updatedSetting, error: null }));
            const result = await service.saveReturnGiftSettings('banquet-1', settings);
            (0, globals_1.expect)(result.red_packet_amount).toBe(2000);
        });
        (0, globals_1.it)('创建失败时应该抛出错误', async () => {
            const settings = {
                red_packet_enabled: true,
            };
            mockFrom.mockReturnValueOnce(createMockChain({ data: null, error: null }));
            mockFrom.mockReturnValueOnce(createMockChain({
                data: null,
                error: { message: 'Database error' },
            }));
            await (0, globals_1.expect)(service.saveReturnGiftSettings('banquet-1', settings)).rejects.toThrow('Database error');
        });
    });
    (0, globals_1.describe)('getReturnGiftSettings', () => {
        (0, globals_1.it)('应该成功获取回礼设置', async () => {
            const mockSetting = {
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
            (0, globals_1.expect)(result?.red_packet_enabled).toBe(true);
        });
        (0, globals_1.it)('回礼设置不存在时应该返回null', async () => {
            mockFrom.mockReturnValueOnce(createMockChain({
                data: null,
                error: { code: 'PGRST116' },
            }));
            mockFrom.mockReturnValueOnce(createMockChain({
                data: { return_gift_config: null },
                error: null,
            }));
            const result = await service.getReturnGiftSettings('banquet-nonexistent');
            (0, globals_1.expect)(result).toBeNull();
        });
    });
    (0, globals_1.describe)('triggerReturnGift', () => {
        (0, globals_1.it)('随礼记录不存在时应该抛出错误', async () => {
            mockFrom.mockReturnValueOnce(createMockChain({
                data: null,
                error: { message: 'Not found' },
            }));
            await (0, globals_1.expect)(service.triggerReturnGift('non-existent')).rejects.toThrow('随礼记录不存在');
        });
    });
    (0, globals_1.describe)('getGuestReturnGift', () => {
        (0, globals_1.it)('应该成功获取嘉宾回礼记录', async () => {
            const mockGiftRecord = {
                id: 'gift-unique-1',
                banquet_id: 'banquet-unique-1',
                guest_openid: 'guest-1',
                amount: 100000,
            };
            const mockReturnGift = {
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
            mockFrom.mockReturnValueOnce(createMockChain({ data: mockGiftRecord, error: null }));
            mockFrom.mockReturnValueOnce(createMockChain({ data: mockReturnGift, error: null }));
            const result = await service.getGuestReturnGift('gift-unique-1');
            (0, globals_1.expect)(result?.id).toBe('return-1');
        });
        (0, globals_1.it)('随礼记录不存在时应该返回null', async () => {
            mockFrom.mockReturnValueOnce(createMockChain({
                data: null,
                error: { message: 'Not found' },
            }));
            const result = await service.getGuestReturnGift('non-existent');
            (0, globals_1.expect)(result).toBeNull();
        });
    });
    (0, globals_1.describe)('claimOnsiteGift', () => {
        (0, globals_1.it)('已领取时应该抛出错误', async () => {
            const mockReturnGift = {
                id: 'return-unique-1',
                onsite_gift_claimed: true,
                banquets: {},
            };
            mockFrom.mockReturnValueOnce(createMockChain({ data: mockReturnGift, error: null }));
            await (0, globals_1.expect)(service.claimOnsiteGift('return-unique-1')).rejects.toThrow('现场礼品已领取');
        });
        (0, globals_1.it)('回礼记录不存在时应该抛出错误', async () => {
            mockFrom.mockReturnValueOnce(createMockChain({
                data: null,
                error: { message: 'Not found' },
            }));
            await (0, globals_1.expect)(service.claimOnsiteGift('non-existent')).rejects.toThrow('回礼记录不存在');
        });
    });
    (0, globals_1.describe)('claimMallGift', () => {
        (0, globals_1.it)('已领取时应该抛出错误', async () => {
            const mockReturnGift = {
                id: 'return-mall-unique-1',
                mall_gift_claimed: true,
                banquets: {},
            };
            mockFrom.mockReturnValueOnce(createMockChain({ data: mockReturnGift, error: null }));
            await (0, globals_1.expect)(service.claimMallGift('return-mall-unique-1', 'delivery')).rejects.toThrow('商城礼品已领取');
        });
        (0, globals_1.it)('回礼记录不存在时应该抛出错误', async () => {
            mockFrom.mockReturnValueOnce(createMockChain({
                data: null,
                error: { message: 'Not found' },
            }));
            await (0, globals_1.expect)(service.claimMallGift('non-existent', 'delivery')).rejects.toThrow('回礼记录不存在');
        });
    });
    (0, globals_1.describe)('exchangeOnsiteGift', () => {
        (0, globals_1.it)('应该成功核销现场礼品', async () => {
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
            mockFrom.mockReturnValueOnce(createMockChain({ data: mockReturnGift, error: null }));
            mockFrom.mockReturnValueOnce(createUpdateChain());
            const result = await service.exchangeOnsiteGift('CODE123');
            (0, globals_1.expect)(result.success).toBe(true);
        });
        (0, globals_1.it)('已核销时应该抛出错误', async () => {
            const mockReturnGift = {
                id: 'return-exchange-2',
                exchange_status: 'exchanged',
            };
            mockFrom.mockReturnValueOnce(createMockChain({ data: mockReturnGift, error: null }));
            await (0, globals_1.expect)(service.exchangeOnsiteGift('CODE123')).rejects.toThrow('礼品已核销');
        });
        (0, globals_1.it)('兑换码无效时应该抛出错误', async () => {
            mockFrom.mockReturnValueOnce(createMockChain({
                data: null,
                error: { message: 'Not found' },
            }));
            await (0, globals_1.expect)(service.exchangeOnsiteGift('NONEXISTENT')).rejects.toThrow('兑换码无效');
        });
        (0, globals_1.it)('兑换码过期时应该抛出错误', async () => {
            const pastDate = new Date(Date.now() - 86400000).toISOString();
            const mockReturnGift = {
                id: 'return-exchange-3',
                banquet_id: 'banquet-1',
                exchange_status: 'pending',
                banquets: { event_time: pastDate },
            };
            mockFrom.mockReturnValueOnce(createMockChain({ data: mockReturnGift, error: null }));
            mockFrom.mockReturnValueOnce(createUpdateChain());
            await (0, globals_1.expect)(service.exchangeOnsiteGift('EXPIRED')).rejects.toThrow('兑换码已过期');
        });
    });
});
//# sourceMappingURL=return-gift.service.spec.js.map