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
var PaymentController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
const common_1 = require("@nestjs/common");
const payment_service_1 = require("./payment.service");
const return_gift_service_1 = require("../return-gift/return-gift.service");
const supabase_client_1 = require("../../storage/database/supabase-client");
let PaymentController = PaymentController_1 = class PaymentController {
    constructor(paymentService, returnGiftService) {
        this.paymentService = paymentService;
        this.returnGiftService = returnGiftService;
        this.logger = new common_1.Logger(PaymentController_1.name);
    }
    async createGiftPayment(body, req) {
        const { banquetId, guestName, guestOpenid, amount, blessing } = body;
        const openid = guestOpenid ||
            req.headers['x-wx-openid'] ||
            req.user?.openid ||
            `guest_${Date.now()}`;
        this.logger.log(`创建随礼支付: banquetId=${banquetId}, guestOpenid=${openid}, amount=${amount}分`);
        if (!banquetId || !guestName || !amount) {
            return { code: 400, msg: '参数不完整', data: null };
        }
        if (amount < 100 || amount > 5000000) {
            return { code: 400, msg: '随礼金额需在1元至50000元之间', data: null };
        }
        try {
            const supabase = (0, supabase_client_1.getSupabaseClient)();
            const { data: banquet, error: banquetError } = await supabase
                .from('banquets')
                .select('*')
                .eq('id', banquetId)
                .single();
            if (banquetError || !banquet) {
                return { code: 404, msg: '宴会不存在', data: null };
            }
            if (banquet.status !== 'active') {
                return { code: 400, msg: '宴会已结束或未开始', data: null };
            }
            const { data: existingGift } = await supabase
                .from('gift_records')
                .select('id')
                .eq('banquet_id', banquetId)
                .eq('guest_openid', openid)
                .single();
            if (existingGift) {
                return { code: 400, msg: '您已经随礼过了，每人每场宴会仅限随礼一次', data: null };
            }
            const paymentResult = await this.paymentService.createWechatPayment({
                banquetId,
                guestOpenid: openid,
                guestName,
                amount,
                description: `${banquet.name} - 随礼`,
                blessing,
            });
            this.logger.log(`随礼订单创建成功: orderId=${paymentResult.orderId}`);
            return {
                code: 200,
                msg: 'success',
                data: paymentResult,
            };
        }
        catch (error) {
            this.logger.error(`创建随礼支付失败: ${error.message}`);
            return { code: 500, msg: '创建订单失败', data: null };
        }
    }
    async paymentNotify(body) {
        this.logger.log('收到微信支付回调');
        try {
            const result = await this.paymentService.handlePaymentCallback(body);
            if (!result.success) {
                return { code: 'FAIL', message: result.errorMsg || '处理失败' };
            }
            if (result.orderId) {
                try {
                    await this.returnGiftService.triggerReturnGift(result.orderId);
                    this.logger.log(`自动回礼已触发: orderId=${result.orderId}`);
                }
                catch (error) {
                    this.logger.error(`触发回礼失败: ${error.message}`);
                }
            }
            return { code: 'SUCCESS', message: '成功' };
        }
        catch (error) {
            this.logger.error(`支付回调处理失败: ${error.message}`);
            return { code: 'FAIL', message: '处理失败' };
        }
    }
    async mockPaymentSuccess(body) {
        const { orderId } = body;
        this.logger.log(`模拟支付成功: orderId=${orderId}`);
        if (!orderId) {
            return { code: 400, msg: '订单号不能为空', data: null };
        }
        try {
            const supabase = (0, supabase_client_1.getSupabaseClient)();
            const { data: giftRecord, error: queryError } = await supabase
                .from('gift_records')
                .select('*, banquets(*)')
                .eq('id', orderId)
                .single();
            if (queryError || !giftRecord) {
                return { code: 404, msg: '随礼记录不存在', data: null };
            }
            const { error: updateError } = await supabase
                .from('gift_records')
                .update({
                payment_status: 'paid',
                transaction_id: `MOCK_TRANS_${Date.now()}`,
                paid_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
                .eq('id', orderId);
            if (updateError) {
                return { code: 500, msg: '更新支付状态失败', data: null };
            }
            const banquet = giftRecord.banquets;
            const hostOpenid = banquet?.host_openid;
            if (hostOpenid && giftRecord.amount > 0) {
                const transferResult = await this.paymentService.transferToHost(hostOpenid, giftRecord.amount, `【${banquet?.name || '宴会'}】随礼收入（${giftRecord.guest_name}）`);
                if (transferResult.success) {
                    await supabase
                        .from('gift_records')
                        .update({
                        transfer_status: 'transferred',
                        transfer_time: new Date().toISOString(),
                        payment_no: transferResult.paymentNo,
                    })
                        .eq('id', orderId);
                    this.logger.log(`模拟转账成功: ${transferResult.paymentNo}`);
                }
            }
            try {
                await this.returnGiftService.triggerReturnGift(orderId);
                this.logger.log(`回礼已触发: orderId=${orderId}`);
            }
            catch (error) {
                this.logger.error(`触发回礼失败: ${error.message}`);
            }
            return {
                code: 200,
                msg: '模拟支付成功',
                data: {
                    orderId,
                    amount: giftRecord.amount,
                    transferred: true,
                },
            };
        }
        catch (error) {
            this.logger.error(`模拟支付成功处理失败: ${error.message}`);
            return { code: 500, msg: '处理失败', data: null };
        }
    }
    async queryPayment(orderId) {
        if (!orderId) {
            return { code: 400, msg: '订单号不能为空', data: null };
        }
        try {
            const status = await this.paymentService.queryPaymentStatus(orderId);
            return {
                code: 200,
                msg: 'success',
                data: status,
            };
        }
        catch (error) {
            this.logger.error(`查询支付状态失败: ${error.message}`);
            return { code: 500, msg: '查询失败', data: null };
        }
    }
};
exports.PaymentController = PaymentController;
__decorate([
    (0, common_1.Post)('gift/create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "createGiftPayment", null);
__decorate([
    (0, common_1.Post)('notify'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "paymentNotify", null);
__decorate([
    (0, common_1.Post)('mock-success'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "mockPaymentSuccess", null);
__decorate([
    (0, common_1.Get)('query'),
    __param(0, (0, common_1.Query)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "queryPayment", null);
exports.PaymentController = PaymentController = PaymentController_1 = __decorate([
    (0, common_1.Controller)('payment'),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => return_gift_service_1.ReturnGiftService))),
    __metadata("design:paramtypes", [payment_service_1.PaymentService,
        return_gift_service_1.ReturnGiftService])
], PaymentController);
//# sourceMappingURL=payment.controller.js.map