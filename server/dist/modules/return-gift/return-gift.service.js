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
var ReturnGiftService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReturnGiftService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const supabase_client_1 = require("../../storage/database/supabase-client");
const wechat_pay_service_1 = require("../wechat-pay/wechat-pay.service");
const wechat_subscribe_service_1 = require("../wechat-subscribe/wechat-subscribe.service");
const supabase = (0, supabase_client_1.getSupabaseClient)();
const CACHE_TTL = 5 * 60 * 1000;
const settingsCache = new Map();
let ReturnGiftService = ReturnGiftService_1 = class ReturnGiftService {
    constructor(wechatPayService, wechatSubscribeService) {
        this.wechatPayService = wechatPayService;
        this.wechatSubscribeService = wechatSubscribeService;
        this.logger = new common_1.Logger(ReturnGiftService_1.name);
    }
    async saveReturnGiftSettings(banquetId, settings) {
        this.logger.log(`保存回礼设置: banquetId=${banquetId}`);
        const { data: existing } = await supabase
            .from('return_gift_settings')
            .select('*')
            .eq('banquet_id', banquetId)
            .single();
        let result;
        if (existing) {
            const { data, error } = await supabase
                .from('return_gift_settings')
                .update({
                ...settings,
                updated_at: new Date().toISOString(),
            })
                .eq('banquet_id', banquetId)
                .select()
                .single();
            if (error) {
                this.logger.error('更新回礼设置失败:', error);
                throw new Error(error.message);
            }
            result = data;
        }
        else {
            const { data, error } = await supabase
                .from('return_gift_settings')
                .insert({
                banquet_id: banquetId,
                ...settings,
            })
                .select()
                .single();
            if (error) {
                this.logger.error('创建回礼设置失败:', error);
                throw new Error(error.message);
            }
            result = data;
        }
        settingsCache.delete(banquetId);
        this.logger.log(`已清除回礼设置缓存: banquetId=${banquetId}`);
        return result;
    }
    async getReturnGiftSettings(banquetId) {
        const cached = settingsCache.get(banquetId);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            this.logger.log(`从缓存读取回礼设置: banquetId=${banquetId}`);
            return cached.data;
        }
        const { data, error } = await supabase
            .from('return_gift_settings')
            .select('*')
            .eq('banquet_id', banquetId)
            .single();
        if (data) {
            settingsCache.set(banquetId, { data, timestamp: Date.now() });
            return data;
        }
        if (error && error.code === 'PGRST116') {
            this.logger.log(`return_gift_settings 不存在，尝试从 banquets.return_gift_config 读取: ${banquetId}`);
            const { data: banquet, error: banquetError } = await supabase
                .from('banquets')
                .select('return_gift_config')
                .eq('id', banquetId)
                .single();
            if (banquetError || !banquet) {
                this.logger.error('获取宴会回礼配置失败:', banquetError);
                return null;
            }
            const config = banquet.return_gift_config;
            if (!config) {
                return null;
            }
            return {
                id: '',
                banquet_id: banquetId,
                red_packet_enabled: config.red_packet_enabled || false,
                red_packet_amount: config.red_packet_amount || 0,
                mall_gift_enabled: config.mall_gift_enabled || false,
                mall_gift_items: config.mall_gift_items || [],
                onsite_gift_enabled: config.onsite_gift_enabled || false,
                onsite_gift_items: config.onsite_gift_items || [],
                gift_claim_mode: 'all',
                total_budget: 0,
                created_at: '',
                updated_at: '',
            };
        }
        this.logger.error('获取回礼设置失败:', error);
        return null;
    }
    async triggerReturnGift(giftRecordId) {
        this.logger.log(`触发回礼: giftRecordId=${giftRecordId}`);
        const { data: giftRecord, error: giftError } = await supabase
            .from('gift_records')
            .select('*, banquets(*)')
            .eq('id', giftRecordId)
            .single();
        if (giftError || !giftRecord) {
            throw new Error('随礼记录不存在');
        }
        const settings = await this.getReturnGiftSettings(giftRecord.banquet_id);
        if (!settings) {
            this.logger.log('未配置回礼设置，跳过回礼');
            return null;
        }
        const giftAmount = giftRecord.amount || 0;
        const threshold = settings.gift_threshold || 0;
        if (threshold > 0 && giftAmount < threshold) {
            this.logger.log(`随礼金额(${giftAmount}分)未达门槛(${threshold}分)，不触发回礼`);
            return null;
        }
        const mallGiftTotalValue = settings.mall_gift_enabled && settings.mall_gift_items?.length > 0
            ? settings.mall_gift_items.reduce((sum, item) => sum + (item.product_price || 0), 0)
            : 0;
        const onsiteGiftTotalValue = settings.onsite_gift_enabled && settings.onsite_gift_items?.length > 0
            ? settings.onsite_gift_items.reduce((sum, item) => sum + (item.price || 0), 0)
            : 0;
        let singleGiftTotalValue = 0;
        if (settings.gift_claim_mode === 'choose_one') {
            singleGiftTotalValue = Math.max(mallGiftTotalValue, onsiteGiftTotalValue);
        }
        else {
            singleGiftTotalValue = mallGiftTotalValue + onsiteGiftTotalValue;
        }
        if (singleGiftTotalValue > 0 && giftAmount < singleGiftTotalValue) {
            this.logger.log(`随礼金额(${giftAmount}分)小于回礼总价值(${singleGiftTotalValue}分)，不触发回礼`);
            return null;
        }
        const { data: existingGift } = await supabase
            .from('guest_return_gifts')
            .select('*')
            .eq('gift_record_id', giftRecordId)
            .single();
        if (existingGift) {
            this.logger.log('回礼记录已存在');
            return existingGift;
        }
        const returnGiftData = {
            gift_record_id: giftRecordId,
            banquet_id: giftRecord.banquet_id,
            guest_openid: giftRecord.guest_openid,
            status: 'pending',
        };
        if (settings.red_packet_enabled && settings.red_packet_amount > 0) {
            returnGiftData.red_packet_amount = settings.red_packet_amount;
            returnGiftData.red_packet_status = 'pending';
        }
        const { data: returnGift, error: insertError } = await supabase
            .from('guest_return_gifts')
            .insert(returnGiftData)
            .select()
            .single();
        if (insertError) {
            this.logger.error('创建回礼记录失败:', insertError);
            throw new Error('创建回礼记录失败');
        }
        if (settings.red_packet_enabled && settings.red_packet_amount > 0) {
            await this.sendRedPacket(returnGift.id, giftRecord.guest_openid, settings.red_packet_amount);
        }
        await supabase
            .from('gift_records')
            .update({ return_gift_status: 'eligible' })
            .eq('id', giftRecordId);
        return returnGift;
    }
    async sendRedPacket(returnGiftId, openid, amount) {
        this.logger.log(`发送微信红包: returnGiftId=${returnGiftId}, openid=${openid}, amount=${amount}`);
        try {
            const { data: returnGift, error: returnGiftError } = await supabase
                .from('guest_return_gifts')
                .select('*, banquets(host_openid, name)')
                .eq('id', returnGiftId)
                .single();
            if (returnGiftError || !returnGift) {
                throw new Error('回礼记录不存在');
            }
            const banquet = returnGift.banquets;
            const hostOpenid = banquet?.host_openid;
            const banquetName = banquet?.name || '宴会';
            if (!hostOpenid) {
                throw new Error('无法获取主办方信息');
            }
            const { data: hostBalance, error: balanceError } = await supabase
                .from('host_balances')
                .select('*')
                .eq('openid', hostOpenid)
                .single();
            if (balanceError || !hostBalance) {
                throw new Error('主办方未开通余额账户，请先充值');
            }
            const availableBalance = hostBalance.balance - hostBalance.frozen_balance;
            if (availableBalance < amount) {
                throw new Error(`余额不足，当前可用余额${(availableBalance / 100).toFixed(2)}元，需要${(amount / 100).toFixed(2)}元`);
            }
            const { error: freezeError } = await supabase
                .from('host_balances')
                .update({
                frozen_balance: hostBalance.frozen_balance + amount,
                updated_at: new Date().toISOString(),
            })
                .eq('openid', hostOpenid);
            if (freezeError) {
                throw new Error('冻结余额失败');
            }
            this.logger.log(`已冻结主办方余额: openid=${hostOpenid}, amount=${amount}`);
            const description = `【${banquetName}】回礼红包`;
            const transferResult = await this.wechatPayService.transferToBalance({
                openid,
                amount,
                description,
                orderId: `RP${returnGiftId.replace(/-/g, '')}`,
            });
            if (transferResult.success) {
                const { data: latestBalance } = await supabase
                    .from('host_balances')
                    .select('*')
                    .eq('openid', hostOpenid)
                    .single();
                if (latestBalance) {
                    await supabase
                        .from('host_balances')
                        .update({
                        balance: latestBalance.balance - amount,
                        frozen_balance: latestBalance.frozen_balance - amount,
                        total_spent: latestBalance.total_spent + amount,
                        updated_at: new Date().toISOString(),
                    })
                        .eq('openid', hostOpenid);
                }
                await supabase.from('balance_logs').insert({
                    openid: hostOpenid,
                    type: 'red_packet',
                    amount: -amount,
                    balance_after: (latestBalance?.balance || 0) - amount,
                    description: `发放回礼红包（${banquetName}）`,
                    order_id: returnGiftId,
                });
                await supabase
                    .from('guest_return_gifts')
                    .update({
                    red_packet_status: 'sent',
                    red_packet_sent_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                    .eq('id', returnGiftId);
                await supabase.from('red_packet_logs').insert({
                    guest_return_gift_id: returnGiftId,
                    amount,
                    openid,
                    host_openid: hostOpenid,
                    status: 'sent',
                    payment_no: transferResult.paymentNo,
                    sent_at: new Date().toISOString(),
                });
                this.logger.log(`微信红包发送成功: paymentNo=${transferResult.paymentNo}`);
                return { success: true, paymentNo: transferResult.paymentNo };
            }
            else {
                const { data: latestBalance } = await supabase
                    .from('host_balances')
                    .select('*')
                    .eq('openid', hostOpenid)
                    .single();
                if (latestBalance) {
                    await supabase
                        .from('host_balances')
                        .update({
                        frozen_balance: latestBalance.frozen_balance - amount,
                        updated_at: new Date().toISOString(),
                    })
                        .eq('openid', hostOpenid);
                }
                throw new Error(transferResult.errorMsg || '转账失败');
            }
        }
        catch (error) {
            this.logger.error('发送微信红包失败:', error);
            await supabase
                .from('guest_return_gifts')
                .update({
                red_packet_status: 'failed',
                red_packet_error_msg: error.message || '发送失败',
                updated_at: new Date().toISOString(),
            })
                .eq('id', returnGiftId);
            await supabase.from('red_packet_logs').insert({
                guest_return_gift_id: returnGiftId,
                amount,
                openid,
                status: 'failed',
                error_msg: error.message || '发送失败',
            });
            return { success: false, error: error.message };
        }
    }
    async claimMallGift(returnGiftId, claimType, deliveryInfo) {
        this.logger.log(`领取商城礼品: returnGiftId=${returnGiftId}, claimType=${claimType}`);
        const { data: returnGift, error } = await supabase
            .from('guest_return_gifts')
            .select('*, banquets(*)')
            .eq('id', returnGiftId)
            .single();
        if (error || !returnGift) {
            throw new Error('回礼记录不存在');
        }
        if (returnGift.mall_gift_claimed) {
            throw new Error('商城礼品已领取');
        }
        const settings = await this.getReturnGiftSettings(returnGift.banquet_id);
        if (!settings || !settings.mall_gift_enabled) {
            throw new Error('未配置商城礼品');
        }
        if (settings.gift_claim_mode === 'choose_one') {
            if (returnGift.onsite_gift_claimed) {
                throw new Error('您已选择领取现场礼品，不能再领取商城礼品');
            }
        }
        const availableGift = settings.mall_gift_items.find((item) => item.remaining_count > 0);
        if (!availableGift) {
            throw new Error('商城礼品已领完');
        }
        const updateData = {
            mall_gift_claimed: true,
            mall_product_id: availableGift.product_id,
            mall_product_name: availableGift.product_name,
            mall_product_price: availableGift.product_price,
            mall_product_image: availableGift.product_image,
            mall_claim_type: claimType,
            updated_at: new Date().toISOString(),
        };
        if (claimType === 'delivery' && deliveryInfo) {
            updateData.recipient_name = deliveryInfo.name;
            updateData.recipient_phone = deliveryInfo.phone;
            updateData.recipient_address = deliveryInfo.address;
            updateData.delivery_status = 'pending';
            updateData.estimated_ship_time = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        }
        const { error: updateError } = await supabase
            .from('guest_return_gifts')
            .update(updateData)
            .eq('id', returnGiftId);
        if (updateError) {
            throw new Error('领取失败');
        }
        const updatedItems = settings.mall_gift_items.map((item) => {
            if (item.product_id === availableGift.product_id) {
                return { ...item, remaining_count: item.remaining_count - 1 };
            }
            return item;
        });
        await supabase
            .from('return_gift_settings')
            .update({ mall_gift_items: updatedItems })
            .eq('banquet_id', returnGift.banquet_id);
        const claimedItem = updatedItems.find((item) => item.product_id === availableGift.product_id);
        if (claimedItem && claimedItem.total_count > 0) {
            const remainingPercentage = (claimedItem.remaining_count / claimedItem.total_count) * 100;
            if (remainingPercentage <= 5 && remainingPercentage > 0) {
                this.sendMallGiftStockWarning(returnGift.banquet_id, claimedItem).catch((err) => {
                    this.logger.error('发送库存预警通知失败:', err.message);
                });
            }
        }
        await this.updateReturnGiftStatus(returnGiftId);
        return {
            success: true,
            gift: {
                product_id: availableGift.product_id,
                product_name: availableGift.product_name,
                product_price: availableGift.product_price,
                product_image: availableGift.product_image,
                claim_type: claimType,
            },
        };
    }
    async claimOnsiteGift(returnGiftId) {
        this.logger.log(`领取现场礼品: returnGiftId=${returnGiftId}`);
        const { data: returnGift, error } = await supabase
            .from('guest_return_gifts')
            .select('*, banquets(*)')
            .eq('id', returnGiftId)
            .single();
        if (error || !returnGift) {
            throw new Error('回礼记录不存在');
        }
        if (returnGift.onsite_gift_claimed) {
            throw new Error('现场礼品已领取');
        }
        const settings = await this.getReturnGiftSettings(returnGift.banquet_id);
        if (!settings || !settings.onsite_gift_enabled) {
            throw new Error('未配置现场礼品');
        }
        if (settings.gift_claim_mode === 'choose_one') {
            if (returnGift.mall_gift_claimed) {
                throw new Error('您已选择领取商城礼品，不能再领取现场礼品');
            }
        }
        const availableGift = settings.onsite_gift_items.find((item) => item.remaining_count > 0);
        if (!availableGift) {
            throw new Error('现场礼品已领完');
        }
        const exchangeCode = this.generateExchangeCode();
        const updateData = {
            onsite_gift_claimed: true,
            onsite_gift_id: availableGift.id,
            onsite_gift_name: availableGift.name,
            onsite_gift_image: availableGift.image,
            onsite_gift_price: availableGift.price,
            exchange_code: exchangeCode,
            exchange_status: 'pending',
            updated_at: new Date().toISOString(),
        };
        const { error: updateError } = await supabase
            .from('guest_return_gifts')
            .update(updateData)
            .eq('id', returnGiftId);
        if (updateError) {
            throw new Error('领取失败');
        }
        const updatedItems = settings.onsite_gift_items.map((item) => {
            if (item.id === availableGift.id) {
                return { ...item, remaining_count: item.remaining_count - 1 };
            }
            return item;
        });
        await supabase
            .from('return_gift_settings')
            .update({ onsite_gift_items: updatedItems })
            .eq('banquet_id', returnGift.banquet_id);
        await this.updateReturnGiftStatus(returnGiftId);
        return {
            success: true,
            gift: {
                id: availableGift.id,
                name: availableGift.name,
                image: availableGift.image,
                price: availableGift.price,
                exchange_code: exchangeCode,
            },
        };
    }
    async exchangeOnsiteGift(exchangeCode) {
        this.logger.log(`核销现场礼品: exchangeCode=${exchangeCode}`);
        const { data: returnGift, error } = await supabase
            .from('guest_return_gifts')
            .select('*, banquets(*)')
            .eq('exchange_code', exchangeCode)
            .single();
        if (error || !returnGift) {
            throw new Error('兑换码无效');
        }
        if (returnGift.exchange_status === 'exchanged') {
            throw new Error('礼品已核销');
        }
        if (returnGift.exchange_status === 'expired') {
            throw new Error('兑换码已过期');
        }
        const banquet = returnGift.banquets;
        const eventDate = new Date(banquet.event_time).toDateString();
        const today = new Date().toDateString();
        if (eventDate !== today) {
            await supabase
                .from('guest_return_gifts')
                .update({
                exchange_status: 'expired',
                updated_at: new Date().toISOString(),
            })
                .eq('id', returnGift.id);
            throw new Error('兑换码已过期，现场礼品仅限宴会当天有效');
        }
        const { error: updateError } = await supabase
            .from('guest_return_gifts')
            .update({
            exchange_status: 'exchanged',
            exchanged_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
            .eq('id', returnGift.id);
        if (updateError) {
            throw new Error('核销失败');
        }
        return {
            success: true,
            gift: {
                name: returnGift.onsite_gift_name,
                image: returnGift.onsite_gift_image,
                price: returnGift.onsite_gift_price,
            },
        };
    }
    async exchangeOnsiteGiftWithAuth(exchangeCode, verifierWechat, verifierOpenid) {
        this.logger.log(`核销现场礼品(带身份验证): exchangeCode=${exchangeCode}, verifierWechat=${verifierWechat}`);
        const { data: returnGift, error } = await supabase
            .from('guest_return_gifts')
            .select('*, banquets(*)')
            .eq('exchange_code', exchangeCode)
            .single();
        if (error || !returnGift) {
            await this.logRedemptionAttempt('', returnGift?.id || '', exchangeCode, verifierWechat, verifierOpenid, 'invalid', '兑换码无效');
            throw new Error('兑换码无效');
        }
        const banquet = returnGift.banquets;
        const staffWechat = banquet?.staff_wechat;
        if (staffWechat && staffWechat.trim() !== '') {
            if (verifierWechat !== staffWechat) {
                await this.logRedemptionAttempt(banquet.id, returnGift.id, exchangeCode, verifierWechat, verifierOpenid, 'unauthorized', '非指定工作人员，无权核销');
                throw new Error('非指定工作人员，无权核销此礼品');
            }
        }
        if (returnGift.exchange_status === 'exchanged') {
            await this.logRedemptionAttempt(banquet.id, returnGift.id, exchangeCode, verifierWechat, verifierOpenid, 'already_redemption', '礼品已核销');
            throw new Error('礼品已核销');
        }
        if (returnGift.exchange_status === 'expired') {
            await this.logRedemptionAttempt(banquet.id, returnGift.id, exchangeCode, verifierWechat, verifierOpenid, 'invalid', '兑换码已过期');
            throw new Error('兑换码已过期');
        }
        const eventDate = new Date(banquet.event_time).toDateString();
        const today = new Date().toDateString();
        if (eventDate !== today) {
            await supabase
                .from('guest_return_gifts')
                .update({
                exchange_status: 'expired',
                updated_at: new Date().toISOString(),
            })
                .eq('id', returnGift.id);
            await this.logRedemptionAttempt(banquet.id, returnGift.id, exchangeCode, verifierWechat, verifierOpenid, 'invalid', '兑换码已过期，现场礼品仅限宴会当天有效');
            throw new Error('兑换码已过期，现场礼品仅限宴会当天有效');
        }
        const { error: updateError } = await supabase
            .from('guest_return_gifts')
            .update({
            exchange_status: 'exchanged',
            exchanged_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
            .eq('id', returnGift.id);
        if (updateError) {
            await this.logRedemptionAttempt(banquet.id, returnGift.id, exchangeCode, verifierWechat, verifierOpenid, 'error', '核销失败');
            throw new Error('核销失败');
        }
        await this.logRedemptionAttempt(banquet.id, returnGift.id, exchangeCode, verifierWechat, verifierOpenid, 'success', '');
        return {
            success: true,
            gift: {
                name: returnGift.onsite_gift_name,
                image: returnGift.onsite_gift_image,
                price: returnGift.onsite_gift_price,
                guestName: returnGift.guest_name,
            },
            banquet: {
                name: banquet.name,
                type: banquet.type,
            },
        };
    }
    async logRedemptionAttempt(banquetId, returnGiftId, exchangeCode, verifierWechat, verifierOpenid, status, errorMessage) {
        try {
            await supabase.from('gift_redemption_logs').insert({
                banquet_id: banquetId,
                return_gift_id: returnGiftId,
                exchange_code: exchangeCode,
                verifier_wechat: verifierWechat,
                verifier_openid: verifierOpenid || null,
                redemption_status: status,
                error_message: errorMessage || null,
                created_at: new Date().toISOString(),
            });
        }
        catch (err) {
            this.logger.warn(`记录核销日志失败: ${err.message}`);
        }
    }
    async getGuestReturnGift(giftRecordId) {
        const { data: giftRecord, error: giftError } = await supabase
            .from('gift_records')
            .select('*')
            .eq('id', giftRecordId)
            .single();
        if (giftError || !giftRecord) {
            return null;
        }
        const { data: returnGift, error } = await supabase
            .from('guest_return_gifts')
            .select('*')
            .eq('gift_record_id', giftRecordId)
            .single();
        if (error) {
            return null;
        }
        const settings = await this.getReturnGiftSettings(returnGift.banquet_id);
        let totalReturnValue = 0;
        if (settings) {
            if (settings.red_packet_enabled) {
                totalReturnValue += settings.red_packet_amount || 0;
            }
            if (settings.mall_gift_enabled && settings.mall_gift_items?.length > 0) {
                totalReturnValue += settings.mall_gift_items[0].product_price || 0;
            }
            if (settings.onsite_gift_enabled && settings.onsite_gift_items?.length > 0) {
                totalReturnValue += settings.onsite_gift_items[0].price || 0;
            }
        }
        const guestAmount = giftRecord.amount || 0;
        const isEligible = guestAmount > totalReturnValue;
        return {
            ...returnGift,
            guest_amount: guestAmount,
            total_return_value: totalReturnValue,
            is_eligible: isEligible,
            settings: settings
                ? {
                    red_packet_enabled: settings.red_packet_enabled,
                    red_packet_amount: settings.red_packet_amount,
                    mall_gift_enabled: settings.mall_gift_enabled,
                    mall_gift_items: settings.mall_gift_items,
                    onsite_gift_enabled: settings.onsite_gift_enabled,
                    onsite_gift_items: settings.onsite_gift_items,
                }
                : null,
        };
    }
    async updateReturnGiftStatus(returnGiftId) {
        const { data: returnGift } = await supabase
            .from('guest_return_gifts')
            .select('*')
            .eq('id', returnGiftId)
            .single();
        if (!returnGift)
            return;
        let status = 'pending';
        const hasRedPacket = returnGift.red_packet_amount > 0;
        const redPacketDone = !hasRedPacket || returnGift.red_packet_status === 'sent';
        const mallGiftDone = !returnGift.mall_gift_claimed || returnGift.delivery_status === 'delivered';
        const onsiteGiftDone = !returnGift.onsite_gift_claimed || returnGift.exchange_status === 'exchanged';
        if (redPacketDone && mallGiftDone && onsiteGiftDone) {
            status = 'completed';
        }
        else if (returnGift.mall_gift_claimed || returnGift.onsite_gift_claimed) {
            status = 'partially_claimed';
        }
        await supabase
            .from('guest_return_gifts')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', returnGiftId);
    }
    generateExchangeCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    async getUnclaimedGiftsStats(banquetId) {
        const settings = await this.getReturnGiftSettings(banquetId);
        if (!settings)
            return null;
        const mallStats = settings.mall_gift_items.map((item) => ({
            product_id: item.product_id,
            product_name: item.product_name,
            total: item.total_count,
            remaining: item.remaining_count,
            claimed: item.total_count - item.remaining_count,
        }));
        const onsiteStats = settings.onsite_gift_items.map((item) => ({
            id: item.id,
            name: item.name,
            total: item.total_count,
            remaining: item.remaining_count,
            claimed: item.total_count - item.remaining_count,
        }));
        return {
            mall_gifts: mallStats,
            onsite_gifts: onsiteStats,
            total_unclaimed_value: this.calculateUnclaimedValue(settings),
        };
    }
    calculateUnclaimedValue(settings) {
        let value = 0;
        settings.mall_gift_items.forEach((item) => {
            value += item.product_price * item.remaining_count;
        });
        settings.onsite_gift_items.forEach((item) => {
            value += item.price * item.remaining_count;
        });
        return value;
    }
    async refundUnclaimedGifts(banquetId) {
        this.logger.log(`退还未领取礼品: banquetId=${banquetId}`);
        const { data: banquet, error: banquetError } = await supabase
            .from('banquets')
            .select('host_openid, name, mall_gift_pay_no, mall_gift_pay_amount')
            .eq('id', banquetId)
            .single();
        if (banquetError || !banquet) {
            return { success: false, message: '宴会不存在' };
        }
        const hostOpenid = banquet.host_openid;
        const settings = await this.getReturnGiftSettings(banquetId);
        if (!settings)
            return { success: false, message: '未找到回礼设置' };
        const { data: guestRecords } = await supabase
            .from('guest_return_gifts')
            .select('mall_gift_claimed, mall_claim_type, delivery_status, mall_product_id, mall_product_price')
            .eq('banquet_id', banquetId)
            .eq('mall_gift_claimed', true);
        const claimedButNotShipped = {};
        if (guestRecords) {
            for (const record of guestRecords) {
                if (record.mall_claim_type === 'delivery' && record.delivery_status === 'pending') {
                    const key = record.mall_product_id;
                    claimedButNotShipped[key] = (claimedButNotShipped[key] || 0) + 1;
                }
            }
        }
        let refundAmount = 0;
        let cannotRefundAmount = 0;
        const refundDetails = [];
        const cannotRefundDetails = [];
        if (settings.mall_gift_enabled && settings.mall_gift_items?.length > 0) {
            for (const item of settings.mall_gift_items) {
                const unclaimedCount = item.remaining_count;
                const claimedNotShippedCount = claimedButNotShipped[item.product_id] || 0;
                if (unclaimedCount > 0) {
                    const itemValue = item.product_price * unclaimedCount;
                    refundAmount += itemValue;
                    refundDetails.push({
                        product_name: item.product_name,
                        refund_count: unclaimedCount,
                        refund_value: itemValue,
                    });
                }
                if (claimedNotShippedCount > 0) {
                    const itemValue = item.product_price * claimedNotShippedCount;
                    cannotRefundAmount += itemValue;
                    cannotRefundDetails.push({
                        product_name: item.product_name,
                        count: claimedNotShippedCount,
                        value: itemValue,
                    });
                }
            }
        }
        if (refundAmount <= 0) {
            return {
                success: true,
                message: '无未领取的商城礼品可退款',
                refund_amount: 0,
                cannot_refund_amount: cannotRefundAmount,
                cannot_refund_details: cannotRefundDetails,
            };
        }
        if (banquet.mall_gift_pay_no && refundAmount > 0) {
            try {
                const refundId = `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const refundResult = await this.wechatPayService.refund({
                    orderId: banquet.mall_gift_pay_no,
                    refundId: refundId,
                    totalAmount: banquet.mall_gift_pay_amount || refundAmount,
                    refundAmount: refundAmount,
                    reason: `宴会「${banquet.name}」未领取商城礼品退款`,
                });
                if (!refundResult.success) {
                    this.logger.error('微信退款失败:', refundResult.message);
                    return {
                        success: false,
                        message: refundResult.message || '退款失败',
                        cannot_refund_amount: cannotRefundAmount,
                        cannot_refund_details: cannotRefundDetails,
                    };
                }
                this.logger.log(`微信退款成功: refundId=${refundId}, amount=${refundAmount}`);
            }
            catch (error) {
                this.logger.error('调用微信退款异常:', error);
                return {
                    success: false,
                    message: '退款失败，请稍后重试',
                    cannot_refund_amount: cannotRefundAmount,
                    cannot_refund_details: cannotRefundDetails,
                };
            }
        }
        await supabase.from('balance_logs').insert({
            openid: hostOpenid,
            type: 'gift_refund',
            amount: refundAmount,
            balance_after: 0,
            description: `宴会「${banquet.name}」未领取商城礼品原路退款`,
            order_id: banquetId,
        });
        await supabase
            .from('return_gift_settings')
            .update({
            refund_status: 'completed',
            refund_amount: refundAmount,
            refunded_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
            .eq('banquet_id', banquetId);
        this.logger.log(`已退款商城礼品金额: ${refundAmount}分，原路退回，宴会: ${banquetId}`);
        let message = `已退还 ¥${(refundAmount / 100).toFixed(2)} 到原支付账户`;
        if (cannotRefundAmount > 0) {
            message += `。另有 ¥${(cannotRefundAmount / 100).toFixed(2)} 为嘉宾已领取但未发货的礼品，无法退款`;
        }
        return {
            success: true,
            refund_amount: refundAmount,
            refund_details: refundDetails,
            cannot_refund_amount: cannotRefundAmount,
            cannot_refund_details: cannotRefundDetails,
            message,
        };
    }
    async sendMallGiftStockWarning(banquetId, giftItem) {
        this.logger.log(`发送商城礼品库存预警: banquetId=${banquetId}, product=${giftItem.product_name}`);
        try {
            const { data: banquet, error } = await supabase
                .from('banquets')
                .select('host_openid, name')
                .eq('id', banquetId)
                .single();
            if (error || !banquet) {
                this.logger.error('获取宴会信息失败:', error);
                return;
            }
            const remainingPercentage = ((giftItem.remaining_count / giftItem.total_count) * 100).toFixed(1);
            await this.wechatSubscribeService.sendStockWarning({
                openid: banquet.host_openid,
                banquetName: banquet.name,
                productName: giftItem.product_name,
                totalCount: giftItem.total_count,
                remainingCount: giftItem.remaining_count,
                remainingPercentage,
            });
            this.logger.log(`库存预警通知已发送: openid=${banquet.host_openid}, product=${giftItem.product_name}`);
        }
        catch (error) {
            this.logger.error('发送库存预警通知异常:', error.message);
        }
    }
    async autoConfirmShipment() {
        this.logger.log('开始执行自动确认发货检查...');
        try {
            const now = new Date().toISOString();
            const { data: pendingOrders, error: queryError } = await supabase
                .from('guest_return_gifts')
                .select('*')
                .eq('dropship_status', 'none')
                .not('estimated_ship_time', 'is', null)
                .lt('estimated_ship_time', now)
                .in('need_delivery', [true]);
            if (queryError) {
                this.logger.error('查询待发货订单失败:', queryError);
                return { success: false, message: '查询失败', count: 0 };
            }
            if (!pendingOrders || pendingOrders.length === 0) {
                this.logger.log('没有需要自动发货的订单');
                return { success: true, message: '无待处理订单', count: 0 };
            }
            this.logger.log(`发现 ${pendingOrders.length} 个待自动发货的订单`);
            const autoShipTime = now;
            const { data: updated, error: updateError } = await supabase
                .from('guest_return_gifts')
                .update({
                dropship_status: 'shipped',
                alibaba_1688_order_id: `AUTO_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                updated_at: autoShipTime,
            })
                .in('id', pendingOrders.map((o) => o.id))
                .select();
            if (updateError) {
                this.logger.error('批量更新发货状态失败:', updateError);
                return { success: false, message: '更新失败', count: 0 };
            }
            this.logger.log(`自动发货完成: ${updated?.length || 0} 个订单已标记为已发货`);
            for (const order of pendingOrders) {
                this.sendAutoShipNotice(order).catch((err) => {
                    this.logger.error(`发送自动发货通知失败: orderId=${order.id}`, err.message);
                });
            }
            return {
                success: true,
                message: `已自动发货 ${updated?.length || 0} 个订单`,
                count: updated?.length || 0,
            };
        }
        catch (error) {
            this.logger.error('自动确认发货异常:', error);
            return { success: false, message: error.message, count: 0 };
        }
    }
    async sendAutoShipNotice(order) {
        try {
            const { data: giftRecord } = await supabase
                .from('gift_records')
                .select('guest_openid, banquet_id')
                .eq('id', order.gift_record_id)
                .single();
            if (!giftRecord?.guest_openid) {
                this.logger.warn(`未找到嘉宾openid: orderId=${order.id}`);
                return;
            }
            let banquetName = '宴会';
            if (giftRecord.banquet_id) {
                const { data: banquetData } = await supabase
                    .from('banquets')
                    .select('name')
                    .eq('id', giftRecord.banquet_id)
                    .single();
                banquetName = banquetData?.name || '宴会';
            }
            await this.wechatSubscribeService.sendDeliveryReminder({
                openid: giftRecord.guest_openid,
                banquetName,
                productName: order.product_name || '商城礼品',
                claimedAt: new Date().toLocaleDateString('zh-CN'),
            });
            this.logger.log(`自动发货通知已发送: guest=${giftRecord.guest_openid}`);
        }
        catch (error) {
            this.logger.error('发送自动发货通知异常:', error.message);
        }
    }
    async getPendingShipOrders() {
        try {
            const { data, error } = await supabase
                .from('guest_return_gifts')
                .select(`
          *,
          gift_records!inner(
            guest_openid,
            banquets(name, host_openid)
          )
        `)
                .eq('dropship_status', 'none')
                .eq('need_delivery', true)
                .not('recipient_name', 'is', null)
                .order('estimated_ship_time', { ascending: true });
            if (error) {
                throw error;
            }
            return {
                success: true,
                data: data || [],
            };
        }
        catch (error) {
            this.logger.error('获取待发货订单失败:', error);
            return { success: false, message: error.message, data: [] };
        }
    }
    async sendDeliveryReminderNotices() {
        this.logger.log('开始执行收货信息填写提醒检查...');
        try {
            const now = new Date();
            const { data: pendingRecords, error: queryError } = await supabase
                .from('return_gifts')
                .select(`
          *,
          gift_records!inner(
            guest_openid,
            banquets(name, event_time)
          )
        `)
                .eq('need_delivery', true)
                .or(`recipient_name.is.null,recipient_phone.is.null,recipient_address.is.null`)
                .order('claimed_at', { ascending: true });
            if (queryError) {
                this.logger.error('查询未填写收货信息记录失败:', queryError);
                return { success: false, message: '查询失败', count: 0 };
            }
            if (!pendingRecords || pendingRecords.length === 0) {
                this.logger.log('没有需要提醒的记录');
                return { success: true, message: '无待提醒记录', count: 0 };
            }
            this.logger.log(`发现 ${pendingRecords.length} 条未填写收货信息的记录`);
            let sentCount = 0;
            const nowTimestamp = now.toISOString();
            for (const record of pendingRecords) {
                const guestOpenid = record.gift_records?.guest_openid;
                const banquetName = record.gift_records?.banquets?.name || '宴会';
                const productName = record.gift_ids?.[0]?.product_name || '商城礼品';
                const claimedAt = record.claimed_at || record.created_at;
                if (!guestOpenid) {
                    this.logger.warn(`未找到嘉宾openid: recordId=${record.id}`);
                    continue;
                }
                const lastReminder = record.last_reminder_at;
                if (lastReminder) {
                    const lastReminderDate = new Date(lastReminder);
                    const hoursSinceLastReminder = (now.getTime() - lastReminderDate.getTime()) / (1000 * 60 * 60);
                    if (hoursSinceLastReminder < 24) {
                        this.logger.log(`跳过提醒（24小时内已发送）: recordId=${record.id}`);
                        continue;
                    }
                }
                const result = await this.wechatSubscribeService.sendDeliveryReminder({
                    openid: guestOpenid,
                    banquetName,
                    productName,
                    claimedAt,
                });
                if (result.success) {
                    await supabase
                        .from('return_gifts')
                        .update({
                        delivery_reminder_sent: true,
                        delivery_reminder_count: (record.delivery_reminder_count || 0) + 1,
                        last_reminder_at: nowTimestamp,
                    })
                        .eq('id', record.id);
                    sentCount++;
                    this.logger.log(`提醒发送成功: openid=${guestOpenid}, recordId=${record.id}`);
                }
                else {
                    this.logger.warn(`提醒发送失败: openid=${guestOpenid}, recordId=${record.id}`);
                }
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
            this.logger.log(`收货信息填写提醒完成: 发送 ${sentCount} 条`);
            return {
                success: true,
                message: `已发送 ${sentCount} 条提醒`,
                count: sentCount,
            };
        }
        catch (error) {
            this.logger.error('发送收货信息填写提醒异常:', error);
            return { success: false, message: error.message, count: 0 };
        }
    }
    async getPendingDeliveryRecords(banquetId) {
        try {
            let query = supabase
                .from('return_gifts')
                .select(`
          *,
          gift_records!inner(
            guest_openid,
            banquets(name, host_openid)
          )
        `)
                .eq('need_delivery', true)
                .or(`recipient_name.is.null,recipient_phone.is.null,recipient_address.is.null`);
            if (banquetId) {
                query = query.eq('gift_records.banquet_id', banquetId);
            }
            const { data, error } = await query.order('claimed_at', { ascending: true });
            if (error) {
                throw error;
            }
            return {
                success: true,
                data: data || [],
            };
        }
        catch (error) {
            this.logger.error('获取未填写收货信息记录失败:', error);
            return { success: false, message: error.message, data: [] };
        }
    }
    async updateDeliveryInfo(returnGiftId, recipientName, recipientPhone, recipientAddress) {
        this.logger.log(`更新收货信息: returnGiftId=${returnGiftId}`);
        try {
            const { data: existing, error: queryError } = await supabase
                .from('return_gifts')
                .select('*')
                .eq('id', returnGiftId)
                .single();
            if (queryError || !existing) {
                return { success: false, message: '记录不存在', data: null };
            }
            const { data, error: updateError } = await supabase
                .from('return_gifts')
                .update({
                recipient_name: recipientName,
                recipient_phone: recipientPhone,
                recipient_address: recipientAddress,
                delivery_reminder_sent: false,
                last_reminder_at: null,
            })
                .eq('id', returnGiftId)
                .select()
                .single();
            if (updateError) {
                this.logger.error('更新收货信息失败:', updateError);
                return { success: false, message: '更新失败', data: null };
            }
            this.logger.log(`收货信息更新成功: returnGiftId=${returnGiftId}`);
            return { success: true, message: '更新成功', data };
        }
        catch (error) {
            this.logger.error('更新收货信息异常:', error);
            return { success: false, message: error.message, data: null };
        }
    }
};
exports.ReturnGiftService = ReturnGiftService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_10_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReturnGiftService.prototype, "autoConfirmShipment", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_10AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReturnGiftService.prototype, "sendDeliveryReminderNotices", null);
exports.ReturnGiftService = ReturnGiftService = ReturnGiftService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [wechat_pay_service_1.WechatPayService,
        wechat_subscribe_service_1.WechatSubscribeService])
], ReturnGiftService);
//# sourceMappingURL=return-gift.service.js.map