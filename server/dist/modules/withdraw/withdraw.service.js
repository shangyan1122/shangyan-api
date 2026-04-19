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
var WithdrawService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawService = void 0;
const common_1 = require("@nestjs/common");
const supabase_client_1 = require("../../storage/database/supabase-client");
const payment_service_1 = require("../payment/payment.service");
let WithdrawService = WithdrawService_1 = class WithdrawService {
    constructor(paymentService) {
        this.paymentService = paymentService;
        this.logger = new common_1.Logger(WithdrawService_1.name);
    }
    async getWithdrawRecords(openid, page = 1, pageSize = 20) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const { data, count, error } = await client
            .from('withdrawals')
            .select('*', { count: 'exact' })
            .eq('openid', openid)
            .order('created_at', { ascending: false })
            .range(from, to);
        if (error) {
            this.logger.error('获取提现记录失败:', error);
            return { records: [], total: 0 };
        }
        return {
            records: data || [],
            total: count || 0,
        };
    }
    async getAvailableBalance(openid) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data: banquets } = await client.from('banquets').select('id').eq('host_openid', openid);
        if (!banquets || banquets.length === 0) {
            return 0;
        }
        const banquetIds = banquets.map((b) => b.id);
        const { data: giftRecords } = await client
            .from('gift_records')
            .select('amount')
            .in('banquet_id', banquetIds)
            .eq('payment_status', 'paid');
        const totalGiftAmount = giftRecords?.reduce((sum, r) => sum + r.amount, 0) || 0;
        const { data: withdrawals } = await client
            .from('withdrawals')
            .select('amount')
            .eq('openid', openid)
            .eq('status', 'success');
        const totalWithdrawn = withdrawals?.reduce((sum, w) => sum + w.amount, 0) || 0;
        const serviceFeeRate = 0.006;
        const netAmount = Math.floor(totalGiftAmount * (1 - serviceFeeRate));
        const availableBalance = netAmount - totalWithdrawn;
        return Math.max(0, availableBalance);
    }
    async applyWithdraw(openid, amount) {
        this.logger.log(`申请提现: openid=${openid}, 金额=${amount}分`);
        const availableBalance = await this.getAvailableBalance(openid);
        if (availableBalance < amount) {
            return {
                success: false,
                errorMsg: `可提现余额不足，当前可提现: ${(availableBalance / 100).toFixed(2)}元`,
            };
        }
        if (amount < 10000) {
            return {
                success: false,
                errorMsg: '最低提现金额为100元',
            };
        }
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data: withdrawRecord, error } = await client
            .from('withdrawals')
            .insert({
            openid,
            amount,
            status: 'processing',
            created_at: new Date().toISOString(),
        })
            .select()
            .single();
        if (error || !withdrawRecord) {
            this.logger.error('创建提现记录失败:', error);
            return {
                success: false,
                errorMsg: '创建提现记录失败',
            };
        }
        const transferResult = await this.paymentService.transferToHost(openid, amount, '宴礼通-随礼提现');
        if (transferResult.success) {
            await client
                .from('withdrawals')
                .update({
                status: 'success',
                payment_no: transferResult.paymentNo,
                completed_at: new Date().toISOString(),
            })
                .eq('id', withdrawRecord.id);
            this.logger.log(`提现成功: id=${withdrawRecord.id}, paymentNo=${transferResult.paymentNo}`);
            return {
                success: true,
                withdrawId: withdrawRecord.id,
            };
        }
        else {
            await client
                .from('withdrawals')
                .update({
                status: 'failed',
                error_msg: transferResult.errorMsg,
            })
                .eq('id', withdrawRecord.id);
            this.logger.error(`提现失败: id=${withdrawRecord.id}, error=${transferResult.errorMsg}`);
            return {
                success: false,
                errorMsg: transferResult.errorMsg,
            };
        }
    }
    async getWithdrawDetail(withdrawId) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data, error } = await client
            .from('withdrawals')
            .select('*')
            .eq('id', withdrawId)
            .single();
        if (error) {
            this.logger.error('获取提现详情失败:', error);
            return null;
        }
        return data;
    }
};
exports.WithdrawService = WithdrawService;
exports.WithdrawService = WithdrawService = WithdrawService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [payment_service_1.PaymentService])
], WithdrawService);
//# sourceMappingURL=withdraw.service.js.map