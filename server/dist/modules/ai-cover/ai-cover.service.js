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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AICoverService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AICoverService = void 0;
const common_1 = require("@nestjs/common");
const coze_coding_dev_sdk_1 = require("coze-coding-dev-sdk");
const axios_1 = __importDefault(require("axios"));
const storage_1 = require("../../storage");
let AICoverService = AICoverService_1 = class AICoverService {
    constructor() {
        this.logger = new common_1.Logger(AICoverService_1.name);
        const config = new coze_coding_dev_sdk_1.Config();
        this.imageClient = new coze_coding_dev_sdk_1.ImageGenerationClient(config);
    }
    async generateBanquetCover(params) {
        const { banquetType, banquetName, style = 'traditional', customPrompt } = params;
        let prompt = customPrompt || this.buildPrompt(banquetType, banquetName, style);
        this.logger.log(`生成宴会封面: ${banquetName}, 风格: ${style}`);
        try {
            const response = await this.imageClient.generate({
                prompt,
                size: '2K',
                watermark: false,
            });
            const helper = this.imageClient.getResponseHelper(response);
            if (!helper.success || !helper.imageUrls[0]) {
                throw new Error(helper.errorMessages.join(', ') || '生成封面失败');
            }
            const imageUrl = helper.imageUrls[0];
            const imageBuffer = await this.downloadImage(imageUrl);
            const fileName = `banquet_cover_${Date.now()}.png`;
            const uploadedUrl = await (0, storage_1.uploadToStorage)({
                bucket: 'covers',
                fileName,
                file: imageBuffer,
                contentType: 'image/png',
            });
            this.logger.log(`宴会封面上传成功: ${uploadedUrl}`);
            return uploadedUrl;
        }
        catch (error) {
            this.logger.error('生成宴会封面失败:', error);
            throw error;
        }
    }
    buildPrompt(banquetType, banquetName, style) {
        const stylePrompts = {
            traditional: '中国传统水墨画风格, 古典雅致, 晋商文化元素, 红金配色, 传统纹样装饰, 喜庆祥和',
            modern: '现代简约风格, 清新大气, 几何图形设计, 渐变色彩, 时尚优雅',
            elegant: '欧式宫廷风格, 华丽典雅, 金色边框装饰, 精致花纹, 高贵气质',
            festive: '喜庆节日风格, 红色主调, 金色点缀, 热闹欢乐, 传统剪纸元素',
        };
        const typePrompts = {
            wedding: '婚礼, 双喜字, 鸳鸯戏水, 玫瑰花装饰',
            birthday: '寿宴, 寿字, 仙鹤松柏, 寿桃装饰',
            baby: '满月宴, 婴儿, 可爱卡通, 粉色蓝色温馨',
            graduation: '毕业宴, 学士帽, 书本, 青春活力',
            business: '商务宴, 现代建筑, 商务人士剪影, 专业大气',
            housewarming: '乔迁宴, 新房, 家居元素, 温馨舒适',
            other: '宴会, 美食, 欢聚一堂, 温馨场景',
        };
        const baseStyle = stylePrompts[style] || stylePrompts.traditional;
        const typeStyle = typePrompts[banquetType] || typePrompts.other;
        return `${banquetName}主题封面设计, ${typeStyle}, ${baseStyle}, 高清海报, 专业设计, 4K画质`;
    }
    async generateInvitationCover(params) {
        const { banquetType, banquetName, hostName, style = 'traditional' } = params;
        const prompt = this.buildInvitationPrompt(banquetType, banquetName, hostName, style);
        this.logger.log(`生成邀请函封面: ${banquetName}`);
        try {
            const response = await this.imageClient.generate({
                prompt,
                size: '2K',
                watermark: false,
            });
            const helper = this.imageClient.getResponseHelper(response);
            if (!helper.success || !helper.imageUrls[0]) {
                throw new Error(helper.errorMessages.join(', ') || '生成邀请函封面失败');
            }
            const imageUrl = helper.imageUrls[0];
            const imageBuffer = await this.downloadImage(imageUrl);
            const fileName = `invitation_cover_${Date.now()}.png`;
            const uploadedUrl = await (0, storage_1.uploadToStorage)({
                bucket: 'covers',
                fileName,
                file: imageBuffer,
                contentType: 'image/png',
            });
            return uploadedUrl;
        }
        catch (error) {
            this.logger.error('生成邀请函封面失败:', error);
            throw error;
        }
    }
    buildInvitationPrompt(banquetType, banquetName, hostName, style) {
        const stylePrompts = {
            traditional: '中国传统请柬设计, 红金配色, 古典边框, 双喜或寿字装饰, 书法字体风格',
            modern: '现代简约请柬设计, 清新配色, 几何边框, 简洁排版',
            elegant: '欧式高雅请柬设计, 金色装饰, 花纹边框, 优雅排版',
        };
        const typePrompts = {
            wedding: '婚礼邀请函, 双喜字, 爱心装饰',
            birthday: '寿宴邀请函, 寿字, 仙鹤',
            baby: '满月宴邀请函, 婴儿脚印, 可爱图案',
            graduation: '毕业宴邀请函, 学士帽, 彩带',
            business: '商务宴会邀请函, 专业商务设计',
            housewarming: '乔迁宴邀请函, 房屋图案',
            other: '宴会邀请函, 欢庆元素',
        };
        const baseStyle = stylePrompts[style] || stylePrompts.traditional;
        const typeStyle = typePrompts[banquetType] || typePrompts.other;
        return `${banquetName}邀请函封面, 主人${hostName}, ${typeStyle}, ${baseStyle}, 高清设计, 专业排版, 4K画质`;
    }
    async downloadImage(url) {
        const response = await axios_1.default.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000,
        });
        return Buffer.from(response.data);
    }
};
exports.AICoverService = AICoverService;
exports.AICoverService = AICoverService = AICoverService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AICoverService);
//# sourceMappingURL=ai-cover.service.js.map