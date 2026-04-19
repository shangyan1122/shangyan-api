"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GiftExchangeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GiftExchangeService = void 0;
const common_1 = require("@nestjs/common");
const supabase_client_1 = require("../../storage/database/supabase-client");
let GiftExchangeService = GiftExchangeService_1 = class GiftExchangeService {
    constructor() {
        this.logger = new common_1.Logger(GiftExchangeService_1.name);
    }
    generateExchangeNo() {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substr(2, 6).toUpperCase();
        return `GE${timestamp}${random}`;
    }
    async createExchange(dto) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const exchangeNo = this.generateExchangeNo();
        const sourceTotalValue = dto.sourceItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const targetIds = dto.targetItems.map((item) => item.id);
        const { data: products, error: productError } = await client
            .from('gift_products')
            .select('id, name, price, stock, exchange_service_fee_rate')
            .in('id', targetIds)
            .eq('status', 'active');
        if (productError || !products || products.length !== targetIds.length) {
            throw new Error('目标商品不存在或已下架');
        }
        let targetTotalValue = 0;
        let serviceFee = 0;
        for (const item of dto.targetItems) {
            const product = products.find((p) => p.id === item.id);
            if (!product) {
                throw new Error(`商品不存在: ${item.id}`);
            }
            if (product.stock < item.quantity) {
                throw new Error(`商品 ${product.name} 库存不足`);
            }
            const itemValue = item.price * item.quantity;
            targetTotalValue += itemValue;
            const feeRate = product.exchange_service_fee_rate || 0.05;
            serviceFee += Math.floor(itemValue * feeRate);
        }
        const diffAmount = targetTotalValue - sourceTotalValue + serviceFee;
        const userGiftIds = [];
        const guestGiftIds = [];
        for (const item of dto.sourceItems) {
            if (item.sourceType === 'guest_mall_gift') {
                guestGiftIds.push(item.id);
            }
            else {
                userGiftIds.push(item.id);
            }
        }
        if (userGiftIds.length > 0) {
            const { data: userGifts, error: giftError } = await client
                .from('user_return_gifts')
                .select('id')
                .in('id', userGiftIds)
                .eq('user_openid', dto.userOpenid)
                .eq('status', 'available');
            if (giftError || !userGifts || userGifts.length !== userGiftIds.length) {
                throw new Error('部分回礼不可用或已被使用');
            }
        }
        if (guestGiftIds.length > 0) {
            const { data: guestGifts, error: guestError } = await client
                .from('guest_return_gifts')
                .select('id')
                .in('id', guestGiftIds)
                .eq('guest_openid', dto.userOpenid)
                .eq('mall_gift_claimed', true)
                .eq('mall_claim_type', 'exchange')
                .is('mall_exchanged', false);
            if (guestError || !guestGifts || guestGifts.length !== guestGiftIds.length) {
                throw new Error('部分商城礼品不可用或已被置换');
            }
        }
        const exchangeData = {
            exchange_no: exchangeNo,
            user_openid: dto.userOpenid,
            exchange_type: dto.exchangeType,
            source_items: JSON.parse(JSON.stringify(dto.sourceItems)),
            source_total_value: sourceTotalValue,
            target_items: JSON.parse(JSON.stringify(dto.targetItems)),
            target_total_value: targetTotalValue,
            service_fee: serviceFee,
            diff_amount: diffAmount,
            diff_pay_status: diffAmount > 0 ? 'pending' : 'none',
            status: diffAmount > 0 ? 'pending' : 'processing',
        };
        const { data: exchange, error: exchangeError } = await client
            .from('gift_exchanges')
            .insert(exchangeData)
            .select()
            .single();
        if (exchangeError) {
            this.logger.error('创建置换记录失败:', JSON.stringify(exchangeError, null, 2));
            throw new Error('创建置换记录失败');
        }
        if (userGiftIds.length > 0) {
            await client.from('user_return_gifts').update({ status: 'exchanging' }).in('id', userGiftIds);
        }
        if (guestGiftIds.length > 0) {
            await client
                .from('guest_return_gifts')
                .update({ mall_exchanged: true, mall_exchange_status: 'exchanging' })
                .in('id', guestGiftIds);
        }
        for (const item of dto.targetItems) {
            const product = products.find((p) => p.id === item.id);
            if (product) {
                await client
                    .from('gift_products')
                    .update({ stock: product.stock - item.quantity })
                    .eq('id', item.id);
            }
        }
        this.logger.log(`置换申请创建成功: ${exchangeNo}`);
        const result = await this.getExchangeById(exchange.id);
        return result;
    }
    async getExchangeById(exchangeId) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data, error } = await client
            .from('gift_exchanges')
            .select('*')
            .eq('id', exchangeId)
            .single();
        if (error || !data) {
            return null;
        }
        return {
            id: data.id,
            exchangeNo: data.exchange_no,
            userOpenid: data.user_openid,
            exchangeType: data.exchange_type,
            sourceItems: data.source_items,
            sourceTotalValue: data.source_total_value,
            targetItems: data.target_items,
            targetTotalValue: data.target_total_value,
            serviceFee: data.service_fee,
            diffAmount: data.diff_amount,
            diffPayStatus: data.diff_pay_status,
            status: data.status,
            orderId: data.order_id,
            createdAt: data.created_at,
        };
    }
    async getUserExchanges(userOpenid, page = 1, pageSize = 10) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const { data, count, error } = await client
            .from('gift_exchanges')
            .select('*', { count: 'exact' })
            .eq('user_openid', userOpenid)
            .order('created_at', { ascending: false })
            .range(from, to);
        if (error) {
            return { records: [], total: 0 };
        }
        const records = (data || []).map((item) => ({
            id: item.id,
            exchangeNo: item.exchange_no,
            userOpenid: item.user_openid,
            exchangeType: item.exchange_type,
            sourceItems: item.source_items,
            sourceTotalValue: item.source_total_value,
            targetItems: item.target_items,
            targetTotalValue: item.target_total_value,
            serviceFee: item.service_fee,
            diffAmount: item.diff_amount,
            diffPayStatus: item.diff_pay_status,
            status: item.status,
            orderId: item.order_id,
            createdAt: item.created_at,
        }));
        return { records, total: count || 0 };
    }
    async handleDiffPaymentSuccess(exchangeNo, transactionId) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data: exchange } = await client
            .from('gift_exchanges')
            .select('*')
            .eq('exchange_no', exchangeNo)
            .single();
        if (!exchange) {
            throw new Error('置换记录不存在');
        }
        const { error } = await client
            .from('gift_exchanges')
            .update({
            diff_pay_status: 'paid',
            diff_pay_transaction_id: transactionId,
            status: 'processing',
        })
            .eq('id', exchange.id);
        if (error) {
            throw new Error('更新支付状态失败');
        }
        return true;
    }
    async completeExchange(exchangeId) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const exchange = await this.getExchangeById(exchangeId);
        if (!exchange) {
            throw new Error('置换记录不存在');
        }
        const orderNo = `MO${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const { data: order, error: orderError } = await client
            .from('mall_orders')
            .insert({
            order_no: orderNo,
            user_openid: exchange.userOpenid,
            order_type: 'exchange',
            total_amount: exchange.targetTotalValue,
            pay_amount: exchange.diffAmount > 0 ? exchange.diffAmount : 0,
            pay_status: exchange.diffAmount > 0 ? 'paid' : 'none',
            status: 'paid',
            remark: `置换单号：${exchange.exchangeNo}`,
        })
            .select()
            .single();
        if (orderError) {
            throw new Error('创建订单失败');
        }
        const itemsData = exchange.targetItems.map((item) => ({
            order_id: order.id,
            product_id: item.id,
            product_name: item.name,
            product_image: item.image,
            product_price: item.price,
            quantity: item.quantity,
            total_price: item.price * item.quantity,
            is_return_gift: false,
        }));
        await client.from('mall_order_items').insert(itemsData);
        const sourceIds = exchange.sourceItems.map((item) => item.id);
        await client
            .from('user_return_gifts')
            .update({ status: 'exchanged', updated_at: new Date().toISOString() })
            .in('id', sourceIds);
        await client
            .from('gift_exchanges')
            .update({
            status: 'completed',
            order_id: order.id,
            completed_at: new Date().toISOString(),
        })
            .eq('id', exchangeId);
        this.logger.log(`置换完成: ${exchange.exchangeNo}`);
        return true;
    }
    async cancelExchange(exchangeId) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const exchange = await this.getExchangeById(exchangeId);
        if (!exchange) {
            throw new Error('置换记录不存在');
        }
        if (exchange.status === 'completed') {
            throw new Error('已完成的置换无法取消');
        }
        const sourceIds = exchange.sourceItems.map((item) => item.id);
        await client
            .from('user_return_gifts')
            .update({ status: 'available', updated_at: new Date().toISOString() })
            .in('id', sourceIds);
        for (const item of exchange.targetItems) {
            const { data: product } = await client
                .from('gift_products')
                .select('stock')
                .eq('id', item.id)
                .single();
            if (product) {
                await client
                    .from('gift_products')
                    .update({ stock: product.stock + item.quantity })
                    .eq('id', item.id);
            }
        }
        await client.from('gift_exchanges').update({ status: 'cancelled' }).eq('id', exchangeId);
        this.logger.log(`置换已取消: ${exchange.exchangeNo}`);
        return true;
    }
    async getUserAvailableGifts(userOpenid) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const results = [];
        const { data: userGifts, error: userError } = await client
            .from('user_return_gifts')
            .select('*')
            .eq('user_openid', userOpenid)
            .eq('status', 'available')
            .order('created_at', { ascending: false });
        if (!userError && userGifts) {
            results.push(...userGifts.map((item) => ({
                id: item.id,
                sourceType: 'user_return_gift',
                productId: item.product_id,
                productName: item.product_name,
                productImage: item.product_image,
                productPrice: item.product_price,
                sourceBanquetName: item.source_banquet_name,
                createdAt: item.created_at,
            })));
        }
        const { data: guestGifts, error: guestError } = await client
            .from('guest_return_gifts')
            .select('id, guest_openid, banquet_id, mall_product_id, mall_product_name, mall_product_price, mall_product_image, mall_claim_type, mall_exchanged, created_at, banquets(name)')
            .eq('guest_openid', userOpenid)
            .eq('mall_gift_claimed', true)
            .eq('mall_claim_type', 'exchange')
            .is('mall_exchanged', false)
            .order('created_at', { ascending: false });
        if (!guestError && guestGifts) {
            results.push(...guestGifts.map((item) => ({
                id: item.id,
                sourceType: 'guest_mall_gift',
                productId: item.mall_product_id,
                productName: item.mall_product_name,
                productImage: item.mall_product_image,
                productPrice: item.mall_product_price,
                sourceBanquetName: item.banquets?.name || '',
                createdAt: item.created_at,
            })));
        }
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return results;
    }
    async previewExchange(sourceItems, targetItems) {
        const sourceTotalValue = sourceItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const targetTotalValue = targetItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const serviceFee = Math.floor(targetTotalValue * 0.1);
        const diffAmount = targetTotalValue - sourceTotalValue + serviceFee;
        return {
            sourceTotalValue,
            targetTotalValue,
            serviceFee,
            diffAmount,
            needPay: diffAmount > 0,
        };
    }
};
exports.GiftExchangeService = GiftExchangeService;
exports.GiftExchangeService = GiftExchangeService = GiftExchangeService_1 = __decorate([
    (0, common_1.Injectable)()
], GiftExchangeService);
//# sourceMappingURL=gift-exchange.service.js.map