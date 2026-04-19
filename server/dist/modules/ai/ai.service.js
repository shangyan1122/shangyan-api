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
var AiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const coze_coding_dev_sdk_1 = require("coze-coding-dev-sdk");
let AiService = AiService_1 = class AiService {
    constructor() {
        this.logger = new common_1.Logger(AiService_1.name);
        const config = new coze_coding_dev_sdk_1.Config();
        this.llmClient = new coze_coding_dev_sdk_1.LLMClient(config);
    }
    async generateBlessing(data) {
        try {
            const prompt = `请为${data.guestName}参加${data.banquetType}"${data.banquetName}"生成一句温馨的祝福语，要求：
1. 符合${data.banquetType}的喜庆氛围
2. 简洁优美，20字以内
3. 不要包含"祝"、"愿"等开头词

直接输出祝福语即可，不要其他内容。`;
            const messages = [{ role: 'user', content: prompt }];
            const response = await this.llmClient.invoke(messages, {
                model: 'doubao-seed-1-6-lite-251015',
                temperature: 0.8,
            });
            return {
                code: 200,
                message: 'success',
                data: {
                    blessing: response.content,
                },
            };
        }
        catch (error) {
            this.logger.error('生成祝福语失败:', error);
            return {
                code: 500,
                message: '生成失败',
                data: null,
            };
        }
    }
    async generateWelcomeWithPhotos(data) {
        try {
            const { banquetType, banquetName, hostName, photos } = data;
            if (photos && photos.length > 0) {
                const coverPhoto = photos[0];
                const messages = [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `这是${banquetType}"${banquetName}"的主角照片。请根据照片中人物的气质、穿着、表情等，生成一段简短的欢迎词，要求：
1. 温馨感人，体现主人的热情好客
2. 符合${banquetType}的喜庆氛围
3. 可根据照片中人物的特点（如气质优雅、笑容灿烂等）进行个性化描述
4. 严格控制在20字以内

直接输出欢迎词即可，不要包含标题。`,
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: coverPhoto,
                                    detail: 'low',
                                },
                            },
                        ],
                    },
                ];
                const response = await this.llmClient.invoke(messages, {
                    model: 'doubao-seed-1-6-vision-250815',
                    temperature: 0.8,
                });
                return {
                    code: 200,
                    message: 'success',
                    data: {
                        welcome: response.content,
                    },
                };
            }
            return this.generateWelcome({
                banquetType,
                banquetName,
                hostName: hostName || '',
            });
        }
        catch (error) {
            this.logger.error('生成欢迎词失败:', error);
            return this.generateWelcome({
                banquetType: data.banquetType,
                banquetName: data.banquetName,
                hostName: data.hostName || '',
            });
        }
    }
    async generateWelcome(data) {
        try {
            const prompt = `请为${data.banquetType}"${data.banquetName}"生成一段欢迎词${data.hostName ? `，主人是${data.hostName}` : ''}，要求：
1. 温馨感人，体现主人的热情
2. 符合${data.banquetType}的氛围，融入中国传统文化元素
3. 严格控制在20字以内

直接输出欢迎词即可。`;
            const messages = [{ role: 'user', content: prompt }];
            const response = await this.llmClient.invoke(messages, {
                model: 'doubao-seed-1-6-lite-251015',
                temperature: 0.8,
            });
            return {
                code: 200,
                message: 'success',
                data: {
                    welcome: response.content,
                },
            };
        }
        catch (error) {
            this.logger.error('生成欢迎词失败:', error);
            return {
                code: 500,
                message: '生成失败',
                data: null,
            };
        }
    }
    async generateThanksWithPhotos(data) {
        try {
            const { banquetType, banquetName, hostName, photos } = data;
            if (photos && photos.length > 0) {
                const coverPhoto = photos[0];
                const messages = [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `这是${banquetType}"${banquetName}"的主角照片。请根据照片中人物的气质、穿着、表情等，生成一段简短的感谢词，要求：
1. 真诚感谢嘉宾的到来和祝福
2. 符合${banquetType}的氛围
3. 可根据照片中人物展现的幸福、喜悦等特点进行个性化描述
4. 严格控制在20字以内

直接输出感谢词即可，不要包含标题。`,
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: coverPhoto,
                                    detail: 'low',
                                },
                            },
                        ],
                    },
                ];
                const response = await this.llmClient.invoke(messages, {
                    model: 'doubao-seed-1-6-vision-250815',
                    temperature: 0.8,
                });
                return {
                    code: 200,
                    message: 'success',
                    data: {
                        thanks: response.content,
                    },
                };
            }
            return this.generateThanks({
                banquetType,
                banquetName,
                hostName: hostName || '',
            });
        }
        catch (error) {
            this.logger.error('生成感谢词失败:', error);
            return this.generateThanks({
                banquetType: data.banquetType,
                banquetName: data.banquetName,
                hostName: data.hostName || '',
            });
        }
    }
    async generateThanks(data) {
        try {
            const prompt = `请为${data.banquetType}"${data.banquetName}"生成一段感谢词，要求：
1. 真诚感谢，表达心意
2. 符合${data.banquetType}的氛围，融入中国传统文化元素
3. 严格控制在20字以内

直接输出感谢词即可。`;
            const messages = [{ role: 'user', content: prompt }];
            const response = await this.llmClient.invoke(messages, {
                model: 'doubao-seed-1-6-lite-251015',
                temperature: 0.8,
            });
            return {
                code: 200,
                message: 'success',
                data: {
                    thanks: response.content,
                },
            };
        }
        catch (error) {
            this.logger.error('生成感谢词失败:', error);
            return {
                code: 500,
                message: '生成失败',
                data: null,
            };
        }
    }
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AiService);
//# sourceMappingURL=ai.service.js.map