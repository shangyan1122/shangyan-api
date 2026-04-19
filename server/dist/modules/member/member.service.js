"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MemberService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemberService = void 0;
const common_1 = require("@nestjs/common");
const supabase_client_1 = require("../../storage/database/supabase-client");
const supabase = (0, supabase_client_1.getSupabaseClient)();
let MemberService = MemberService_1 = class MemberService {
    constructor() {
        this.logger = new common_1.Logger(MemberService_1.name);
    }
    async getMemberStatus(openid) {
        const { data, error } = await supabase
            .from('member_purchases')
            .select('*')
            .eq('openid', openid)
            .eq('status', 'paid');
        if (error) {
            this.logger.error('获取会员状态失败:', error);
            return {
                isMember: false,
                features: {
                    aiWelcomePage: false,
                    ledgerExport: false,
                    customCover: false,
                    giftReminder: false,
                },
            };
        }
        const features = {
            aiWelcomePage: false,
            ledgerExport: false,
            customCover: false,
            giftReminder: false,
        };
        if (data && data.length > 0) {
            for (const purchase of data) {
                if (purchase.feature_id === 'aiWelcomePage')
                    features.aiWelcomePage = true;
                if (purchase.feature_id === 'ledgerExport')
                    features.ledgerExport = true;
                if (purchase.feature_id === 'customCover')
                    features.customCover = true;
                if (purchase.feature_id === 'giftReminder')
                    features.giftReminder = true;
            }
        }
        const isMember = features.aiWelcomePage ||
            features.ledgerExport ||
            features.customCover ||
            features.giftReminder;
        return {
            isMember,
            features,
        };
    }
    async createPurchaseOrder(openid, featureId, amount, mockPay = false) {
        const { data: existing } = await supabase
            .from('member_purchases')
            .select('*')
            .eq('openid', openid)
            .eq('feature_id', featureId)
            .eq('status', 'paid')
            .single();
        if (existing) {
            throw new Error('您已购买该功能');
        }
        const orderId = `MP${Date.now()}${Math.random().toString(36).substr(2, 6)}`;
        const { data, error } = await supabase
            .from('member_purchases')
            .insert({
            openid,
            feature_id: featureId,
            amount,
            status: mockPay ? 'paid' : 'pending',
            payment_order_id: orderId,
        })
            .select()
            .single();
        if (error) {
            this.logger.error('创建订单失败:', error);
            throw new Error(error.message);
        }
        return {
            orderId,
            timeStamp: String(Math.floor(Date.now() / 1000)),
            nonceStr: Math.random().toString(36).substr(2, 32),
            package: `prepay_id=wx${Date.now()}`,
            signType: 'MD5',
            paySign: 'mock_sign',
            paid: mockPay,
        };
    }
    async handlePaymentSuccess(orderId) {
        const { error } = await supabase
            .from('member_purchases')
            .update({
            status: 'paid',
            updated_at: new Date().toISOString(),
        })
            .eq('payment_order_id', orderId);
        if (error) {
            this.logger.error('更新订单状态失败:', error);
            throw new Error(error.message);
        }
        return { success: true };
    }
    async checkFeatureUnlocked(openid, featureId) {
        const { data, error } = await supabase
            .from('member_purchases')
            .select('*')
            .eq('openid', openid)
            .eq('feature_id', featureId)
            .eq('status', 'paid')
            .single();
        if (error)
            return false;
        return !!data;
    }
};
exports.MemberService = MemberService;
exports.MemberService = MemberService = MemberService_1 = __decorate([
    (0, common_1.Injectable)()
], MemberService);
//# sourceMappingURL=member.service.js.map