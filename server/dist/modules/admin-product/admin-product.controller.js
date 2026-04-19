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
var AdminProductController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminProductController = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const admin_product_service_1 = require("./admin-product.service");
let AdminProductController = AdminProductController_1 = class AdminProductController {
    constructor(adminProductService) {
        this.adminProductService = adminProductService;
        this.logger = new common_2.Logger(AdminProductController_1.name);
    }
    async getProducts(category, status, source, gift_type, keyword, page, pageSize) {
        this.logger.log(`获取商品列表: category=${category}, keyword=${keyword}`);
        try {
            const result = await this.adminProductService.getProducts({
                category,
                status,
                source,
                gift_type,
                keyword,
                page: page ? parseInt(page) : 1,
                pageSize: pageSize ? parseInt(pageSize) : 20,
            });
            return {
                code: 200,
                msg: 'success',
                data: result.products,
                total: result.total,
            };
        }
        catch (error) {
            this.logger.error(`获取商品列表失败: ${error.message}`);
            return { code: 500, msg: '获取商品列表失败', data: [] };
        }
    }
    async getProductStats() {
        this.logger.log('获取商品统计');
        try {
            const stats = await this.adminProductService.getProductStats();
            return { code: 200, msg: 'success', data: stats };
        }
        catch (error) {
            this.logger.error(`获取商品统计失败: ${error.message}`);
            return { code: 500, msg: '获取商品统计失败', data: null };
        }
    }
    async getCategories() {
        this.logger.log('获取商品分类');
        try {
            const categories = await this.adminProductService.getCategories();
            return { code: 200, msg: 'success', data: categories };
        }
        catch (error) {
            this.logger.error(`获取商品分类失败: ${error.message}`);
            return { code: 500, msg: '获取商品分类失败', data: [] };
        }
    }
    async search1688Products(keyword, page, pageSize) {
        this.logger.log(`搜索1688商品: keyword=${keyword}`);
        try {
            const result = await this.adminProductService.search1688Products(keyword || '', page ? parseInt(page) : 1, pageSize ? parseInt(pageSize) : 20);
            return {
                code: 200,
                msg: 'success',
                data: result.products,
                total: result.total,
            };
        }
        catch (error) {
            this.logger.error(`搜索1688商品失败: ${error.message}`);
            return { code: 500, msg: '搜索1688商品失败', data: [] };
        }
    }
    async getProductById(id) {
        this.logger.log(`获取商品详情: id=${id}`);
        try {
            const product = await this.adminProductService.getProductById(id);
            if (!product) {
                return { code: 404, msg: '商品不存在', data: null };
            }
            return { code: 200, msg: 'success', data: product };
        }
        catch (error) {
            this.logger.error(`获取商品详情失败: ${error.message}`);
            return { code: 500, msg: '获取商品详情失败', data: null };
        }
    }
    async createProduct(body) {
        this.logger.log(`创建商品: ${body.name}`);
        try {
            const product = await this.adminProductService.createProduct(body);
            return { code: 200, msg: '创建成功', data: product };
        }
        catch (error) {
            this.logger.error(`创建商品失败: ${error.message}`);
            return { code: 500, msg: '创建商品失败', data: null };
        }
    }
    async importFrom1688(body) {
        this.logger.log(`从1688导入商品: productId=${body.productId}`);
        try {
            const product = await this.adminProductService.importFrom1688(body);
            return { code: 200, msg: '导入成功', data: product };
        }
        catch (error) {
            this.logger.error(`导入商品失败: ${error.message}`);
            return { code: 500, msg: error.message || '导入商品失败', data: null };
        }
    }
    async batchImportFrom1688(body) {
        this.logger.log(`批量导入1688商品: ${body.items.length}个`);
        try {
            const result = await this.adminProductService.batchImportFrom1688(body.items);
            return {
                code: 200,
                msg: `成功导入${result.success}个，失败${result.failed}个`,
                data: result.products,
            };
        }
        catch (error) {
            this.logger.error(`批量导入商品失败: ${error.message}`);
            return { code: 500, msg: '批量导入商品失败', data: null };
        }
    }
    async updateProduct(id, body) {
        this.logger.log(`更新商品: id=${id}`);
        try {
            const product = await this.adminProductService.updateProduct(id, body);
            return { code: 200, msg: '更新成功', data: product };
        }
        catch (error) {
            this.logger.error(`更新商品失败: ${error.message}`);
            return { code: 500, msg: '更新商品失败', data: null };
        }
    }
    async toggleProductStatus(id) {
        this.logger.log(`切换商品状态: id=${id}`);
        try {
            const product = await this.adminProductService.toggleProductStatus(id);
            return { code: 200, msg: '状态切换成功', data: product };
        }
        catch (error) {
            this.logger.error(`切换商品状态失败: ${error.message}`);
            return { code: 500, msg: '切换商品状态失败', data: null };
        }
    }
    async updateProductPrice(id, body) {
        this.logger.log(`调整商品价格: id=${id}, price=${body.price}, feeRate=${body.exchangeServiceFeeRate}`);
        try {
            const product = await this.adminProductService.updateProductPrice(id, {
                price: body.price,
                originalPrice: body.originalPrice,
                exchangeServiceFeeRate: body.exchangeServiceFeeRate,
                reason: body.reason,
            });
            return { code: 200, msg: '调价成功', data: product };
        }
        catch (error) {
            this.logger.error(`调整商品价格失败: ${error.message}`);
            return { code: 500, msg: error.message || '调价失败', data: null };
        }
    }
    async deleteProduct(id) {
        this.logger.log(`删除商品: id=${id}`);
        try {
            await this.adminProductService.deleteProduct(id);
            return { code: 200, msg: '删除成功' };
        }
        catch (error) {
            this.logger.error(`删除商品失败: ${error.message}`);
            return { code: 500, msg: '删除商品失败' };
        }
    }
};
exports.AdminProductController = AdminProductController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('category')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('source')),
    __param(3, (0, common_1.Query)('gift_type')),
    __param(4, (0, common_1.Query)('keyword')),
    __param(5, (0, common_1.Query)('page')),
    __param(6, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminProductController.prototype, "getProducts", null);
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminProductController.prototype, "getProductStats", null);
__decorate([
    (0, common_1.Get)('categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminProductController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Get)('search-1688'),
    __param(0, (0, common_1.Query)('keyword')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminProductController.prototype, "search1688Products", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminProductController.prototype, "getProductById", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminProductController.prototype, "createProduct", null);
__decorate([
    (0, common_1.Post)('import-1688'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminProductController.prototype, "importFrom1688", null);
__decorate([
    (0, common_1.Post)('batch-import-1688'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminProductController.prototype, "batchImportFrom1688", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminProductController.prototype, "updateProduct", null);
__decorate([
    (0, common_1.Put)(':id/toggle-status'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminProductController.prototype, "toggleProductStatus", null);
__decorate([
    (0, common_1.Put)(':id/price'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminProductController.prototype, "updateProductPrice", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminProductController.prototype, "deleteProduct", null);
exports.AdminProductController = AdminProductController = AdminProductController_1 = __decorate([
    (0, common_1.Controller)('admin/products'),
    __metadata("design:paramtypes", [admin_product_service_1.AdminProductService])
], AdminProductController);
//# sourceMappingURL=admin-product.controller.js.map