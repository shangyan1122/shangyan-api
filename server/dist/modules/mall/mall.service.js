"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MallService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MallService = void 0;
const common_1 = require("@nestjs/common");
const supabase_client_1 = require("../../storage/database/supabase-client");
let MallService = MallService_1 = class MallService {
    constructor() {
        this.logger = new common_1.Logger(MallService_1.name);
    }
    async getProducts(category, page = 1, pageSize = 20, sceneCategory, priceTier, limit) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const effectiveLimit = limit || pageSize;
        const from = limit ? 0 : (page - 1) * pageSize;
        const to = limit ? limit - 1 : from + pageSize - 1;
        let query = client
            .from('gift_products')
            .select('*', { count: 'exact' })
            .eq('status', 'active')
            .gt('stock', 0)
            .order('sales', { ascending: false })
            .range(from, to);
        if (category && category !== '全部') {
            query = query.eq('category', category);
        }
        if (sceneCategory && sceneCategory !== 'all') {
            query = query.eq('scene_category', sceneCategory);
        }
        if (priceTier) {
            query = query.eq('price_tier', priceTier);
        }
        const { data, count, error } = await query;
        if (error) {
            this.logger.error('获取商品列表失败:', JSON.stringify(error, null, 2));
            return { products: [], total: 0 };
        }
        return {
            products: data || [],
            total: count || 0,
        };
    }
    async getProductById(id) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data, error } = await client.from('gift_products').select('*').eq('id', id).single();
        if (error) {
            this.logger.error('获取商品详情失败:', error);
            return null;
        }
        return data;
    }
    async getHotProducts(limit = 6) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data, error } = await client
            .from('gift_products')
            .select('*')
            .eq('status', 'active')
            .gt('stock', 0)
            .order('sales', { ascending: false })
            .limit(limit);
        if (error) {
            this.logger.error('获取热门商品失败:', error);
            return [];
        }
        return data || [];
    }
    async addToCart(userOpenid, productId, quantity = 1) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const product = await this.getProductById(productId);
        if (!product) {
            throw new Error('商品不存在');
        }
        if (product.stock < quantity) {
            throw new Error('库存不足');
        }
        const { data: existingItem } = await client
            .from('cart_items')
            .select('*')
            .eq('user_openid', userOpenid)
            .eq('product_id', productId)
            .single();
        if (existingItem) {
            const newQuantity = existingItem.quantity + quantity;
            if (newQuantity > product.stock) {
                throw new Error('库存不足');
            }
            const { data, error } = await client
                .from('cart_items')
                .update({ quantity: newQuantity })
                .eq('id', existingItem.id)
                .select()
                .single();
            if (error)
                throw new Error(error.message);
            return data;
        }
        else {
            const { data, error } = await client
                .from('cart_items')
                .insert({
                user_openid: userOpenid,
                product_id: productId,
                quantity,
            })
                .select()
                .single();
            if (error)
                throw new Error(error.message);
            return data;
        }
    }
    async getCart(userOpenid) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data, error } = await client
            .from('cart_items')
            .select('*, gift_products(*)')
            .eq('user_openid', userOpenid)
            .order('created_at', { ascending: false });
        if (error) {
            this.logger.error('获取购物车失败:', error);
            return [];
        }
        return data || [];
    }
    async updateCartQuantity(userOpenid, cartItemId, quantity) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        if (quantity <= 0) {
            await client.from('cart_items').delete().eq('id', cartItemId).eq('user_openid', userOpenid);
            return null;
        }
        const { data, error } = await client
            .from('cart_items')
            .update({ quantity })
            .eq('id', cartItemId)
            .eq('user_openid', userOpenid)
            .select()
            .single();
        if (error)
            throw new Error(error.message);
        return data;
    }
    async clearCart(userOpenid) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { error } = await client.from('cart_items').delete().eq('user_openid', userOpenid);
        if (error) {
            this.logger.error('清空购物车失败:', error);
            return false;
        }
        return true;
    }
    async getCartCount(userOpenid) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data, error } = await client
            .from('cart_items')
            .select('quantity')
            .eq('user_openid', userOpenid);
        if (error) {
            return 0;
        }
        return data?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    }
    async getSpecialties(region) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        let query = client
            .from('gift_products')
            .select('*')
            .eq('status', 'active')
            .eq('is_specialty', true)
            .gt('stock', 0)
            .order('sales', { ascending: false })
            .limit(10);
        if (region) {
            query = query.eq('region', region);
        }
        const { data, error } = await query;
        if (error) {
            this.logger.error('获取地方特产失败:', error);
            return [];
        }
        return data || [];
    }
    async getRecommendedProducts(limit = 6) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data, error } = await client
            .from('gift_products')
            .select('*')
            .eq('status', 'active')
            .eq('is_recommended', true)
            .gt('stock', 0)
            .order('rank_score', { ascending: false })
            .limit(limit);
        if (error) {
            this.logger.error('获取推荐商品失败:', error);
            return [];
        }
        return data || [];
    }
    async getRankedProducts(limit = 10) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data, error } = await client
            .from('gift_products')
            .select('*')
            .eq('status', 'active')
            .gt('stock', 0)
            .order('rank_score', { ascending: false })
            .limit(limit);
        if (error) {
            this.logger.error('获取排行榜失败:', error);
            return [];
        }
        return data || [];
    }
    async getUserReturnGifts(openid) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data, error } = await client
            .from('guest_return_gifts')
            .select(`
        id,
        product_id,
        product_name,
        product_price,
        product_image,
        banquet_id,
        need_delivery,
        is_mailed,
        exchange_status,
        created_at
      `)
            .eq('guest_openid', openid)
            .eq('return_type', 'mall_gift')
            .eq('is_mailed', false)
            .order('created_at', { ascending: false });
        if (error) {
            this.logger.error('获取用户未邮寄回礼礼品失败:', error);
            return [];
        }
        const banquetIds = [...new Set(data?.map((item) => item.banquet_id).filter(Boolean))];
        let banquetMap = {};
        if (banquetIds.length > 0) {
            const { data: banquets } = await client
                .from('banquets')
                .select('id, name')
                .in('id', banquetIds);
            banquetMap = (banquets || []).reduce((map, b) => {
                map[b.id] = b.name;
                return map;
            }, {});
        }
        return (data || []).map((item) => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.product_name || '未知礼品',
            product_price: item.product_price || 0,
            product_image: item.product_image || '',
            banquet_id: item.banquet_id,
            banquet_name: banquetMap[item.banquet_id] || '未知宴会',
            created_at: item.created_at,
        }));
    }
    async exchangeGifts(openid, returnGiftIds, targetProductId, diffAmount) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const targetProduct = await this.getProductById(targetProductId);
        if (!targetProduct) {
            throw new Error('目标商品不存在');
        }
        if (targetProduct.stock < 1) {
            throw new Error('目标商品库存不足');
        }
        const { data: returnGifts, error: queryError } = await client
            .from('guest_return_gifts')
            .select('*')
            .in('id', returnGiftIds)
            .eq('is_mailed', false);
        if (queryError || !returnGifts?.length) {
            this.logger.error('查询回礼失败:', queryError);
            throw new Error('回礼礼品不存在或不可置换');
        }
        const totalOriginalValue = returnGifts.reduce((sum, item) => {
            return sum + (item.product_price || 0);
        }, 0);
        const serviceFee = Math.floor(totalOriginalValue * 0.1);
        const actualValue = totalOriginalValue - serviceFee;
        const targetPrice = targetProduct.price;
        const expectedDiff = Math.max(0, targetPrice - actualValue);
        if (Math.abs(expectedDiff - diffAmount) > 1) {
            this.logger.error(`差价计算错误: expected=${expectedDiff}, actual=${diffAmount}`);
            throw new Error(`差价计算错误，需要补 ${(expectedDiff / 100).toFixed(2)} 元`);
        }
        const { error: updateError } = await client
            .from('guest_return_gifts')
            .update({
            is_mailed: true,
            exchange_status: 'replaced',
        })
            .in('id', returnGiftIds);
        if (updateError) {
            this.logger.error('更新回礼状态失败:', updateError);
            throw new Error('更新回礼状态失败');
        }
        await client
            .from('gift_products')
            .update({ stock: targetProduct.stock - 1 })
            .eq('id', targetProductId);
        const { data: newGift, error: newGiftError } = await client
            .from('guest_return_gifts')
            .insert({
            product_id: targetProductId,
            product_name: targetProduct.name,
            product_price: targetProduct.price,
            product_image: targetProduct.image,
            return_type: 'mall_gift',
            need_delivery: true,
            is_mailed: false,
            exchange_status: 'completed',
        })
            .select()
            .single();
        if (newGiftError) {
            this.logger.error('创建新礼品记录失败:', newGiftError);
        }
        const { data: exchangeRecord, error: insertError } = await client
            .from('gift_exchange_records')
            .insert({
            openid: openid,
            source_gifts: returnGifts.map((g) => ({
                id: g.id,
                name: g.product_name,
                cost_price: g.mall_product_cost_price || Math.floor(g.product_price * 0.6),
                price: g.product_price,
                quantity: 1,
            })),
            target_products: [
                {
                    id: targetProductId,
                    name: targetProduct.name,
                    price: targetProduct.price,
                    quantity: 1,
                },
            ],
            total_deductible: actualValue,
            total_target_amount: targetPrice,
            price_difference: diffAmount,
            service_fee: serviceFee,
            actual_payment: diffAmount + serviceFee,
            payment_status: diffAmount > 0 ? 'pending' : 'completed',
        })
            .select()
            .single();
        if (insertError) {
            this.logger.error('创建置换记录失败:', insertError);
        }
        return {
            success: true,
            exchangeId: exchangeRecord?.id,
            newGiftId: newGift?.id,
            originalValue: totalOriginalValue,
            serviceFee: serviceFee,
            actualValue: actualValue,
            diffAmount: diffAmount,
        };
    }
    async getExchangeRecords(openid) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data, error } = await client
            .from('voucher_exchanges')
            .select('*, gift_products(*)')
            .eq('user_openid', openid)
            .order('created_at', { ascending: false });
        if (error) {
            this.logger.error('获取兑换记录失败:', error);
            return [];
        }
        return data || [];
    }
};
exports.MallService = MallService;
exports.MallService = MallService = MallService_1 = __decorate([
    (0, common_1.Injectable)()
], MallService);
//# sourceMappingURL=mall.service.js.map