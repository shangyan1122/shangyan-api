"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ServiceFeeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceFeeService = void 0;
const common_1 = require("@nestjs/common");
const supabase_client_1 = require("../../storage/database/supabase-client");
const supabase = (0, supabase_client_1.getSupabaseClient)();
let ServiceFeeService = ServiceFeeService_1 = class ServiceFeeService {
    constructor() {
        this.logger = new common_1.Logger(ServiceFeeService_1.name);
        this.FEE_RATE = 0.006;
    }
    async calculateBanquetServiceFee(banquetId) {
        this.logger.log(`开始统计宴会手续费: banquetId=${banquetId}`);
        const { data: banquet, error: banquetError } = await supabase
            .from('banquets')
            .select('id, service_fee_calculated')
            .eq('id', banquetId)
            .single();
        if (banquetError || !banquet) {
            throw new Error(`宴会不存在: ${banquetId}`);
        }
        if (banquet.service_fee_calculated) {
            this.logger.log(`宴会已统计过手续费，跳过: banquetId=${banquetId}`);
            return this.getExistingStatistics(banquetId);
        }
        const { data: giftRecords, error: giftError } = await supabase
            .from('gift_records')
            .select('id, amount, guest_openid')
            .eq('banquet_id', banquetId)
            .eq('payment_status', 'paid');
        if (giftError) {
            throw new Error(`查询随礼记录失败: ${giftError.message}`);
        }
        if (!giftRecords || giftRecords.length === 0) {
            this.logger.log(`宴会无随礼记录: banquetId=${banquetId}`);
            return {
                banquet_id: banquetId,
                total_gifts: 0,
                mall_gifts: 0,
                onsite_gifts: 0,
                total_gift_amount: 0,
                total_fee_amount: 0,
                mall_fee_amount: 0,
                onsite_fee_amount: 0,
            };
        }
        const giftRecordIds = giftRecords.map((r) => r.id);
        const { data: returnGifts, error: returnError } = await supabase
            .from('guest_return_gifts')
            .select('id, gift_record_id, mall_gift_claimed, onsite_gift_claimed, status')
            .in('gift_record_id', giftRecordIds)
            .eq('status', 'completed');
        if (returnError) {
            throw new Error(`查询回礼领取记录失败: ${returnError.message}`);
        }
        const returnGiftMap = new Map();
        if (returnGifts) {
            for (const rg of returnGifts) {
                returnGiftMap.set(rg.gift_record_id, rg);
            }
        }
        const feeRecords = [];
        let totalGiftAmount = 0;
        let totalFeeAmount = 0;
        let mallFeeAmount = 0;
        let onsiteFeeAmount = 0;
        let mallGiftCount = 0;
        let onsiteGiftCount = 0;
        for (const gift of giftRecords) {
            totalGiftAmount += gift.amount;
            const returnGift = returnGiftMap.get(gift.id);
            let giftType = 'none';
            let guestReturnGiftId;
            let feeAmount = 0;
            if (returnGift) {
                guestReturnGiftId = returnGift.id;
                if (returnGift.mall_gift_claimed) {
                    giftType = 'mall';
                    feeAmount = Math.round(gift.amount * this.FEE_RATE);
                    mallFeeAmount += feeAmount;
                    mallGiftCount++;
                }
                else if (returnGift.onsite_gift_claimed) {
                    giftType = 'onsite';
                    feeAmount = 0;
                    onsiteGiftCount++;
                }
            }
            totalFeeAmount += feeAmount;
            const feeRecord = {
                id: `fee_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                banquet_id: banquetId,
                gift_record_id: gift.id,
                guest_return_gift_id: guestReturnGiftId,
                gift_amount: gift.amount,
                fee_rate: giftType === 'mall' ? this.FEE_RATE : 0,
                fee_amount: feeAmount,
                gift_type: giftType,
                voucher_returned: false,
                created_at: new Date().toISOString(),
            };
            feeRecords.push(feeRecord);
        }
        if (feeRecords.length > 0) {
            const { error: insertError } = await supabase.from('service_fee_records').insert(feeRecords);
            if (insertError) {
                this.logger.error('插入手续费记录失败:', insertError);
                throw new Error(`插入手续费记录失败: ${insertError.message}`);
            }
        }
        const { error: updateError } = await supabase
            .from('banquets')
            .update({
            service_fee_calculated: true,
            service_fee_total: mallFeeAmount,
            updated_at: new Date().toISOString(),
        })
            .eq('id', banquetId);
        if (updateError) {
            this.logger.error('更新宴会统计状态失败:', updateError);
            throw new Error(`更新宴会统计状态失败: ${updateError.message}`);
        }
        const statistics = {
            banquet_id: banquetId,
            total_gifts: giftRecords.length,
            mall_gifts: mallGiftCount,
            onsite_gifts: onsiteGiftCount,
            total_gift_amount: totalGiftAmount,
            total_fee_amount: totalFeeAmount,
            mall_fee_amount: mallFeeAmount,
            onsite_fee_amount: onsiteFeeAmount,
        };
        this.logger.log(`手续费统计完成: ${JSON.stringify(statistics)}`);
        return statistics;
    }
    async getExistingStatistics(banquetId) {
        const { data: feeRecords, error } = await supabase
            .from('service_fee_records')
            .select('*')
            .eq('banquet_id', banquetId);
        if (error || !feeRecords) {
            return {
                banquet_id: banquetId,
                total_gifts: 0,
                mall_gifts: 0,
                onsite_gifts: 0,
                total_gift_amount: 0,
                total_fee_amount: 0,
                mall_fee_amount: 0,
                onsite_fee_amount: 0,
            };
        }
        return {
            banquet_id: banquetId,
            total_gifts: feeRecords.length,
            mall_gifts: feeRecords.filter((r) => r.gift_type === 'mall').length,
            onsite_gifts: feeRecords.filter((r) => r.gift_type === 'onsite').length,
            total_gift_amount: feeRecords.reduce((sum, r) => sum + r.gift_amount, 0),
            total_fee_amount: feeRecords.reduce((sum, r) => sum + r.fee_amount, 0),
            mall_fee_amount: feeRecords
                .filter((r) => r.gift_type === 'mall')
                .reduce((sum, r) => sum + r.fee_amount, 0),
            onsite_fee_amount: feeRecords
                .filter((r) => r.gift_type === 'onsite')
                .reduce((sum, r) => sum + r.fee_amount, 0),
        };
    }
    async getUserVoucherBalance(openid) {
        const { data: vouchers, error } = await supabase
            .from('shopping_vouchers')
            .select('balance')
            .eq('openid', openid)
            .eq('status', 'active')
            .or('expired_at.is.null,expired_at.gt.' + new Date().toISOString());
        if (error || !vouchers) {
            return 0;
        }
        return vouchers.reduce((sum, v) => sum + v.balance, 0);
    }
    async getUserVouchers(openid) {
        const { data: vouchers, error } = await supabase
            .from('shopping_vouchers')
            .select('*')
            .eq('openid', openid)
            .eq('status', 'active')
            .order('created_at', { ascending: false });
        if (error) {
            this.logger.error('获取用户购物券失败:', error);
            return [];
        }
        return vouchers || [];
    }
};
exports.ServiceFeeService = ServiceFeeService;
exports.ServiceFeeService = ServiceFeeService = ServiceFeeService_1 = __decorate([
    (0, common_1.Injectable)()
], ServiceFeeService);
//# sourceMappingURL=service-fee.service.js.map