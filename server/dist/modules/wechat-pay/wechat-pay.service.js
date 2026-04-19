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
var WechatPayService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WechatPayService = void 0;
const common_1 = require("@nestjs/common");
const wechat_pay_config_1 = require("./wechat-pay.config");
const crypto_1 = require("crypto");
let WechatPayService = WechatPayService_1 = class WechatPayService {
    constructor() {
        this.logger = new common_1.Logger(WechatPayService_1.name);
        this.initPaymentService();
    }
    initPaymentService() {
        try {
            const WechatPay = require('wechatpay-node-v3');
            if (!wechat_pay_config_1.wechatPayConfig.appId ||
                !wechat_pay_config_1.wechatPayConfig.mchId ||
                wechat_pay_config_1.wechatPayConfig.appId === 'wx_app_id' ||
                wechat_pay_config_1.wechatPayConfig.mchId === 'merchant_id') {
                this.logger.warn('微信支付配置不完整，使用模拟模式');
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
            this.logger.log('微信支付服务初始化成功');
        }
        catch (error) {
            this.logger.warn(`微信支付服务初始化失败: ${error.message}，使用模拟模式`);
            this.paymentService = null;
        }
    }
    async createJsapiOrder(params) {
        const { openid, amount, description, orderId } = params;
        try {
            const result = await this.paymentService.transactions_jsapi({
                description,
                out_trade_no: orderId,
                notify_url: wechat_pay_config_1.wechatPayConfig.notifyUrl,
                amount: {
                    total: Math.round(amount),
                    currency: 'CNY',
                },
                payer: {
                    openid,
                },
            });
            if (result.status === 200 || result.status === 201) {
                const timestamp = Math.floor(Date.now() / 1000).toString();
                const nonceStr = (0, crypto_1.randomUUID)().replace(/-/g, '');
                const packageStr = `prepay_id=${result.prepay_id}`;
                const paySign = this.paymentService.getPaySign(wechat_pay_config_1.wechatPayConfig.appId, timestamp, nonceStr, packageStr);
                return {
                    success: true,
                    data: {
                        timeStamp: timestamp,
                        nonceStr,
                        package: packageStr,
                        signType: 'RSA',
                        paySign,
                        prepayId: result.prepay_id,
                    },
                };
            }
            this.logger.error('创建支付订单失败:', result);
            return {
                success: false,
                message: '创建支付订单失败',
            };
        }
        catch (error) {
            this.logger.error('创建支付订单异常:', error);
            return {
                success: false,
                message: error.message || '创建支付订单异常',
            };
        }
    }
    async queryOrder(orderId) {
        try {
            const result = await this.paymentService.query({
                out_trade_no: orderId,
            });
            return {
                success: true,
                data: result,
            };
        }
        catch (error) {
            this.logger.error('查询订单失败:', error);
            return {
                success: false,
                message: error.message || '查询订单失败',
            };
        }
    }
    async closeOrder(orderId) {
        try {
            await this.paymentService.close({
                out_trade_no: orderId,
            });
            return { success: true };
        }
        catch (error) {
            this.logger.error('关闭订单失败:', error);
            return {
                success: false,
                message: error.message || '关闭订单失败',
            };
        }
    }
    async refund(params) {
        const { orderId, refundId, totalAmount, refundAmount, reason } = params;
        try {
            const result = await this.paymentService.refunds({
                out_trade_no: orderId,
                out_refund_no: refundId,
                reason: reason || '用户申请退款',
                amount: {
                    total: Math.round(totalAmount),
                    refund: Math.round(refundAmount),
                    currency: 'CNY',
                },
            });
            return {
                success: true,
                data: result,
            };
        }
        catch (error) {
            this.logger.error('申请退款失败:', error);
            return {
                success: false,
                message: error.message || '申请退款失败',
            };
        }
    }
    verifyNotify(headers, body) {
        try {
            const signature = headers['wechatpay-signature'];
            const timestamp = headers['wechatpay-timestamp'];
            const nonce = headers['wechatpay-nonce'];
            const serial = headers['wechatpay-serial'];
            return this.paymentService.verifySign({
                signature,
                timestamp,
                nonce,
                serial,
                body,
            });
        }
        catch (error) {
            this.logger.error('验证回调签名失败:', error);
            return false;
        }
    }
    decryptNotify(resource) {
        try {
            return this.paymentService.decipher_gcm(resource.ciphertext, resource.associated_data, resource.nonce, wechat_pay_config_1.wechatPayConfig.apiV3Key);
        }
        catch (error) {
            this.logger.error('解密回调数据失败:', error);
            return null;
        }
    }
    async transferToBalance(params) {
        const { openid, amount, description, orderId } = params;
        this.logger.log(`商家转账到零钱: openid=${openid}, 金额=${amount}分`);
        if (!wechat_pay_config_1.wechatPayConfig.appId || !wechat_pay_config_1.wechatPayConfig.mchId) {
            this.logger.warn('微信支付未配置，使用模拟转账');
            return {
                success: true,
                paymentNo: `MOCK${Date.now()}`,
            };
        }
        try {
            const outBatchNo = orderId || `BATCH${Date.now()}${Math.random().toString(36).substr(2, 6)}`;
            const outDetailNo = `DETAIL${Date.now()}${Math.random().toString(36).substr(2, 6)}`;
            const result = await this.paymentService.transferBatch({
                out_batch_no: outBatchNo,
                batch_name: description,
                batch_remark: description,
                total_amount: amount,
                total_num: 1,
                transfer_detail_list: [
                    {
                        out_detail_no: outDetailNo,
                        transfer_amount: amount,
                        transfer_remark: description,
                        openid,
                    },
                ],
            });
            if (result.status === 200 || result.status === 201 || result.batch_id) {
                this.logger.log(`商家转账成功: batchId=${result.batch_id}`);
                return {
                    success: true,
                    paymentNo: result.batch_id || outBatchNo,
                };
            }
            this.logger.error('商家转账失败:', result);
            return {
                success: false,
                errorMsg: result.message || '转账失败',
            };
        }
        catch (error) {
            this.logger.error('商家转账异常:', error);
            return {
                success: false,
                errorMsg: error.message || '转账异常',
            };
        }
    }
};
exports.WechatPayService = WechatPayService;
exports.WechatPayService = WechatPayService = WechatPayService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], WechatPayService);
//# sourceMappingURL=wechat-pay.service.js.map