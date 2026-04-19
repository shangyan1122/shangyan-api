"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AdminProductService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminProductService = void 0;
const common_1 = require("@nestjs/common");
const supabase_client_1 = require("../../storage/database/supabase-client");
const supabase = (0, supabase_client_1.getSupabaseClient)();
let AdminProductService = AdminProductService_1 = class AdminProductService {
    constructor() {
        this.logger = new common_1.Logger(AdminProductService_1.name);
        this.DEFAULT_MARKUP_RATE = 1.2;
    }
    async getProducts(params) {
        this.logger.log(`获取商品列表: ${JSON.stringify(params)}`);
        let query = supabase.from('gift_products').select('*', { count: 'exact' });
        if (params?.category) {
            query = query.eq('category', params.category);
        }
        if (params?.status) {
            query = query.eq('status', params.status);
        }
        if (params?.source) {
            query = query.eq('source', params.source);
        }
        if (params?.gift_type) {
            query = query.eq('gift_type', params.gift_type);
        }
        if (params?.keyword) {
            query = query.ilike('name', `%${params.keyword}%`);
        }
        const page = params?.page || 1;
        const pageSize = params?.pageSize || 20;
        const offset = (page - 1) * pageSize;
        query = query.order('created_at', { ascending: false });
        query = query.range(offset, offset + pageSize - 1);
        const { data, error, count } = await query;
        if (error) {
            this.logger.error('获取商品列表失败:', error);
            throw new Error('获取商品列表失败');
        }
        return {
            products: data || [],
            total: count || 0,
        };
    }
    async getProductById(id) {
        const { data, error } = await supabase.from('gift_products').select('*').eq('id', id).single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            this.logger.error('获取商品详情失败:', error);
            throw new Error('获取商品详情失败');
        }
        return data;
    }
    async createProduct(params) {
        this.logger.log(`创建商品: ${params.name}`);
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const productId = `prod_${timestamp}_${random}`;
        const { data, error } = await supabase
            .from('gift_products')
            .insert({
            id: productId,
            ...params,
            gift_type: params.gift_type || 'onsite',
            source: params.source || 'manual',
            supply_cost_price: params.supply_cost_price || 0,
            alibaba_1688_sync_status: 'none',
            status: 'active',
            sales: 0,
            created_at: new Date().toISOString(),
        })
            .select()
            .single();
        if (error) {
            this.logger.error('创建商品失败:', error);
            throw new Error('创建商品失败');
        }
        return data;
    }
    async updateProduct(id, params) {
        this.logger.log(`更新商品: ${id}`);
        const { data, error } = await supabase
            .from('gift_products')
            .update({
            ...params,
            updated_at: new Date().toISOString(),
        })
            .eq('id', id)
            .select()
            .single();
        if (error) {
            this.logger.error('更新商品失败:', error);
            throw new Error('更新商品失败');
        }
        return data;
    }
    async deleteProduct(id) {
        this.logger.log(`删除商品: ${id}`);
        const { error } = await supabase.from('gift_products').delete().eq('id', id);
        if (error) {
            this.logger.error('删除商品失败:', error);
            throw new Error('删除商品失败');
        }
    }
    async toggleProductStatus(id) {
        const product = await this.getProductById(id);
        if (!product) {
            throw new Error('商品不存在');
        }
        const newStatus = product.status === 'active' ? 'inactive' : 'active';
        const { data, error } = await supabase
            .from('gift_products')
            .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
        })
            .eq('id', id)
            .select()
            .single();
        if (error) {
            this.logger.error('切换商品状态失败:', error);
            throw new Error('切换商品状态失败');
        }
        return data;
    }
    async updateProductPrice(id, params) {
        const product = await this.getProductById(id);
        if (!product) {
            throw new Error('商品不存在');
        }
        if (params.price < 0) {
            throw new Error('售价不能为负数');
        }
        if (params.originalPrice !== undefined && params.originalPrice < 0) {
            throw new Error('原价不能为负数');
        }
        if (params.exchangeServiceFeeRate !== undefined) {
            if (params.exchangeServiceFeeRate < 0 || params.exchangeServiceFeeRate > 100) {
                throw new Error('置换服务费率必须在0-100之间');
            }
        }
        if (product.source === 'alibaba_1688' && product.supply_cost_price > 0) {
            if (params.price < product.supply_cost_price) {
                throw new Error(`售价不能低于成本价¥${(product.supply_cost_price / 100).toFixed(2)}`);
            }
        }
        this.logger.log(`调整商品价格: ${id}, 原价=${product.price}, 新价=${params.price}, 服务费率=${params.exchangeServiceFeeRate}%, 原因=${params.reason || '无'}`);
        const updateData = {
            price: params.price,
            updated_at: new Date().toISOString(),
        };
        if (params.originalPrice !== undefined) {
            updateData.original_price = params.originalPrice;
        }
        if (params.exchangeServiceFeeRate !== undefined) {
            updateData.exchange_service_fee_rate = params.exchangeServiceFeeRate / 100;
        }
        const { data, error } = await supabase
            .from('gift_products')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            this.logger.error('调整商品价格失败:', error);
            throw new Error('调整商品价格失败');
        }
        return data;
    }
    async search1688Products(keyword, page = 1, pageSize = 20) {
        this.logger.log(`搜索1688商品: keyword=${keyword}, page=${page}`);
        const mockProducts = [
            {
                productId: '1688_001',
                name: '高档喜糖礼盒装20颗装',
                image: 'https://cbu01.alicdn.com/img/example1.jpg',
                images: [
                    'https://cbu01.alicdn.com/img/example1.jpg',
                    'https://cbu01.alicdn.com/img/example1_2.jpg',
                ],
                price: 1800,
                category: '喜糖礼盒',
                description: '高档喜糖礼盒，内含20颗精选糖果，适合婚宴回礼',
                url: 'https://detail.1688.com/offer/001.html',
                shopName: '喜庆糖果批发店',
                minOrderQuantity: 10,
            },
            {
                productId: '1688_002',
                name: '创意伴手礼小礼盒',
                image: 'https://cbu01.alicdn.com/img/example2.jpg',
                images: [
                    'https://cbu01.alicdn.com/img/example2.jpg',
                    'https://cbu01.alicdn.com/img/example2_2.jpg',
                ],
                price: 1500,
                category: '伴手礼',
                description: '创意小礼盒，可用于婚宴、生日、满月等场合',
                url: 'https://detail.1688.com/offer/002.html',
                shopName: '礼品包装工厂',
                minOrderQuantity: 20,
            },
            {
                productId: '1688_003',
                name: '中式婚礼红包封套',
                image: 'https://cbu01.alicdn.com/img/example3.jpg',
                images: ['https://cbu01.alicdn.com/img/example3.jpg'],
                price: 200,
                category: '红包',
                description: '中式婚礼专用红包封套，烫金工艺',
                url: 'https://detail.1688.com/offer/003.html',
                shopName: '印刷制品厂',
                minOrderQuantity: 100,
            },
            {
                productId: '1688_004',
                name: '精美玻璃杯礼盒装',
                image: 'https://cbu01.alicdn.com/img/example4.jpg',
                images: [
                    'https://cbu01.alicdn.com/img/example4.jpg',
                    'https://cbu01.alicdn.com/img/example4_2.jpg',
                ],
                price: 2800,
                category: '生活用品',
                description: '精美玻璃杯礼盒，适合乔迁、开业回礼',
                url: 'https://detail.1688.com/offer/004.html',
                shopName: '玻璃制品工厂',
                minOrderQuantity: 10,
            },
            {
                productId: '1688_005',
                name: '定制马克杯情侣套装',
                image: 'https://cbu01.alicdn.com/img/example5.jpg',
                images: ['https://cbu01.alicdn.com/img/example5.jpg'],
                price: 3200,
                category: '生活用品',
                description: '可定制图案的马克杯情侣套装',
                url: 'https://detail.1688.com/offer/005.html',
                shopName: '陶瓷定制工厂',
                minOrderQuantity: 5,
            },
        ];
        const filteredProducts = mockProducts.filter((p) => !keyword ||
            p.name.includes(keyword) ||
            p.category?.includes(keyword) ||
            p.description?.includes(keyword));
        const start = (page - 1) * pageSize;
        const paginatedProducts = filteredProducts.slice(start, start + pageSize);
        return {
            products: paginatedProducts,
            total: filteredProducts.length,
        };
    }
    async importFrom1688(params) {
        this.logger.log(`从1688导入商品: productId=${params.productId}`);
        const allProducts = await this.search1688Products('');
        const alibabaProduct = allProducts.products.find((p) => p.productId === params.productId);
        if (!alibabaProduct) {
            throw new Error('1688商品不存在');
        }
        const markupRate = params.markupRate || this.DEFAULT_MARKUP_RATE;
        const salePrice = Math.round(alibabaProduct.price * markupRate);
        const product = await this.createProduct({
            name: alibabaProduct.name,
            description: alibabaProduct.description,
            price: salePrice,
            original_price: salePrice,
            image: alibabaProduct.image,
            images: alibabaProduct.images,
            category: params.category,
            stock: params.stock || 999,
            gift_type: 'delivery',
            alibaba_1688_product_id: alibabaProduct.productId,
            alibaba_1688_url: alibabaProduct.url,
            supply_cost_price: alibabaProduct.price,
            source: 'alibaba_1688',
        });
        await supabase
            .from('gift_products')
            .update({
            alibaba_1688_sync_status: 'synced',
            alibaba_1688_synced_at: new Date().toISOString(),
        })
            .eq('id', product.id);
        this.logger.log(`商品导入成功: ${product.id}, 售价=${salePrice}分, 成本=${alibabaProduct.price}分`);
        return product;
    }
    async batchImportFrom1688(items) {
        this.logger.log(`批量导入1688商品: ${items.length}个`);
        const results = [];
        let success = 0;
        let failed = 0;
        for (const item of items) {
            try {
                const product = await this.importFrom1688(item);
                results.push(product);
                success++;
            }
            catch (error) {
                this.logger.error(`导入商品失败: productId=${item.productId}, error=${error.message}`);
                failed++;
            }
        }
        return { success, failed, products: results };
    }
    async getProductStats() {
        const { data, error } = await supabase.from('gift_products').select('status, source');
        if (error) {
            this.logger.error('获取商品统计失败:', error);
            throw new Error('获取商品统计失败');
        }
        const stats = {
            total: data?.length || 0,
            active: data?.filter((p) => p.status === 'active').length || 0,
            inactive: data?.filter((p) => p.status === 'inactive').length || 0,
            from1688: data?.filter((p) => p.source === 'alibaba_1688').length || 0,
            manual: data?.filter((p) => p.source === 'manual').length || 0,
        };
        return stats;
    }
    async getCategories() {
        const { data, error } = await supabase
            .from('gift_products')
            .select('category')
            .eq('status', 'active');
        if (error) {
            this.logger.error('获取分类失败:', error);
            throw new Error('获取分类失败');
        }
        const categoryMap = new Map();
        (data || []).forEach((item) => {
            const count = categoryMap.get(item.category) || 0;
            categoryMap.set(item.category, count + 1);
        });
        return Array.from(categoryMap.entries()).map(([name, count]) => ({
            name,
            count,
        }));
    }
};
exports.AdminProductService = AdminProductService;
exports.AdminProductService = AdminProductService = AdminProductService_1 = __decorate([
    (0, common_1.Injectable)()
], AdminProductService);
//# sourceMappingURL=admin-product.service.js.map