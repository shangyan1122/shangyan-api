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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var PaymentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = __importDefault(require("crypto"));
const https_1 = __importDefault(require("https"));
const fs_1 = require("fs");
const path_1 = require("path");
const supabase_client_1 = require("../../storage/database/supabase-client");
const supabase = (0, supabase_client_1.getSupabaseClient)();
let PaymentService = PaymentService_1 = class PaymentService {
    constructor() {
        this.logger = new common_1.Logger(PaymentService_1.name);
        this.appId = process.env.WECHAT_APP_ID || '';
        this.mchId = process.env.WECHAT_MCH_ID || '';
        this.apiKey = process.env.WECHAT_PAY_API_KEY || '';
        this.notifyUrl = process.env.WECHAT_PAY_NOTIFY_URL || process.env.WECHAT_NOTIFY_URL || '';
        this.apiV3Key = process.env.WECHAT_PAY_API_V3_KEY || '';
        this.pfxCert = null;
        this.certPassphrase = process.env.WECHAT_PFX_PASSPHRASE || '';
        this.loadMerchantCert();
    }
    loadMerchantCert() {
        const pfxPath = process.env.WECHAT_PFX_PATH || (0, path_1.join)(process.cwd(), 'certs', 'apiclient_cert.p12');
        if ((0, fs_1.existsSync)(pfxPath)) {
            try {
                this.pfxCert = (0, fs_1.readFileSync)(pfxPath);
                this.logger.log('商户证书加载成功');
            }
            catch (e) {
                this.logger.warn(`商户证书加载失败: ${e.message}`);
            }
        }
        else {
            this.logger.warn(`商户证书文件不存在: ${pfxPath}，转账功能将使用模拟模式`);
        }
    }
    createCertAgent() {
        if (!this.pfxCert) {
            return null;
        }
        return new https_1.default.Agent({
            pfx: this.pfxCert,
            passphrase: this.certPassphrase || this.mchId,
        });
    }
    async createWechatPayment(params) {
        const { banquetId, guestOpenid, guestName, amount, description, blessing } = params;
        const orderId = `GIFT${Date.now()}${Math.random().toString(36).substr(2, 6)}`;
        this.logger.log(`创建随礼支付订单: ${orderId}, 金额: ${amount}分, 宴会: ${banquetId}`);
        const attachData = {
            guestName,
            blessing: blessing || '',
            banquetId,
            timestamp: Date.now(),
        };
        const attach = Buffer.from(JSON.stringify(attachData)).toString('base64');
        const useMock = !this.appId || !this.mchId || !this.apiKey || process.env.NODE_ENV === 'development';
        if (useMock) {
            this.logger.warn('使用模拟支付模式');
            return this.createMockPayment(orderId, params);
        }
        try {
            const { error: insertError } = await supabase.from('gift_records').insert({
                id: orderId,
                banquet_id: banquetId,
                guest_openid: guestOpenid,
                guest_name: guestName,
                amount: amount,
                blessing: blessing || '',
                payment_status: 'pending',
                return_gift_status: 'none',
                transfer_status: 'pending',
                created_at: new Date().toISOString(),
            });
            if (insertError) {
                this.logger.error('创建随礼记录失败:', insertError);
                throw new Error('创建记录失败');
            }
            const unifiedOrderParams = {
                appid: this.appId,
                mch_id: this.mchId,
                nonce_str: this.generateNonceStr(),
                body: description,
                attach: attach,
                out_trade_no: orderId,
                total_fee: amount,
                spbill_create_ip: '127.0.0.1',
                notify_url: this.notifyUrl,
                trade_type: 'JSAPI',
                openid: guestOpenid,
            };
            const sign = this.generateSignature(unifiedOrderParams);
            const unifiedOrderXml = this.buildXml({ ...unifiedOrderParams, sign });
            const response = await fetch('https://api.mch.weixin.qq.com/pay/unifiedorder', {
                method: 'POST',
                body: unifiedOrderXml,
                headers: { 'Content-Type': 'application/xml' },
            });
            const responseText = await response.text();
            const responseData = this.parseXml(responseText);
            if (responseData.return_code !== 'SUCCESS' || responseData.result_code !== 'SUCCESS') {
                throw new Error(`微信支付下单失败: ${responseData.return_msg || responseData.err_code_des}`);
            }
            const prepayId = responseData.prepay_id;
            const timeStamp = Math.floor(Date.now() / 1000).toString();
            const nonceStr = this.generateNonceStr();
            const paySign = this.generatePaySign(prepayId, timeStamp, nonceStr);
            return {
                orderId,
                prepayId,
                appId: this.appId,
                timeStamp,
                nonceStr,
                package: `prepay_id=${prepayId}`,
                signType: 'MD5',
                paySign,
            };
        }
        catch (error) {
            this.logger.error(`创建微信支付订单失败: ${error.message}`);
            return this.createMockPayment(orderId, params);
        }
    }
    async createMockPayment(orderId, params) {
        this.logger.log(`使用模拟支付: ${orderId}`);
        const timeStamp = Math.floor(Date.now() / 1000).toString();
        const nonceStr = this.generateNonceStr();
        const { error } = await supabase.from('gift_records').insert({
            id: orderId,
            banquet_id: params.banquetId,
            guest_openid: params.guestOpenid,
            guest_name: params.guestName,
            amount: params.amount,
            blessing: params.blessing || '',
            payment_status: 'pending',
            return_gift_status: 'none',
            transfer_status: 'pending',
            created_at: new Date().toISOString(),
        });
        if (error) {
            this.logger.error('创建随礼记录失败:', error);
        }
        return {
            orderId,
            isMock: true,
            timeStamp,
            nonceStr,
            package: `prepay_id=mock_prepay_id_${orderId}`,
            signType: 'MD5',
            paySign: 'mock_sign_' + this.generateNonceStr(),
        };
    }
    async handlePaymentCallback(body) {
        this.logger.log('收到支付回调');
        try {
            const isValid = await this.verifyCallback(body);
            if (!isValid) {
                this.logger.warn('支付回调签名验证失败');
                return { success: false, errorMsg: '签名验证失败' };
            }
            const { out_trade_no, transaction_id, attach } = await this.parseCallbackData(body);
            this.logger.log(`支付成功: orderId=${out_trade_no}, wechatOrderId=${transaction_id}`);
            let guestInfo = { guestName: '', blessing: '' };
            if (attach) {
                try {
                    const attachData = JSON.parse(Buffer.from(attach, 'base64').toString());
                    guestInfo = {
                        guestName: attachData.guestName || '',
                        blessing: attachData.blessing || '',
                    };
                    this.logger.log(`attach信息: ${JSON.stringify(guestInfo)}`);
                }
                catch (e) {
                    this.logger.warn('解析attach失败，使用数据库中的信息');
                }
            }
            const { data: giftRecord, error: queryError } = await supabase
                .from('gift_records')
                .select('*, banquets(*)')
                .eq('id', out_trade_no)
                .single();
            if (queryError || !giftRecord) {
                this.logger.error('随礼记录不存在:', queryError);
                return { success: false, errorMsg: '随礼记录不存在' };
            }
            const { error: updateError } = await supabase
                .from('gift_records')
                .update({
                payment_status: 'paid',
                transaction_id: transaction_id,
                paid_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
                .eq('id', out_trade_no);
            if (updateError) {
                this.logger.error('更新支付状态失败:', updateError);
            }
            const banquet = giftRecord.banquets;
            const hostOpenid = banquet?.host_openid;
            if (hostOpenid && giftRecord.amount > 0 && transaction_id) {
                const profitSharingResult = await this.executeProfitSharingWithRetry(transaction_id, hostOpenid, giftRecord.amount, out_trade_no);
                if (profitSharingResult.success) {
                    await supabase
                        .from('gift_records')
                        .update({
                        transfer_status: 'transferred',
                        transfer_time: new Date().toISOString(),
                        payment_no: profitSharingResult.outOrderNo,
                    })
                        .eq('id', out_trade_no);
                    this.logger.log(`分账成功: hostOpenid=${hostOpenid}, amount=${giftRecord.amount}, outOrderNo=${profitSharingResult.outOrderNo}`);
                }
                else {
                    this.logger.error(`分账失败: ${profitSharingResult.errorMsg}`);
                }
            }
            else {
                this.logger.warn(`无法执行分账: hostOpenid=${hostOpenid}, amount=${giftRecord.amount}, transaction_id=${transaction_id}`);
            }
            return { success: true, orderId: out_trade_no };
        }
        catch (error) {
            this.logger.error(`处理支付回调失败: ${error.message}`);
            return { success: false, errorMsg: error.message };
        }
    }
    async transferToHost(openid, amount, description) {
        this.logger.log(`转账到主办方零钱: openid=${openid}, 金额=${amount}分`);
        if (!this.appId || !this.mchId || !this.apiKey) {
            this.logger.warn('微信支付未配置，使用模拟转账');
            return {
                success: true,
                paymentNo: `MOCK_TRANSFER_${Date.now()}`,
            };
        }
        if (!this.pfxCert) {
            this.logger.warn('商户证书未配置，使用模拟转账');
            return {
                success: true,
                paymentNo: `MOCK_TRANSFER_${Date.now()}`,
            };
        }
        try {
            const partnerTradeNo = `TRANSFER${Date.now()}${Math.random().toString(36).substr(2, 6)}`;
            const transferParams = {
                mch_appid: this.appId,
                mchid: this.mchId,
                nonce_str: this.generateNonceStr(),
                partner_trade_no: partnerTradeNo,
                openid,
                check_name: 'NO_CHECK',
                amount,
                desc: description,
                spbill_create_ip: '127.0.0.1',
            };
            const sign = this.generateSignature(transferParams);
            const xml = this.buildXml({ ...transferParams, sign });
            const agent = this.createCertAgent();
            const response = await fetch('https://api.mch.weixin.qq.com/mmpaymkttransfers/promotion/transfers', {
                method: 'POST',
                body: xml,
                headers: { 'Content-Type': 'application/xml' },
                agent,
            });
            const responseText = await response.text();
            const data = this.parseXml(responseText);
            if (data.return_code === 'SUCCESS' && data.result_code === 'SUCCESS') {
                this.logger.log(`转账成功: paymentNo=${data.payment_no}`);
                return {
                    success: true,
                    paymentNo: data.payment_no,
                };
            }
            else {
                this.logger.error(`转账失败: ${data.err_code_des || data.return_msg}`);
                return {
                    success: false,
                    errorMsg: data.err_code_des || data.return_msg,
                };
            }
        }
        catch (error) {
            this.logger.error(`转账异常: ${error.message}`);
            return {
                success: false,
                errorMsg: error.message,
            };
        }
    }
    async verifyCallback(body) {
        if (!this.apiKey) {
            return true;
        }
        try {
            const { sign, ...data } = body;
            const calculatedSign = this.generateSignature(data);
            return sign === calculatedSign;
        }
        catch {
            return false;
        }
    }
    async parseCallbackData(body) {
        if (typeof body === 'string') {
            const data = this.parseXml(body);
            return {
                out_trade_no: data.out_trade_no,
                transaction_id: data.transaction_id,
                openid: data.openid,
                attach: data.attach,
            };
        }
        return {
            out_trade_no: body.out_trade_no,
            transaction_id: body.transaction_id,
            openid: body.openid,
            attach: body.attach,
        };
    }
    async queryPaymentStatus(orderId) {
        if (!this.appId || !this.mchId || !this.apiKey) {
            return {
                trade_state: 'SUCCESS',
                trade_state_desc: '支付成功',
            };
        }
        try {
            const params = {
                appid: this.appId,
                mch_id: this.mchId,
                out_trade_no: orderId,
                nonce_str: this.generateNonceStr(),
            };
            const sign = this.generateSignature(params);
            const xml = this.buildXml({ ...params, sign });
            const response = await fetch('https://api.mch.weixin.qq.com/pay/orderquery', {
                method: 'POST',
                body: xml,
                headers: { 'Content-Type': 'application/xml' },
            });
            const responseText = await response.text();
            const data = this.parseXml(responseText);
            return {
                trade_state: data.trade_state,
                trade_state_desc: data.trade_state_desc,
                transaction_id: data.transaction_id,
            };
        }
        catch (error) {
            this.logger.error(`查询支付状态失败: ${error.message}`);
            throw error;
        }
    }
    generateNonceStr() {
        return Math.random().toString(36).substr(2, 32);
    }
    generateSignature(params) {
        const sortedKeys = Object.keys(params).sort();
        const stringA = sortedKeys
            .filter((key) => params[key] !== '' && params[key] !== undefined && params[key] !== null)
            .map((key) => `${key}=${params[key]}`)
            .join('&');
        const stringSignTemp = `${stringA}&key=${this.apiKey}`;
        return crypto_1.default.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase();
    }
    generatePaySign(prepayId, timeStamp, nonceStr) {
        const packageStr = `prepay_id=${prepayId}`;
        const params = {
            appId: this.appId,
            timeStamp,
            nonceStr,
            package: packageStr,
            signType: 'MD5',
        };
        return this.generateSignature(params);
    }
    buildXml(params) {
        const xmlContent = Object.entries(params)
            .map(([key, value]) => `<${key}><![CDATA[${value}]]></${key}>`)
            .join('');
        return `<xml>${xmlContent}</xml>`;
    }
    parseXml(xml) {
        const result = {};
        const regex = /<(\w+)><!\[CDATA\[(.*?)\]\]><\/\1>|<(\w+)>(.*?)<\/\3>/g;
        let match;
        while ((match = regex.exec(xml)) !== null) {
            const key = match[1] || match[3];
            const value = match[2] || match[4];
            if (key && value) {
                result[key] = value;
            }
        }
        return result;
    }
    setProfitSharingService(service) {
        this.profitSharingService = service;
    }
    async executeProfitSharingWithRetry(transactionId, hostOpenid, amount, orderId) {
        if (!this.profitSharingService) {
            this.logger.warn('分账服务未注入，使用模拟分账');
            await supabase
                .from('gift_records')
                .update({
                profit_sharing_status: 'success',
                profit_sharing_out_order_no: `MOCK_PS_${Date.now()}`,
                profit_sharing_time: new Date().toISOString(),
            })
                .eq('id', orderId);
            return {
                success: true,
                outOrderNo: `MOCK_PS_${Date.now()}`,
            };
        }
        return this.profitSharingService.executeProfitSharingWithRetry(transactionId, hostOpenid, amount, orderId, 3);
    }
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = PaymentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PaymentService);
//# sourceMappingURL=payment.service.js.map