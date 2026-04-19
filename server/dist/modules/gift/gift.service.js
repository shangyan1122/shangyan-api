"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GiftService = void 0;
const common_1 = require("@nestjs/common");
const supabase_client_1 = require("../../storage/database/supabase-client");
let GiftService = class GiftService {
    async getBanquetInfo(banquetId) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data, error } = await client.from('banquets').select('*').eq('id', banquetId).single();
        if (error) {
            console.error('获取宴会信息失败:', error);
            return null;
        }
        return data;
    }
    async checkGuestExists(banquetId, guestOpenid) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data, error } = await client
            .from('gift_records')
            .select('id')
            .eq('banquet_id', banquetId)
            .eq('guest_openid', guestOpenid)
            .limit(1);
        if (error) {
            console.error('检查嘉宾是否存在失败:', error);
            return false;
        }
        return data && data.length > 0;
    }
    async createGiftRecord(recordData) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data, error } = await client.from('gift_records').insert(recordData).select().single();
        if (error) {
            console.error('创建随礼记录失败:', error);
            throw new Error(error.message);
        }
        return data;
    }
    async updatePaymentStatus(recordId, status) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data, error } = await client
            .from('gift_records')
            .update({ payment_status: status })
            .eq('id', recordId)
            .select()
            .single();
        if (error) {
            console.error('更新支付状态失败:', error);
            throw new Error(error.message);
        }
        return data;
    }
    async getGiftRecordByOrderId(orderId) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data, error } = await client
            .from('gift_records')
            .select('*')
            .eq('id', orderId)
            .single();
        if (error) {
            console.error('获取随礼记录失败:', error);
            return null;
        }
        return data;
    }
    async updateTransferStatus(recordId, status, paymentNo, errorMsg) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const updateData = {
            transfer_status: status,
            updated_at: new Date().toISOString(),
        };
        if (paymentNo) {
            updateData.transfer_payment_no = paymentNo;
        }
        if (errorMsg) {
            updateData.transfer_error_msg = errorMsg;
        }
        const { data, error } = await client
            .from('gift_records')
            .update(updateData)
            .eq('id', recordId)
            .select()
            .single();
        if (error) {
            console.error('更新转账状态失败:', error);
            throw new Error(error.message);
        }
        return data;
    }
    async checkReturnGift(giftRecordId) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data: giftRecord, error: queryError } = await client
            .from('gift_records')
            .select('*')
            .eq('id', giftRecordId)
            .single();
        if (queryError) {
            console.error('查询随礼记录失败:', queryError);
            return null;
        }
        if (!giftRecord) {
            console.error('未找到随礼记录:', giftRecordId);
            return null;
        }
        const { data: banquet, error: banquetError } = await client
            .from('banquets')
            .select('*')
            .eq('id', giftRecord.banquet_id)
            .single();
        if (banquetError || !banquet) {
            console.error('未找到宴会信息:', banquetError);
            return null;
        }
        const giftAmount = giftRecord.amount;
        const returnRedPacket = banquet.return_red_packet || 0;
        console.log(`回礼检查: 随礼金额=${giftAmount}, 回礼红包=${returnRedPacket}`);
        let returnGiftTotalValue = returnRedPacket;
        if (giftAmount > returnGiftTotalValue) {
            await client
                .from('gift_records')
                .update({ return_gift_status: 'eligible' })
                .eq('id', giftRecordId);
            return {
                eligible: true,
                returnRedPacket,
                returnGiftIds: banquet.return_gift_ids,
            };
        }
        return { eligible: false };
    }
    async verifyHostPermission(banquetId, hostOpenid) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data, error } = await client
            .from('banquets')
            .select('host_openid')
            .eq('id', banquetId)
            .single();
        if (error || !data) {
            return false;
        }
        return data.host_openid === hostOpenid;
    }
    async supplementGiftRecord(recordData) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const insertData = {
            banquet_id: recordData.banquet_id,
            guest_openid: recordData.guest_openid,
            guest_name: recordData.guest_name,
            guest_phone: recordData.guest_phone,
            amount: recordData.amount,
            blessing: recordData.blessing,
            payment_status: recordData.payment_status || 'completed',
            is_supplement: true,
            supplement_time: new Date().toISOString(),
            gift_time: recordData.gift_time || new Date().toISOString(),
        };
        const { data, error } = await client.from('gift_records').insert(insertData).select().single();
        if (error) {
            console.error('补录随礼记录失败:', error);
            throw new Error(error.message);
        }
        return data;
    }
    async batchSupplementGiftRecords(banquetId, records) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const insertRecords = records.map((record, index) => ({
            banquet_id: banquetId,
            guest_openid: `supplement_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
            guest_name: record.guestName,
            guest_phone: record.guestPhone,
            amount: record.amount,
            blessing: record.blessing,
            payment_status: 'completed',
            is_supplement: true,
            supplement_time: new Date().toISOString(),
            gift_time: record.giftTime || new Date().toISOString(),
        }));
        const { data, error } = await client.from('gift_records').insert(insertRecords).select();
        if (error) {
            console.error('批量补录失败:', error);
            throw new Error(error.message);
        }
        return {
            success: data?.length || 0,
            failed: records.length - (data?.length || 0),
            records: data,
        };
    }
    async getSupplementRecords(banquetId) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data, error } = await client
            .from('gift_records')
            .select('*')
            .eq('banquet_id', banquetId)
            .eq('is_supplement', true)
            .order('supplement_time', { ascending: false });
        if (error) {
            console.error('获取补录记录失败:', error);
            return [];
        }
        return data || [];
    }
    async deleteSupplementRecord(recordId, hostOpenid) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data: record, error: queryError } = await client
            .from('gift_records')
            .select('*')
            .eq('id', recordId)
            .single();
        if (queryError || !record) {
            throw new Error('记录不存在');
        }
        if (!record.is_supplement) {
            throw new Error('只能删除补录记录');
        }
        const { data: banquet, error: banquetError } = await client
            .from('banquets')
            .select('host_openid')
            .eq('id', record.banquet_id)
            .single();
        if (banquetError || !banquet) {
            throw new Error('宴会不存在');
        }
        if (banquet.host_openid !== hostOpenid) {
            throw new Error('无权限删除');
        }
        const { error: deleteError } = await client.from('gift_records').delete().eq('id', recordId);
        if (deleteError) {
            throw new Error(deleteError.message);
        }
        return { success: true };
    }
};
exports.GiftService = GiftService;
exports.GiftService = GiftService = __decorate([
    (0, common_1.Injectable)()
], GiftService);
//# sourceMappingURL=gift.service.js.map