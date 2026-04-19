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
var ProfitSharingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfitSharingService = void 0;
const common_1 = require("@nestjs/common");
const wechat_pay_config_1 = require("../wechat-pay/wechat-pay.config");
const supabase_client_1 = require("../../storage/database/supabase-client");
const supabase = (0, supabase_client_1.getSupabaseClient)();
const PROFIT_SHARING_CONFIG = {
    HOST_RATIO: 0.994,
    PLATFORM_FEE_RATIO: 0.006,
    WECHAT_FEE_RATIO: 0.0054,
    PLATFORM_PROFIT_RATIO: 0.0006,
    RELATION_TYPE: 'USER',
    DESCRIPTION: '宴会随礼分账',
};
let ProfitSharingService = ProfitSharingService_1 = class ProfitSharingService {
    constructor() {
        this.logger = new common_1.Logger(ProfitSharingService_1.name);
        this.initPaymentService();
    }
    initPaymentService() {
        try {
            const WechatPay = require('wechatpay-node-v3');
            if (!wechat_pay_config_1.wechatPayConfig.appId ||
                !wechat_pay_config_1.wechatPayConfig.mchId ||
                wechat_pay_config_1.wechatPayConfig.appId === 'wx_app_id' ||
                wechat_pay_config_1.wechatPayConfig.mchId === 'merchant_id') {
                this.logger.warn('微信支付配置不完整，使用模拟分账模式');
                this.paymentService = null;
                return;
            }
            this.paymentService = new WechatPay({
                appid: wechat_pay_config_1.wechatPayConfig.appId,
                mchid: wechat_pay_config_1.wechatPayConfig.mchId,
                serial_no: wechat_pay_config_1.wechatPayConfig.serialNo,
                privateKey: Buffer.from(wechat_pay_config_1.wechatPayConfig.privateKey || ''),
                publicKey: Buffer.from(wechat_pay_config_1.wechatPayConfig.publicKey || ''),
            });
            this.logger.log('微信支付V3分账服务初始化成功');
        }
        catch (error) {
            this.logger.warn(`微信支付V3分账服务初始化失败: ${error.message}，使用模拟模式`);
            this.paymentService = null;
        }
    }
    async executeProfitSharing(transactionId, hostOpenid, amount, orderId) {
        this.logger.log(`开始分账: transactionId=${transactionId}, hostOpenid=${hostOpenid}, amount=${amount}分`);
        const hostAmount = Math.floor(amount * PROFIT_SHARING_CONFIG.HOST_RATIO);
        const platformAmount = amount - hostAmount;
        this.logger.log(`分账金额计算: 总金额=${amount}分, 主办方=${hostAmount}分(${PROFIT_SHARING_CONFIG.HOST_RATIO * 100}%), 平台收取=${platformAmount}分(${PROFIT_SHARING_CONFIG.PLATFORM_FEE_RATIO * 100}%), 平台利润=${Math.floor(amount * PROFIT_SHARING_CONFIG.PLATFORM_PROFIT_RATIO)}分`);
        if (!this.paymentService) {
            this.logger.warn('微信支付未配置，使用模拟分账');
            return this.mockProfitSharing(transactionId, hostOpenid, amount, orderId, hostAmount, platformAmount);
        }
        try {
            await this.addProfitSharingReceiver(hostOpenid);
            const outOrderNo = `PS${Date.now()}${Math.random().toString(36).substr(2, 6)}`;
            const receivers = [
                {
                    type: 'PERSONAL_OPENID',
                    account: hostOpenid,
                    amount: hostAmount,
                    description: PROFIT_SHARING_CONFIG.DESCRIPTION,
                },
            ];
            this.logger.log(`请求分账: outOrderNo=${outOrderNo}, receivers=${JSON.stringify(receivers)}`);
            const result = await this.paymentService.profitSharing({
                transaction_id: transactionId,
                out_order_no: outOrderNo,
                receivers: receivers,
                finish: true,
            });
            if (result.status === 200 || result.status === 201 || result.out_order_no) {
                this.logger.log(`分账成功: outOrderNo=${outOrderNo}, 主办方到账=${hostAmount}分`);
                await this.updateProfitSharingRecord(orderId, {
                    profit_sharing_status: 'success',
                    profit_sharing_out_order_no: outOrderNo,
                    profit_sharing_time: new Date().toISOString(),
                    host_amount: hostAmount,
                    platform_amount: platformAmount,
                });
                return {
                    success: true,
                    transactionId,
                    outOrderNo,
                    hostAmount,
                    platformAmount,
                };
            }
            this.logger.error('分账失败:', result);
            return {
                success: false,
                errorMsg: result.message || '分账请求失败',
            };
        }
        catch (error) {
            this.logger.error(`分账异常: ${error.message}`);
            return {
                success: false,
                errorMsg: error.message || '分账异常',
            };
        }
    }
    async addProfitSharingReceiver(openid) {
        try {
            const result = await this.paymentService.profitSharingAddReceiver({
                account: openid,
                relation_type: 'USER',
                type: 'PERSONAL_OPENID',
                name: '宴会主办方',
            });
            this.logger.log(`添加分账接收方成功: openid=${openid}`);
        }
        catch (error) {
            if (error.message?.includes('已存在') || error.code === 'RECEIVER_ALREADY_EXISTS') {
                this.logger.log(`分账接收方已存在: openid=${openid}`);
                return;
            }
            this.logger.warn(`添加分账接收方失败: ${error.message}`);
        }
    }
    async executeProfitSharingWithRetry(transactionId, hostOpenid, amount, orderId, maxRetries = 3) {
        let lastError = '';
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            this.logger.log(`分账第${attempt}次尝试: orderId=${orderId}`);
            const result = await this.executeProfitSharing(transactionId, hostOpenid, amount, orderId);
            if (result.success) {
                return result;
            }
            lastError = result.errorMsg || '未知错误';
            if (attempt < maxRetries) {
                const delay = attempt * 1000;
                this.logger.log(`分账失败，等待${delay}ms后重试...`);
                await this.sleep(delay);
            }
        }
        this.logger.error(`分账失败，已重试${maxRetries}次: orderId=${orderId}, error=${lastError}`);
        await this.notifyAdmin(orderId, lastError);
        await this.updateProfitSharingRecord(orderId, {
            profit_sharing_status: 'failed',
            profit_sharing_error: lastError,
            profit_sharing_retry_count: maxRetries,
        });
        return {
            success: false,
            errorMsg: `分账失败，已重试${maxRetries}次: ${lastError}`,
        };
    }
    async notifyAdmin(orderId, errorMsg) {
        try {
            const { data: giftRecord } = await supabase
                .from('gift_records')
                .select('*, banquets(name, host_openid)')
                .eq('id', orderId)
                .single();
            if (!giftRecord) {
                this.logger.error('通知管理员失败：订单不存在');
                return;
            }
            await supabase.from('admin_notifications').insert({
                type: 'profit_sharing_failed',
                title: '分账失败通知',
                content: `订单${orderId}分账失败，已重试3次。错误信息：${errorMsg}。宴会：${giftRecord.banquets?.name}，金额：${giftRecord.amount}分`,
                order_id: orderId,
                host_openid: giftRecord.banquets?.host_openid,
                amount: giftRecord.amount,
                error_message: errorMsg,
                status: 'pending',
                created_at: new Date().toISOString(),
            });
            this.logger.log('已创建管理员通知记录');
        }
        catch (error) {
            this.logger.error(`通知管理员失败: ${error.message}`);
        }
    }
    async updateProfitSharingRecord(orderId, updates) {
        try {
            const { error } = await supabase.from('gift_records').update(updates).eq('id', orderId);
            if (error) {
                this.logger.error('更新分账记录失败:', error);
            }
        }
        catch (error) {
            this.logger.error(`更新分账记录异常: ${error.message}`);
        }
    }
    async mockProfitSharing(transactionId, hostOpenid, amount, orderId, hostAmount, platformAmount) {
        const platformProfit = Math.floor(amount * PROFIT_SHARING_CONFIG.PLATFORM_PROFIT_RATIO);
        this.logger.log(`模拟分账成功: 总金额=${amount}分, 主办方=${hostAmount}分, 平台收取=${platformAmount}分, 平台利润=${platformProfit}分`);
        await this.updateProfitSharingRecord(orderId, {
            profit_sharing_status: 'success',
            profit_sharing_out_order_no: `MOCK_PS_${Date.now()}`,
            profit_sharing_time: new Date().toISOString(),
            host_amount: hostAmount,
            platform_amount: platformAmount,
        });
        return {
            success: true,
            transactionId,
            outOrderNo: `MOCK_PS_${Date.now()}`,
            hostAmount,
            platformAmount,
        };
    }
    async queryProfitSharing(outOrderNo) {
        if (!this.paymentService) {
            return {
                success: true,
                data: { status: 'FINISHED' },
            };
        }
        try {
            const result = await this.paymentService.profitSharingQuery({
                out_order_no: outOrderNo,
            });
            return {
                success: true,
                data: result,
            };
        }
        catch (error) {
            this.logger.error(`查询分账结果失败: ${error.message}`);
            return {
                success: false,
                errorMsg: error.message,
            };
        }
    }
    async unfreezeRemaining(transactionId, orderId) {
        if (!this.paymentService) {
            this.logger.log('模拟解冻剩余资金成功');
            return true;
        }
        try {
            const result = await this.paymentService.profitSharingUnfreeze({
                transaction_id: transactionId,
                out_order_no: `UNFREEZE_${Date.now()}`,
                description: '解冻剩余资金',
            });
            if (result.status === 200 || result.status === 201) {
                this.logger.log('解冻剩余资金成功');
                return true;
            }
            this.logger.error('解冻剩余资金失败:', result);
            return false;
        }
        catch (error) {
            this.logger.error(`解冻剩余资金异常: ${error.message}`);
            return false;
        }
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.ProfitSharingService = ProfitSharingService;
exports.ProfitSharingService = ProfitSharingService = ProfitSharingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], ProfitSharingService);
//# sourceMappingURL=profit-sharing.service.js.map