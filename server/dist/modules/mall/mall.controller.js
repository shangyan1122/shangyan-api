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
var MallController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MallController = void 0;
const common_1 = require("@nestjs/common");
const mall_service_1 = require("./mall.service");
let MallController = MallController_1 = class MallController {
    constructor(mallService) {
        this.mallService = mallService;
        this.logger = new common_1.Logger(MallController_1.name);
    }
    async getProducts(category, sceneCategory, priceTier, limit, page = '1', pageSize = '20') {
        const result = await this.mallService.getProducts(category, parseInt(page), parseInt(pageSize), sceneCategory, priceTier, limit ? parseInt(limit) : undefined);
        return {
            code: 200,
            msg: 'success',
            data: result,
        };
    }
    async getSpecialties(region) {
        const specialties = await this.mallService.getSpecialties(region);
        return {
            code: 200,
            msg: 'success',
            data: { specialties },
        };
    }
    async getHotProducts(limit = '6') {
        const products = await this.mallService.getHotProducts(parseInt(limit));
        return {
            code: 200,
            msg: 'success',
            data: products,
        };
    }
    async getRecommendedProducts(limit = '6') {
        const products = await this.mallService.getRecommendedProducts(parseInt(limit));
        return {
            code: 200,
            msg: 'success',
            data: products,
        };
    }
    async getRankedProducts(limit = '10') {
        const products = await this.mallService.getRankedProducts(parseInt(limit));
        return {
            code: 200,
            msg: 'success',
            data: products,
        };
    }
    async getProduct(id) {
        const product = await this.mallService.getProductById(id);
        if (!product) {
            return {
                code: 404,
                msg: '商品不存在',
                data: null,
            };
        }
        return {
            code: 200,
            msg: 'success',
            data: product,
        };
    }
    async addToCart(body) {
        const userOpenid = body.openid || 'test_user_openid';
        const { productId, quantity = 1 } = body;
        try {
            const item = await this.mallService.addToCart(userOpenid, productId, quantity);
            return {
                code: 200,
                msg: '已加入购物车',
                data: {
                    id: item.id,
                    quantity: item.quantity,
                },
            };
        }
        catch (error) {
            return {
                code: 400,
                msg: error.message || '添加失败',
                data: null,
            };
        }
    }
    async getCart(openid) {
        const userOpenid = openid || 'test_user_openid';
        const items = await this.mallService.getCart(userOpenid);
        let totalAmount = 0;
        const cartItems = items.map((item) => {
            const product = item.product;
            const subtotal = product?.price * item.quantity || 0;
            totalAmount += subtotal;
            return {
                ...item,
                product,
                subtotal,
            };
        });
        return {
            code: 200,
            msg: 'success',
            data: {
                items: cartItems,
                totalAmount,
                itemCount: items.length,
            },
        };
    }
    async updateCart(body) {
        const userOpenid = body.openid || 'test_user_openid';
        const { cartItemId, quantity } = body;
        try {
            await this.mallService.updateCartQuantity(userOpenid, cartItemId, quantity);
            return {
                code: 200,
                msg: '更新成功',
                data: null,
            };
        }
        catch (error) {
            return {
                code: 400,
                msg: error.message || '更新失败',
                data: null,
            };
        }
    }
    async clearCart(body) {
        const userOpenid = body.openid || 'test_user_openid';
        await this.mallService.clearCart(userOpenid);
        return {
            code: 200,
            msg: '购物车已清空',
            data: null,
        };
    }
    async getCartCount(openid) {
        const userOpenid = openid || 'test_user_openid';
        const count = await this.mallService.getCartCount(userOpenid);
        return {
            code: 200,
            msg: 'success',
            data: { count },
        };
    }
    async getUserReturnGifts(openid) {
        if (!openid) {
            return {
                code: 400,
                msg: '缺少openid参数',
                data: null,
            };
        }
        const gifts = await this.mallService.getUserReturnGifts(openid);
        return {
            code: 200,
            msg: 'success',
            data: gifts,
        };
    }
    async exchangeGift(body) {
        const { openid, returnGiftIds, targetProductId, diffAmount } = body;
        if (!openid || !returnGiftIds?.length || !targetProductId) {
            return {
                code: 400,
                msg: '参数错误',
                data: null,
            };
        }
        try {
            const result = await this.mallService.exchangeGifts(openid, returnGiftIds, targetProductId, diffAmount);
            return {
                code: 200,
                msg: '置换成功',
                data: result,
            };
        }
        catch (error) {
            this.logger.error(`礼品置换失败: ${error.message}`);
            return {
                code: 400,
                msg: error.message || '置换失败',
                data: null,
            };
        }
    }
    async getExchangeRecords(openid) {
        if (!openid) {
            return {
                code: 400,
                msg: '缺少openid参数',
                data: null,
            };
        }
        const records = await this.mallService.getExchangeRecords(openid);
        return {
            code: 200,
            msg: 'success',
            data: records,
        };
    }
};
exports.MallController = MallController;
__decorate([
    (0, common_1.Get)('products'),
    __param(0, (0, common_1.Query)('category')),
    __param(1, (0, common_1.Query)('scene_category')),
    __param(2, (0, common_1.Query)('price_tier')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], MallController.prototype, "getProducts", null);
__decorate([
    (0, common_1.Get)('specialties'),
    __param(0, (0, common_1.Query)('region')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MallController.prototype, "getSpecialties", null);
__decorate([
    (0, common_1.Get)('hot'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MallController.prototype, "getHotProducts", null);
__decorate([
    (0, common_1.Get)('recommended'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MallController.prototype, "getRecommendedProducts", null);
__decorate([
    (0, common_1.Get)('rank'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MallController.prototype, "getRankedProducts", null);
__decorate([
    (0, common_1.Get)('product/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MallController.prototype, "getProduct", null);
__decorate([
    (0, common_1.Post)('cart/add'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MallController.prototype, "addToCart", null);
__decorate([
    (0, common_1.Get)('cart'),
    __param(0, (0, common_1.Query)('openid')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MallController.prototype, "getCart", null);
__decorate([
    (0, common_1.Post)('cart/update'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MallController.prototype, "updateCart", null);
__decorate([
    (0, common_1.Post)('cart/clear'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MallController.prototype, "clearCart", null);
__decorate([
    (0, common_1.Get)('cart/count'),
    __param(0, (0, common_1.Query)('openid')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MallController.prototype, "getCartCount", null);
__decorate([
    (0, common_1.Get)('user-return-gifts'),
    __param(0, (0, common_1.Query)('openid')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MallController.prototype, "getUserReturnGifts", null);
__decorate([
    (0, common_1.Post)('exchange'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MallController.prototype, "exchangeGift", null);
__decorate([
    (0, common_1.Get)('exchanges'),
    __param(0, (0, common_1.Query)('openid')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MallController.prototype, "getExchangeRecords", null);
exports.MallController = MallController = MallController_1 = __decorate([
    (0, common_1.Controller)('mall'),
    __metadata("design:paramtypes", [mall_service_1.MallService])
], MallController);
//# sourceMappingURL=mall.controller.js.map