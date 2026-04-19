"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ShoppingVoucherService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShoppingVoucherService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const supabase_client_1 = require("../../storage/database/supabase-client");
const service_fee_service_1 = require("./service-fee.service");
const supabase = (0, supabase_client_1.getSupabaseClient)();
let ShoppingVoucherService = ShoppingVoucherService_1 = class ShoppingVoucherService {
    constructor(serviceFeeService) {
        this.serviceFeeService = serviceFeeService;
        this.logger = new common_1.Logger(ShoppingVoucherService_1.name);
    }
    async issueVoucherOnBanquetEnd(banquetId) {
        this.logger.log(`宴会结束，开始发放购物券: banquetId=${banquetId}`);
        const { data: banquet, error: banquetError } = await supabase
            .from('banquets')
            .select('id, host_openid, name, voucher_issued')
            .eq('id', banquetId)
            .single();
        if (banquetError || !banquet) {
            this.logger.error(`宴会不存在: ${banquetId}`);
            return null;
        }
        if (banquet.voucher_issued) {
            this.logger.log(`宴会已发放购物券，跳过: banquetId=${banquetId}`);
            return null;
        }
        const statistics = await this.serviceFeeService.calculateBanquetServiceFee(banquetId);
        if (statistics.mall_fee_amount === 0) {
            this.logger.log(`宴会无商城礼品领取，无需发放购物券: banquetId=${banquetId}`);
            await supabase.from('banquets').update({ voucher_issued: true }).eq('id', banquetId);
            return null;
        }
        const voucherCode = this.generateVoucherCode();
        const { data: voucher, error: voucherError } = await supabase
            .from('shopping_vouchers')
            .insert({
            id: `voucher_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            openid: banquet.host_openid,
            banquet_id: banquetId,
            voucher_code: voucherCode,
            amount: statistics.mall_fee_amount,
            balance: statistics.mall_fee_amount,
            source_type: 'promotion',
            source_description: `宴会「${banquet.name}」商城礼品手续费返还，共${statistics.mall_gifts}笔，手续费率0.6%`,
            status: 'active',
        })
            .select()
            .single();
        if (voucherError || !voucher) {
            this.logger.error('创建购物券失败:', voucherError);
            return null;
        }
        await supabase
            .from('service_fee_records')
            .update({
            voucher_returned: true,
            voucher_id: voucher.id,
            updated_at: new Date().toISOString(),
        })
            .eq('banquet_id', banquetId)
            .eq('gift_type', 'mall');
        await supabase
            .from('banquets')
            .update({
            voucher_issued: true,
            voucher_issued_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
            .eq('id', banquetId);
        this.logger.log(`购物券发放成功: openid=${banquet.host_openid}, amount=${statistics.mall_fee_amount}分`);
        return voucher;
    }
    generateVoucherCode() {
        const now = new Date();
        const dateStr = now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0');
        const randomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
        return `SY${dateStr}${randomCode}`;
    }
    async useVoucher(openid, amount, orderId) {
        this.logger.log(`使用购物券: openid=${openid}, amount=${amount}`);
        const { data: vouchers, error } = await supabase
            .from('shopping_vouchers')
            .select('*')
            .eq('openid', openid)
            .eq('status', 'active')
            .gt('balance', 0)
            .or('expired_at.is.null,expired_at.gt.' + new Date().toISOString())
            .order('created_at', { ascending: true });
        if (error || !vouchers || vouchers.length === 0) {
            return { success: false, usedAmount: 0, remainingBalance: 0 };
        }
        let remainingAmount = amount;
        let totalUsed = 0;
        const usageRecords = [];
        for (const voucher of vouchers) {
            if (remainingAmount <= 0)
                break;
            const useAmount = Math.min(voucher.balance, remainingAmount);
            const newBalance = voucher.balance - useAmount;
            const { error: updateError } = await supabase
                .from('shopping_vouchers')
                .update({
                balance: newBalance,
                total_used: voucher.total_used + useAmount,
                last_used_at: new Date().toISOString(),
                status: newBalance === 0 ? 'used_up' : 'active',
                updated_at: new Date().toISOString(),
            })
                .eq('id', voucher.id);
            if (updateError) {
                this.logger.error('更新购物券失败:', updateError);
                continue;
            }
            usageRecords.push({
                id: `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                voucher_id: voucher.id,
                openid: openid,
                amount: useAmount,
                order_id: orderId,
                usage_type: 'mall_purchase',
            });
            totalUsed += useAmount;
            remainingAmount -= useAmount;
        }
        if (usageRecords.length > 0) {
            await supabase.from('voucher_usage_records').insert(usageRecords);
        }
        const { data: remaining } = await supabase
            .from('shopping_vouchers')
            .select('balance')
            .eq('openid', openid)
            .eq('status', 'active')
            .or('expired_at.is.null,expired_at.gt.' + new Date().toISOString());
        const totalBalance = remaining?.reduce((sum, v) => sum + v.balance, 0) || 0;
        return {
            success: totalUsed > 0,
            usedAmount: totalUsed,
            remainingBalance: totalBalance,
        };
    }
    async getUserVoucherBalance(openid) {
        return this.serviceFeeService.getUserVoucherBalance(openid);
    }
    async getUserVouchers(openid) {
        return this.serviceFeeService.getUserVouchers(openid);
    }
    async issueVoucherManually(openid, amount, description) {
        const voucherCode = this.generateVoucherCode();
        const { data: voucher, error } = await supabase
            .from('shopping_vouchers')
            .insert({
            id: `voucher_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            openid: openid,
            voucher_code: voucherCode,
            amount: amount,
            balance: amount,
            source_type: 'manual',
            source_description: description,
            status: 'active',
        })
            .select()
            .single();
        if (error) {
            this.logger.error('手动发放购物券失败:', error);
            return null;
        }
        this.logger.log(`购物券发放成功: openid=${openid}, amount=${amount}分`);
        return voucher;
    }
    async checkAndIssueVouchersForEndedBanquets() {
        this.logger.log('定时任务：检查已结束宴会并发放购物券');
        try {
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const { data: banquets, error } = await supabase
                .from('banquets')
                .select('id, name, event_time, host_openid, voucher_issued')
                .lt('event_time', yesterday.toISOString())
                .eq('voucher_issued', false);
            if (error) {
                this.logger.error('查询已结束宴会失败:', error);
                return;
            }
            if (!banquets || banquets.length === 0) {
                this.logger.log('没有需要处理的宴会');
                return;
            }
            this.logger.log(`发现 ${banquets.length} 个需要发放购物券的宴会`);
            for (const banquet of banquets) {
                try {
                    await this.issueVoucherOnBanquetEnd(banquet.id);
                    this.logger.log(`宴会购物券处理完成: ${banquet.name} (${banquet.id})`);
                }
                catch (err) {
                    this.logger.error(`宴会购物券处理失败: ${banquet.id}`, err);
                }
            }
        }
        catch (error) {
            this.logger.error('定时任务执行失败:', error);
        }
    }
};
exports.ShoppingVoucherService = ShoppingVoucherService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ShoppingVoucherService.prototype, "checkAndIssueVouchersForEndedBanquets", null);
exports.ShoppingVoucherService = ShoppingVoucherService = ShoppingVoucherService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [service_fee_service_1.ServiceFeeService])
], ShoppingVoucherService);
//# sourceMappingURL=shopping-voucher.service.js.map