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
var GiftProductController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GiftProductController = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const supabase_client_1 = require("../../storage/database/supabase-client");
let GiftProductController = GiftProductController_1 = class GiftProductController {
    constructor() {
        this.logger = new common_2.Logger(GiftProductController_1.name);
    }
    async getProducts(category) {
        this.logger.log(`获取商品列表: category=${category}`);
        try {
            const client = (0, supabase_client_1.getSupabaseClient)();
            let query = client
                .from('gift_products')
                .select('*')
                .eq('status', 'active')
                .order('sales', { ascending: false });
            if (category) {
                query = query.eq('category', category);
            }
            const { data, error } = await query;
            if (error) {
                this.logger.error(`获取商品列表失败: ${error.message}`);
                return { code: 500, msg: '获取商品列表失败', data: [] };
            }
            const products = (data || []).map((item) => ({
                ...item,
                price: item.price,
                originalPrice: item.original_price,
                displayPrice: (item.price / 100).toFixed(2),
                displayOriginalPrice: item.original_price ? (item.original_price / 100).toFixed(2) : null,
            }));
            return { code: 200, msg: 'success', data: products };
        }
        catch (error) {
            this.logger.error(`获取商品列表异常: ${error.message}`);
            return { code: 500, msg: '获取商品列表失败', data: [] };
        }
    }
    async getCategories() {
        this.logger.log('获取商品分类');
        try {
            const client = (0, supabase_client_1.getSupabaseClient)();
            const { data, error } = await client
                .from('gift_products')
                .select('category')
                .eq('status', 'active');
            if (error) {
                this.logger.error(`获取商品分类失败: ${error.message}`);
                return { code: 500, msg: '获取分类失败', data: [] };
            }
            const categoryMap = new Map();
            (data || []).forEach((item) => {
                const count = categoryMap.get(item.category) || 0;
                categoryMap.set(item.category, count + 1);
            });
            const categories = Array.from(categoryMap.entries()).map(([name, count]) => ({
                name,
                count,
            }));
            return { code: 200, msg: 'success', data: categories };
        }
        catch (error) {
            this.logger.error(`获取商品分类异常: ${error.message}`);
            return { code: 500, msg: '获取分类失败', data: [] };
        }
    }
    async getProductById(id) {
        this.logger.log(`获取商品详情: id=${id}`);
        try {
            const client = (0, supabase_client_1.getSupabaseClient)();
            const { data, error } = await client.from('gift_products').select('*').eq('id', id).single();
            if (error || !data) {
                return { code: 404, msg: '商品不存在', data: null };
            }
            const product = {
                ...data,
                displayPrice: (data.price / 100).toFixed(2),
                displayOriginalPrice: data.original_price ? (data.original_price / 100).toFixed(2) : null,
            };
            return { code: 200, msg: 'success', data: product };
        }
        catch (error) {
            this.logger.error(`获取商品详情异常: ${error.message}`);
            return { code: 500, msg: '获取商品详情失败', data: null };
        }
    }
};
exports.GiftProductController = GiftProductController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GiftProductController.prototype, "getProducts", null);
__decorate([
    (0, common_1.Get)('categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GiftProductController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Query)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GiftProductController.prototype, "getProductById", null);
exports.GiftProductController = GiftProductController = GiftProductController_1 = __decorate([
    (0, common_1.Controller)('gift-products')
], GiftProductController);
//# sourceMappingURL=gift-product.controller.js.map