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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MerchantController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantController = void 0;
const common_1 = require("@nestjs/common");
const supabase_client_1 = require("../../storage/database/supabase-client");
const auth_guard_1 = require("../../common/guards/auth.guard");
let MerchantController = MerchantController_1 = class MerchantController {
    constructor() {
        this.logger = new common_1.Logger(MerchantController_1.name);
    }
    async getAccount(req) {
        const openid = req.user?.openid || req.query.openid || 'test_openid';
        this.logger.log(`获取主办方账户信息: openid=${openid}`);
        try {
            const client = (0, supabase_client_1.getSupabaseClient)();
            const { data: user, error: userError } = await client
                .from('users')
                .select('*')
                .eq('openid', openid)
                .single();
            if (userError && userError.code !== 'PGRST116') {
                this.logger.error(`获取用户信息失败: ${userError.message}`);
                return { code: 500, msg: '获取账户信息失败', data: null };
            }
            const { data: balance, error: balanceError } = await client
                .from('host_balances')
                .select('*')
                .eq('openid', openid)
                .single();
            let balanceData = balance;
            if (balanceError && balanceError.code === 'PGRST116') {
                const { data: newBalance } = await client
                    .from('host_balances')
                    .insert({
                    openid,
                    balance: 0,
                    frozen_balance: 0,
                    total_recharged: 0,
                    total_spent: 0,
                })
                    .select()
                    .single();
                balanceData = newBalance;
            }
            return {
                code: 200,
                msg: 'success',
                data: {
                    openid,
                    nickname: user?.nickname || '',
                    avatar_url: user?.avatar_url || '',
                    balance: balanceData?.balance || 0,
                    frozen_balance: balanceData?.frozen_balance || 0,
                    total_recharged: balanceData?.total_recharged || 0,
                    total_spent: balanceData?.total_spent || 0,
                    payment_mode: 'personal_direct',
                    status: 'active',
                },
            };
        }
        catch (error) {
            this.logger.error(`获取账户信息异常: ${error.message}`);
            return { code: 500, msg: '获取账户信息失败', data: null };
        }
    }
    async recharge(body, req) {
        const openid = req.user?.openid || req.body.openid || 'test_openid';
        const { amount, paymentMethod } = body;
        this.logger.log(`主办方充值: openid=${openid}, amount=${amount}分`);
        if (!amount || amount < 100) {
            return { code: 400, msg: '充值金额最低1元', data: null };
        }
        if (amount > 10000000) {
            return { code: 400, msg: '单次充值最高10万元', data: null };
        }
        try {
            const client = (0, supabase_client_1.getSupabaseClient)();
            const rechargeOrderId = `RCH${Date.now()}${Math.random().toString(36).substr(2, 6)}`;
            const { error: orderError } = await client.from('recharge_orders').insert({
                id: rechargeOrderId,
                openid,
                amount,
                status: 'pending',
                payment_method: paymentMethod || 'wechat',
                created_at: new Date().toISOString(),
            });
            if (orderError) {
                this.logger.error('创建充值订单失败:', orderError);
                return { code: 500, msg: '创建充值订单失败', data: null };
            }
            return {
                code: 200,
                msg: 'success',
                data: {
                    orderId: rechargeOrderId,
                    amount,
                    isMock: true,
                    timeStamp: Math.floor(Date.now() / 1000).toString(),
                    nonceStr: Math.random().toString(36).substr(2, 32),
                    package: `prepay_id=mock_recharge_${rechargeOrderId}`,
                    signType: 'MD5',
                    paySign: 'mock_sign_' + Math.random().toString(36).substr(2, 16),
                },
            };
        }
        catch (error) {
            this.logger.error(`充值失败: ${error.message}`);
            return { code: 500, msg: '充值失败', data: null };
        }
    }
    async rechargeCallback(body) {
        const { orderId } = body;
        this.logger.log(`充值成功回调: orderId=${orderId}`);
        if (!orderId) {
            return { code: 'FAIL', message: '订单号为空' };
        }
        try {
            const client = (0, supabase_client_1.getSupabaseClient)();
            const { data: rechargeOrder, error: orderError } = await client
                .from('recharge_orders')
                .select('*')
                .eq('id', orderId)
                .single();
            if (orderError || !rechargeOrder) {
                return { code: 'FAIL', message: '订单不存在' };
            }
            if (rechargeOrder.status === 'completed') {
                return { code: 'SUCCESS', message: '已处理' };
            }
            await client
                .from('recharge_orders')
                .update({
                status: 'completed',
                paid_at: new Date().toISOString(),
            })
                .eq('id', orderId);
            const { data: balance } = await client
                .from('host_balances')
                .select('*')
                .eq('openid', rechargeOrder.openid)
                .single();
            if (balance) {
                await client
                    .from('host_balances')
                    .update({
                    balance: balance.balance + rechargeOrder.amount,
                    total_recharged: balance.total_recharged + rechargeOrder.amount,
                    updated_at: new Date().toISOString(),
                })
                    .eq('openid', rechargeOrder.openid);
            }
            else {
                await client.from('host_balances').insert({
                    openid: rechargeOrder.openid,
                    balance: rechargeOrder.amount,
                    frozen_balance: 0,
                    total_recharged: rechargeOrder.amount,
                    total_spent: 0,
                });
            }
            await client.from('balance_logs').insert({
                openid: rechargeOrder.openid,
                type: 'recharge',
                amount: rechargeOrder.amount,
                balance_after: (balance?.balance || 0) + rechargeOrder.amount,
                description: '充值余额',
                order_id: orderId,
            });
            this.logger.log(`充值成功: openid=${rechargeOrder.openid}, amount=${rechargeOrder.amount}`);
            return { code: 'SUCCESS', message: '成功' };
        }
        catch (error) {
            this.logger.error(`充值回调处理失败: ${error.message}`);
            return { code: 'FAIL', message: '处理失败' };
        }
    }
    async getRechargeRecords(queryOpenid, req) {
        const openid = queryOpenid || req.user?.openid || 'test_openid';
        const limit = parseInt(req.query.limit) || 20;
        try {
            const client = (0, supabase_client_1.getSupabaseClient)();
            const { data, error } = await client
                .from('recharge_orders')
                .select('*')
                .eq('openid', openid)
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) {
                this.logger.error('查询充值记录失败:', error);
                return { code: 500, msg: '查询失败', data: null };
            }
            return {
                code: 200,
                msg: 'success',
                data: data || [],
            };
        }
        catch (error) {
            this.logger.error(`查询充值记录异常: ${error.message}`);
            return { code: 500, msg: '查询失败', data: null };
        }
    }
    async getBalanceLogs(queryOpenid, req) {
        const openid = queryOpenid || req.user?.openid || 'test_openid';
        const limit = parseInt(req.query.limit) || 50;
        try {
            const client = (0, supabase_client_1.getSupabaseClient)();
            const { data, error } = await client
                .from('balance_logs')
                .select('*')
                .eq('openid', openid)
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) {
                this.logger.error('查询余额记录失败:', error);
                return { code: 500, msg: '查询失败', data: null };
            }
            return {
                code: 200,
                msg: 'success',
                data: data || [],
            };
        }
        catch (error) {
            this.logger.error(`查询余额记录异常: ${error.message}`);
            return { code: 500, msg: '查询失败', data: null };
        }
    }
};
exports.MerchantController = MerchantController;
__decorate([
    (0, common_1.Get)('account'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MerchantController.prototype, "getAccount", null);
__decorate([
    (0, common_1.Post)('recharge'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MerchantController.prototype, "recharge", null);
__decorate([
    (0, common_1.Post)('recharge/callback'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MerchantController.prototype, "rechargeCallback", null);
__decorate([
    (0, common_1.Get)('recharge/records'),
    __param(0, (0, common_1.Query)('openid')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MerchantController.prototype, "getRechargeRecords", null);
__decorate([
    (0, common_1.Get)('balance/logs'),
    __param(0, (0, common_1.Query)('openid')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MerchantController.prototype, "getBalanceLogs", null);
exports.MerchantController = MerchantController = MerchantController_1 = __decorate([
    (0, common_1.Controller)('merchant'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard)
], MerchantController);
//# sourceMappingURL=merchant.controller.js.map