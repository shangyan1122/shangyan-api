"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const globals_1 = require("@jest/globals");
const gift_service_1 = require("./gift.service");
globals_1.jest.mock('@/storage/database/supabase-client', () => ({
    getSupabaseClient: globals_1.jest.fn(),
}));
const mockSupabaseClient = {
    from: globals_1.jest.fn(),
};
(0, globals_1.describe)('GiftService', () => {
    let service;
    (0, globals_1.beforeEach)(async () => {
        globals_1.jest.clearAllMocks();
        const { getSupabaseClient } = require('@/storage/database/supabase-client');
        getSupabaseClient.mockReturnValue(mockSupabaseClient);
        const module = await testing_1.Test.createTestingModule({
            providers: [gift_service_1.GiftService],
        }).compile();
        service = module.get(gift_service_1.GiftService);
    });
    (0, globals_1.describe)('getBanquetInfo', () => {
        (0, globals_1.it)('应该成功获取宴会信息', async () => {
            const mockBanquet = {
                id: 'banquet-1',
                name: '张三的婚宴',
                type: '婚宴',
            };
            const mockQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                single: globals_1.jest.fn().mockResolvedValue({ data: mockBanquet, error: null }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.getBanquetInfo('banquet-1');
            (0, globals_1.expect)(result).toEqual(mockBanquet);
            (0, globals_1.expect)(mockSupabaseClient.from).toHaveBeenCalledWith('banquets');
        });
        (0, globals_1.it)('宴会不存在时应该返回null', async () => {
            const mockQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                single: globals_1.jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Not found' },
                }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.getBanquetInfo('non-existent');
            (0, globals_1.expect)(result).toBeNull();
        });
    });
    (0, globals_1.describe)('checkGuestExists', () => {
        (0, globals_1.it)('嘉宾已随礼时应该返回true', async () => {
            const mockQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                limit: globals_1.jest.fn().mockResolvedValue({
                    data: [{ id: 'record-1' }],
                    error: null,
                }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.checkGuestExists('banquet-1', 'guest-1');
            (0, globals_1.expect)(result).toBe(true);
        });
        (0, globals_1.it)('嘉宾未随礼时应该返回false', async () => {
            const mockQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                limit: globals_1.jest.fn().mockResolvedValue({ data: [], error: null }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.checkGuestExists('banquet-1', 'guest-1');
            (0, globals_1.expect)(result).toBe(false);
        });
    });
    (0, globals_1.describe)('createGiftRecord', () => {
        (0, globals_1.it)('应该成功创建随礼记录', async () => {
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
                insert: globals_1.jest.fn().mockReturnThis(),
                select: globals_1.jest.fn().mockReturnThis(),
                single: globals_1.jest.fn().mockResolvedValue({ data: mockRecord, error: null }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.createGiftRecord(giftData);
            (0, globals_1.expect)(result.id).toBe('gift-1');
            (0, globals_1.expect)(result.guest_name).toBe('李四');
        });
        (0, globals_1.it)('创建失败时应该抛出错误', async () => {
            const mockQuery = {
                insert: globals_1.jest.fn().mockReturnThis(),
                select: globals_1.jest.fn().mockReturnThis(),
                single: globals_1.jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Insert failed' },
                }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            await (0, globals_1.expect)(service.createGiftRecord({ banquet_id: '1', guest_openid: '1' })).rejects.toThrow('Insert failed');
        });
    });
    (0, globals_1.describe)('updatePaymentStatus', () => {
        (0, globals_1.it)('应该成功更新支付状态', async () => {
            const mockRecord = {
                id: 'gift-1',
                payment_status: 'completed',
            };
            const mockQuery = {
                update: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                select: globals_1.jest.fn().mockReturnThis(),
                single: globals_1.jest.fn().mockResolvedValue({ data: mockRecord, error: null }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.updatePaymentStatus('gift-1', 'completed');
            (0, globals_1.expect)(result.payment_status).toBe('completed');
        });
    });
    (0, globals_1.describe)('getGiftRecordByOrderId', () => {
        (0, globals_1.it)('应该成功获取随礼记录', async () => {
            const mockRecord = {
                id: 'gift-1',
                banquet_id: 'banquet-1',
                guest_name: '张三',
                amount: 50000,
            };
            const mockQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                single: globals_1.jest.fn().mockResolvedValue({ data: mockRecord, error: null }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.getGiftRecordByOrderId('gift-1');
            (0, globals_1.expect)(result).toEqual(mockRecord);
        });
        (0, globals_1.it)('记录不存在时应该返回null', async () => {
            const mockQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                single: globals_1.jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Not found' },
                }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.getGiftRecordByOrderId('non-existent');
            (0, globals_1.expect)(result).toBeNull();
        });
    });
    (0, globals_1.describe)('verifyHostPermission', () => {
        (0, globals_1.it)('主办方验证成功时应该返回true', async () => {
            const mockQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                single: globals_1.jest.fn().mockResolvedValue({
                    data: { host_openid: 'host-1' },
                    error: null,
                }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.verifyHostPermission('banquet-1', 'host-1');
            (0, globals_1.expect)(result).toBe(true);
        });
        (0, globals_1.it)('非主办方时应该返回false', async () => {
            const mockQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                single: globals_1.jest.fn().mockResolvedValue({
                    data: { host_openid: 'host-1' },
                    error: null,
                }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.verifyHostPermission('banquet-1', 'other-host');
            (0, globals_1.expect)(result).toBe(false);
        });
    });
    (0, globals_1.describe)('supplementGiftRecord', () => {
        (0, globals_1.it)('应该成功补录随礼记录', async () => {
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
                insert: globals_1.jest.fn().mockReturnThis(),
                select: globals_1.jest.fn().mockReturnThis(),
                single: globals_1.jest.fn().mockResolvedValue({ data: mockRecord, error: null }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.supplementGiftRecord(recordData);
            (0, globals_1.expect)(result.is_supplement).toBe(true);
            (0, globals_1.expect)(result.guest_name).toBe('补录嘉宾');
        });
    });
    (0, globals_1.describe)('batchSupplementGiftRecords', () => {
        (0, globals_1.it)('应该成功批量补录随礼记录', async () => {
            const records = [
                { guestName: '嘉宾1', amount: 10000 },
                { guestName: '嘉宾2', amount: 20000 },
            ];
            const mockInsertedRecords = [
                { id: 'gift-1', guest_name: '嘉宾1', amount: 10000 },
                { id: 'gift-2', guest_name: '嘉宾2', amount: 20000 },
            ];
            const mockQuery = {
                insert: globals_1.jest.fn().mockReturnThis(),
                select: globals_1.jest.fn().mockResolvedValue({
                    data: mockInsertedRecords,
                    error: null,
                }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQuery);
            const result = await service.batchSupplementGiftRecords('banquet-1', records);
            (0, globals_1.expect)(result.success).toBe(2);
            (0, globals_1.expect)(result.failed).toBe(0);
        });
    });
    (0, globals_1.describe)('checkReturnGift', () => {
        (0, globals_1.it)('随礼金额大于回礼总额时应该触发回礼', async () => {
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
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                single: globals_1.jest.fn().mockResolvedValue({ data: mockGiftRecord, error: null }),
            };
            const mockBanquetQuery = {
                select: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockReturnThis(),
                single: globals_1.jest.fn().mockResolvedValue({ data: mockBanquet, error: null }),
            };
            const mockUpdateQuery = {
                update: globals_1.jest.fn().mockReturnThis(),
                eq: globals_1.jest.fn().mockResolvedValue({ error: null }),
            };
            mockSupabaseClient.from
                .mockReturnValueOnce(mockGiftQuery)
                .mockReturnValueOnce(mockBanquetQuery)
                .mockReturnValueOnce(mockUpdateQuery);
            const result = await service.checkReturnGift('gift-1');
            (0, globals_1.expect)(result?.eligible).toBe(true);
        });
    });
});
//# sourceMappingURL=gift.service.spec.js.map