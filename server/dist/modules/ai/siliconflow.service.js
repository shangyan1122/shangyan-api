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
var SiliconflowService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiliconflowService = exports.SILICONFLOW_MODELS = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const config_1 = require("@nestjs/config");
exports.SILICONFLOW_MODELS = {
    DEEPSEEK_V2_5: 'deepseek-ai/DeepSeek-V2.5',
    DEEPSEEK_R1: 'deepseek-ai/DeepSeek-R1',
    DEEPSEEK_R1_DISTILL_QWAN_32B: 'deepseek-ai/DeepSeek-R1-Distill-Qwan-32B',
    QWEN_QWEN2_5_72B: 'Qwen/Qwen2.5-72B-Instruct',
    QWEN_QWEN2_5_32B: 'Qwen/Qwen2.5-32B-Instruct',
    QWEN_QWEN2_5_7B: 'Qwen/Qwen2.5-7B-Instruct',
    GLM_4_9B: 'THUDM/glm-4-9b-chat',
    GLM_4: 'THUDM/glm-4-alltools',
    QWEN_VL_MAX: 'Qwen/Qwen2-VL-72B-Instruct',
    QWEN_VL_FLASH: 'Qwen/Qwen2-VL-7B-Instruct',
    GLM_4V: 'THUDM/glm-4v-9b',
    QWEN_QWEN2_5_7B_INSTRUCT_Free: 'Qwen/Qwen2.5-7B-Instruct',
    DEEPSEEK_R1_FREE: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
};
let SiliconflowService = SiliconflowService_1 = class SiliconflowService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(SiliconflowService_1.name);
        this.defaultTextModel = 'Qwen/Qwen2.5-7B-Instruct';
        this.defaultVisionModel = 'Qwen/Qwen2-VL-7B-Instruct';
        this.defaultTemperature = 0.7;
        this.defaultMaxTokens = 2000;
        this.apiKey = this.configService.get('SILICONFLOW_API_KEY') || '';
        if (!this.apiKey) {
            this.logger.warn('⚠️  SiliconFlow API密钥未配置，请设置 SILICONFLOW_API_KEY 环境变量');
        }
        this.client = axios_1.default.create({
            baseURL: 'https://api.siliconflow.cn/v1',
            timeout: 60000,
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
        });
        this.client.interceptors.response.use((response) => response, (error) => {
            this.logger.error('SiliconFlow API请求失败:', error.response?.data || error.message);
            throw error;
        });
    }
    setApiKey(apiKey) {
        this.apiKey = apiKey;
        this.client.defaults.headers['Authorization'] = `Bearer ${apiKey}`;
    }
    setDefaultModel(textModel, visionModel) {
        if (textModel)
            this.defaultTextModel = textModel;
        if (visionModel)
            this.defaultVisionModel = visionModel;
    }
    async chat(request) {
        try {
            const model = request.model || this.defaultTextModel;
            const temperature = request.temperature ?? this.defaultTemperature;
            const max_tokens = request.max_tokens || this.defaultMaxTokens;
            const payload = {
                model,
                messages: request.messages,
                temperature,
                max_tokens,
                stream: request.stream ?? false,
            };
            if (request.enable_thinking) {
                payload.thinking = {
                    type: 'enabled',
                    budget_tokens: request.thinking_budget_tokens || 4000,
                };
            }
            this.logger.log(`🤖 调用硅基流动 API: ${model}`);
            const response = await this.client.post('/chat/completions', payload);
            const result = response.data;
            const choice = result.choices[0];
            return {
                success: true,
                content: choice.message.content,
                reasoning: result.reasoning?.content,
                usage: result.usage,
            };
        }
        catch (error) {
            const errorMessage = error.response?.data?.error?.message || error.message || '未知错误';
            this.logger.error(`❌ 硅基流动API调用失败: ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }
    async visionChat(request) {
        try {
            const model = request.model || this.defaultVisionModel;
            const temperature = request.temperature ?? this.defaultTemperature;
            const max_tokens = request.max_tokens || 2000;
            const payload = {
                model,
                messages: request.messages,
                temperature,
                max_tokens,
            };
            this.logger.log(`🖼️ 调用硅基流动视觉模型: ${model}`);
            const response = await this.client.post('/chat/completions', payload);
            const result = response.data;
            const choice = result.choices[0];
            return {
                success: true,
                content: choice.message.content,
                usage: result.usage,
            };
        }
        catch (error) {
            const errorMessage = error.response?.data?.error?.message || error.message || '未知错误';
            this.logger.error(`❌ 硅基流动视觉API调用失败: ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
            };
        }
    }
    async generateText(prompt, options) {
        const messages = [];
        if (options?.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt });
        }
        messages.push({ role: 'user', content: prompt });
        const result = await this.chat({
            messages,
            model: options?.model,
            temperature: options?.temperature,
            max_tokens: options?.max_tokens,
        });
        return {
            success: result.success,
            content: result.content,
            error: result.error,
        };
    }
    getAvailableModels() {
        return [
            { id: exports.SILICONFLOW_MODELS.DEEPSEEK_V2_5, name: 'DeepSeek-V2.5', type: 'text' },
            { id: exports.SILICONFLOW_MODELS.QWEN_QWEN2_5_72B, name: 'Qwen2.5-72B', type: 'text' },
            { id: exports.SILICONFLOW_MODELS.QWEN_QWEN2_5_32B, name: 'Qwen2.5-32B', type: 'text' },
            { id: exports.SILICONFLOW_MODELS.QWEN_QWEN2_5_7B, name: 'Qwen2.5-7B', type: 'text' },
            { id: exports.SILICONFLOW_MODELS.GLM_4_9B, name: 'GLM-4-9B', type: 'text' },
            { id: exports.SILICONFLOW_MODELS.DEEPSEEK_R1, name: 'DeepSeek-R1 (思考)', type: 'thinking' },
            {
                id: exports.SILICONFLOW_MODELS.DEEPSEEK_R1_DISTILL_QWAN_32B,
                name: 'DeepSeek-R1-Distill-Qwan-32B',
                type: 'thinking',
            },
            { id: exports.SILICONFLOW_MODELS.QWEN_VL_MAX, name: 'Qwen2-VL-72B (视觉)', type: 'vision' },
            { id: exports.SILICONFLOW_MODELS.QWEN_VL_FLASH, name: 'Qwen2-VL-7B (视觉)', type: 'vision' },
            { id: exports.SILICONFLOW_MODELS.GLM_4V, name: 'GLM-4V-9B (视觉)', type: 'vision' },
        ];
    }
};
exports.SiliconflowService = SiliconflowService;
exports.SiliconflowService = SiliconflowService = SiliconflowService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SiliconflowService);
//# sourceMappingURL=siliconflow.service.js.map