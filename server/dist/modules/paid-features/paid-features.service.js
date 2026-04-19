"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PaidFeaturesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaidFeaturesService = void 0;
const common_1 = require("@nestjs/common");
const supabase_client_1 = require("../../storage/database/supabase-client");
const PRODUCT_CONFIG = {
    ledger_export: {
        name: '礼账单导出',
        price: 990,
        description: '单场付费9.9元，本场礼账单终身可导出、不限次数，支持Excel',
    },
    gift_reminder: {
        name: '人情往来提醒',
        price: 1990,
        description: '单场付费19.9元，本场随礼嘉宾今后办宴，系统自动发短信提醒您',
    },
    ai_page: {
        name: 'AI专属欢迎&感谢页面',
        price: 880,
        description: '宴会开始前可后期补开；免费传1-3张，付费传1-6张；免费统一图，付费一人一图',
    },
};
let PaidFeaturesService = PaidFeaturesService_1 = class PaidFeaturesService {
    constructor() {
        this.logger = new common_1.Logger(PaidFeaturesService_1.name);
    }
    async getPaidFeaturesStatus(openid) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data: features, error } = await client
            .from('banquet_paid_features')
            .select('*')
            .eq('banquet_id', client.from('banquets').select('id').eq('host_openid', openid));
        if (error) {
            this.logger.error('查询付费功能状态失败:', error);
        }
        const featuresList = features || [];
        return {
            aiWelcomePage: {
                paid: featuresList.some((f) => f.ai_page_enabled),
                usedCount: featuresList.filter((f) => f.ai_page_enabled).length,
            },
            ledgerExport: {
                paid: featuresList.some((f) => f.ledger_export_enabled),
                usedCount: featuresList.filter((f) => f.ledger_export_enabled).length,
            },
            giftReminder: {
                paid: featuresList.some((f) => f.gift_reminder_enabled),
                usedCount: featuresList.filter((f) => f.gift_reminder_enabled).length,
            },
        };
    }
    async getBanquetPaidFeatures(banquetId) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data, error } = await client
            .from('banquet_paid_features')
            .select('*')
            .eq('banquet_id', banquetId)
            .single();
        if (error && error.code !== 'PGRST116') {
            this.logger.error('查询宴会付费功能状态失败:', error);
            throw new Error('查询失败');
        }
        if (!data) {
            return {
                ledgerExport: { enabled: false, paid: false },
                giftReminder: { enabled: false, paid: false },
                aiPage: { enabled: false, paid: false, imageCount: 3 },
            };
        }
        return {
            ledgerExport: {
                enabled: data.ledger_export_enabled,
                paid: data.ledger_export_enabled,
                paidAt: data.ledger_export_paid_at,
            },
            giftReminder: {
                enabled: data.gift_reminder_enabled,
                paid: data.gift_reminder_enabled,
                paidAt: data.gift_reminder_paid_at,
            },
            aiPage: {
                enabled: data.ai_page_enabled,
                paid: data.ai_page_enabled,
                paidAt: data.ai_page_paid_at,
                imageCount: data.ai_page_enabled ? 6 : 3,
            },
        };
    }
    async checkFeatureEnabled(banquetId, feature) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data, error } = await client
            .from('banquet_paid_features')
            .select('*')
            .eq('banquet_id', banquetId)
            .single();
        if (error && error.code !== 'PGRST116') {
            return false;
        }
        if (!data)
            return false;
        switch (feature) {
            case 'ledger_export':
                return data.ledger_export_enabled;
            case 'gift_reminder':
                return data.gift_reminder_enabled;
            case 'ai_page':
                return data.ai_page_enabled;
            default:
                return false;
        }
    }
    async createPaymentOrder(openid, banquetId, feature, amount) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const productConfig = PRODUCT_CONFIG[feature];
        if (!productConfig) {
            throw new Error('无效的产品类型');
        }
        if (amount !== productConfig.price) {
            this.logger.warn(`金额不匹配: 传入${amount}, 应为${productConfig.price}`);
        }
        const alreadyEnabled = await this.checkFeatureEnabled(banquetId, feature);
        if (alreadyEnabled) {
            throw new Error('该功能已开通，无需重复购买');
        }
        const orderNo = `PF${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const { data: order, error: orderError } = await client
            .from('payment_orders')
            .insert({
            order_no: orderNo,
            openid,
            banquet_id: banquetId,
            product_type: feature,
            product_name: productConfig.name,
            amount: productConfig.price,
            status: 'pending',
        })
            .select()
            .single();
        if (orderError) {
            this.logger.error('创建订单失败:', orderError);
            throw new Error('创建订单失败');
        }
        if (process.env.NODE_ENV === 'development' || process.env.MOCK_PAYMENT === 'true') {
            await this.handlePaymentSuccess(order.id, `MOCK_${Date.now()}`);
            return {
                orderId: order.id,
                orderNo: order.order_no,
                mock: true,
                message: '模拟支付成功',
            };
        }
        return {
            orderId: order.id,
            orderNo: order.order_no,
            amount: productConfig.price,
            productName: productConfig.name,
        };
    }
    async handlePaymentSuccess(orderId, transactionId) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data: order, error: orderError } = await client
            .from('payment_orders')
            .select('*')
            .eq('id', orderId)
            .single();
        if (orderError || !order) {
            throw new Error('订单不存在');
        }
        if (order.status === 'paid') {
            return { success: true, message: '订单已处理' };
        }
        await client
            .from('payment_orders')
            .update({
            status: 'paid',
            transaction_id: transactionId,
            paid_at: new Date().toISOString(),
        })
            .eq('id', orderId);
        await this.enableFeature(order.banquet_id, order.product_type, orderId);
        return { success: true, orderId, banquetId: order.banquet_id };
    }
    async enableFeature(banquetId, feature, orderId) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const now = new Date().toISOString();
        const updateField = this.getFeatureUpdateField(feature, orderId, now);
        const { data: existing, error: queryError } = await client
            .from('banquet_paid_features')
            .select('id')
            .eq('banquet_id', banquetId)
            .single();
        if (existing) {
            await client.from('banquet_paid_features').update(updateField).eq('id', existing.id);
        }
        else {
            await client.from('banquet_paid_features').insert({
                banquet_id: banquetId,
                ...updateField,
            });
        }
        if (feature === 'ai_page') {
            await client
                .from('banquets')
                .update({
                ai_page_enabled: true,
                ai_page_paid: true,
            })
                .eq('id', banquetId);
        }
    }
    getFeatureUpdateField(feature, orderId, now) {
        switch (feature) {
            case 'ledger_export':
                return {
                    ledger_export_enabled: true,
                    ledger_export_paid_at: now,
                    ledger_export_order_id: orderId,
                };
            case 'gift_reminder':
                return {
                    gift_reminder_enabled: true,
                    gift_reminder_paid_at: now,
                    gift_reminder_order_id: orderId,
                };
            case 'ai_page':
                return {
                    ai_page_enabled: true,
                    ai_page_paid_at: now,
                    ai_page_order_id: orderId,
                };
            default:
                return {};
        }
    }
    async enableAIPage(banquetId) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data: banquet, error: banquetError } = await client
            .from('banquets')
            .select('id, event_time, ai_page_paid')
            .eq('id', banquetId)
            .single();
        if (banquetError || !banquet) {
            throw new Error('宴会不存在');
        }
        const eventTime = new Date(banquet.event_time);
        const now = new Date();
        const eventEndTime = new Date(eventTime.getTime() + 24 * 60 * 60 * 1000);
        if (now > eventEndTime) {
            throw new Error('宴会已结束，无法开通AI页面');
        }
        if (banquet.ai_page_paid) {
            return { success: true, message: '已开通' };
        }
        await client.from('banquets').update({ ai_page_enabled: true }).eq('id', banquetId);
        const { data: existing } = await client
            .from('banquet_paid_features')
            .select('id')
            .eq('banquet_id', banquetId)
            .single();
        if (existing) {
            await client
                .from('banquet_paid_features')
                .update({ ai_page_enabled: true })
                .eq('id', existing.id);
        }
        else {
            await client.from('banquet_paid_features').insert({
                banquet_id: banquetId,
                ai_page_enabled: true,
            });
        }
        return { success: true, message: 'AI页面已启用' };
    }
};
exports.PaidFeaturesService = PaidFeaturesService;
exports.PaidFeaturesService = PaidFeaturesService = PaidFeaturesService_1 = __decorate([
    (0, common_1.Injectable)()
], PaidFeaturesService);
//# sourceMappingURL=paid-features.service.js.map