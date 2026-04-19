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
var UnifiedAIService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedAIService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const siliconflow_service_1 = require("./siliconflow.service");
const ai_config_1 = require("./ai-config");
let UnifiedAIService = UnifiedAIService_1 = class UnifiedAIService {
    constructor(configService, siliconflowService) {
        this.configService = configService;
        this.siliconflowService = siliconflowService;
        this.logger = new common_1.Logger(UnifiedAIService_1.name);
        this.currentProvider = 'siliconflow';
        this.siliconflow = siliconflowService;
    }
    onModuleInit() {
        const config = (0, ai_config_1.getAIConfig)();
        const validation = (0, ai_config_1.validateAIConfig)(config);
        if (!validation.valid) {
            this.logger.warn('⚠️ AI配置存在问题:');
            validation.errors.forEach((err) => this.logger.warn(`  - ${err}`));
        }
        this.currentProvider = config.provider;
        if (config.provider === 'siliconflow' && config.siliconflow) {
            this.siliconflow.setDefaultModel(config.siliconflow.defaultTextModel, config.siliconflow.defaultVisionModel);
        }
        this.logger.log(`✅ AI服务初始化完成，当前提供商: ${this.currentProvider}`);
    }
    getProvider() {
        return this.currentProvider;
    }
    getAvailableModels() {
        return this.siliconflow.getAvailableModels();
    }
    async generateText(request) {
        const config = (0, ai_config_1.getAIConfig)();
        const model = request.model || config.siliconflow?.defaultTextModel || siliconflow_service_1.SILICONFLOW_MODELS.QWEN_QWEN2_5_7B;
        const enableThinking = request.enableThinking || model.includes('DeepSeek-R1') || model.includes('R1-Distill');
        const result = await this.siliconflow.chat({
            messages: [
                ...(request.systemPrompt
                    ? [{ role: 'system', content: request.systemPrompt }]
                    : []),
                { role: 'user', content: request.prompt },
            ],
            model: model,
            temperature: request.temperature ?? config.siliconflow?.temperature ?? 0.7,
            max_tokens: request.maxTokens ?? config.siliconflow?.maxTokens ?? 2000,
            enable_thinking: enableThinking,
        });
        return {
            success: result.success,
            content: result.content,
            reasoning: result.reasoning,
            error: result.error,
        };
    }
    async analyzeImage(request) {
        const config = (0, ai_config_1.getAIConfig)();
        const model = request.model || config.siliconflow?.defaultVisionModel || siliconflow_service_1.SILICONFLOW_MODELS.QWEN_VL_FLASH;
        const result = await this.siliconflow.visionChat({
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: request.text },
                        {
                            type: 'image_url',
                            image_url: {
                                url: request.imageUrl,
                                detail: 'low',
                            },
                        },
                    ],
                },
            ],
            model: model,
            temperature: request.temperature ?? 0.7,
        });
        return {
            success: result.success,
            content: result.content,
            error: result.error,
        };
    }
    async generateBlessing(data) {
        const prompt = `请为${data.guestName ? `${data.guestName}参加` : ''}${data.banquetType}"${data.banquetName}"生成一句温馨的祝福语，要求：
1. 符合${data.banquetType}的喜庆氛围
2. 简洁优美，20字以内
3. 不要包含"祝"、"愿"等开头词

直接输出祝福语即可，不要其他内容。`;
        const result = await this.generateText({
            prompt,
            temperature: 0.8,
            maxTokens: 100,
        });
        if (!result.success || !result.content) {
            return {
                code: 500,
                message: result.error || '生成失败',
                error: result.error,
            };
        }
        return {
            code: 200,
            message: 'success',
            data: { blessing: result.content.trim() },
        };
    }
    async generateWelcome(data) {
        if (data.photos && data.photos.length > 0) {
            const photoUrl = data.photos[0];
            const result = await this.analyzeImage({
                text: `这是${data.banquetType}"${data.banquetName}"的主角照片。请根据照片中人物的气质、穿着、表情等，生成一段简短的欢迎词，要求：
1. 温馨感人，体现主人的热情好客
2. 符合${data.banquetType}的喜庆氛围
3. 可根据照片中人物的特点（如气质优雅、笑容灿烂等）进行个性化描述
4. 严格控制在20字以内

直接输出欢迎词即可，不要包含标题。`,
                imageUrl: photoUrl,
            });
            if (!result.success || !result.content) {
                this.logger.warn('视觉模型调用失败，降级到文本生成');
                return this.generateWelcomeText(data);
            }
            return {
                code: 200,
                message: 'success',
                data: { welcome: result.content.trim() },
            };
        }
        return this.generateWelcomeText(data);
    }
    async generateWelcomeText(data) {
        const prompt = `请为${data.banquetType}"${data.banquetName}"生成一段欢迎词${data.hostName ? `，主人是${data.hostName}` : ''}，要求：
1. 温馨感人，体现主人的热情
2. 符合${data.banquetType}的氛围，融入中国传统文化元素
3. 严格控制在20字以内

直接输出欢迎词即可。`;
        const result = await this.generateText({
            prompt,
            temperature: 0.8,
            maxTokens: 100,
        });
        if (!result.success || !result.content) {
            return {
                code: 500,
                message: result.error || '生成失败',
                error: result.error,
            };
        }
        return {
            code: 200,
            message: 'success',
            data: { welcome: result.content.trim() },
        };
    }
    async generateThanks(data) {
        if (data.photos && data.photos.length > 0) {
            const photoUrl = data.photos[0];
            const result = await this.analyzeImage({
                text: `这是${data.banquetType}"${data.banquetName}"的主角照片。请根据照片中人物的气质、穿着、表情等，生成一段简短的感谢词，要求：
1. 真诚感谢嘉宾的到来和祝福
2. 符合${data.banquetType}的氛围
3. 可根据照片中人物展现的幸福、喜悦等特点进行个性化描述
4. 严格控制在20字以内

直接输出感谢词即可，不要包含标题。`,
                imageUrl: photoUrl,
            });
            if (!result.success || !result.content) {
                this.logger.warn('视觉模型调用失败，降级到文本生成');
                return this.generateThanksText(data);
            }
            return {
                code: 200,
                message: 'success',
                data: { thanks: result.content.trim() },
            };
        }
        return this.generateThanksText(data);
    }
    async generateThanksText(data) {
        const prompt = `请为${data.banquetType}"${data.banquetName}"生成一段感谢词，要求：
1. 真诚感谢，表达心意
2. 符合${data.banquetType}的氛围，融入中国传统文化元素
3. 严格控制在20字以内

直接输出感谢词即可。`;
        const result = await this.generateText({
            prompt,
            temperature: 0.8,
            maxTokens: 100,
        });
        if (!result.success || !result.content) {
            return {
                code: 500,
                message: result.error || '生成失败',
                error: result.error,
            };
        }
        return {
            code: 200,
            message: 'success',
            data: { thanks: result.content.trim() },
        };
    }
    async regenerateCard(data) {
        if (data.type === 'welcome') {
            const result = await this.generateWelcome({
                banquetType: data.banquetType,
                banquetName: data.banquetName,
                photos: data.photos,
            });
            return {
                code: result.code,
                message: result.message,
                data: result.data ? { content: result.data.welcome } : undefined,
                error: result.error,
            };
        }
        else {
            const result = await this.generateThanks({
                banquetType: data.banquetType,
                banquetName: data.banquetName,
                photos: data.photos,
            });
            return {
                code: result.code,
                message: result.message,
                data: result.data ? { content: result.data.thanks } : undefined,
                error: result.error,
            };
        }
    }
};
exports.UnifiedAIService = UnifiedAIService;
exports.UnifiedAIService = UnifiedAIService = UnifiedAIService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        siliconflow_service_1.SiliconflowService])
], UnifiedAIService);
//# sourceMappingURL=unified-ai.service.js.map