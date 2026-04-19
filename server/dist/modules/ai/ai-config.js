"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelRecommendations = exports.defaultAIConfig = void 0;
exports.getAIConfig = getAIConfig;
exports.validateAIConfig = validateAIConfig;
exports.defaultAIConfig = {
    provider: 'siliconflow',
    siliconflow: {
        apiKey: process.env.SILICONFLOW_API_KEY || '',
        defaultTextModel: 'Qwen/Qwen2.5-7B-Instruct',
        defaultVisionModel: 'Qwen/Qwen2-VL-7B-Instruct',
        temperature: 0.7,
        maxTokens: 2000,
    },
    coze: {
        apiKey: process.env.COZE_API_KEY || '',
        botId: process.env.COZE_BOT_ID || '',
        apiBase: process.env.COZE_API_BASE || 'https://api.coze.cn',
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        defaultModel: 'gpt-4o-mini',
    },
};
exports.modelRecommendations = {
    cardGeneration: {
        recommended: 'Qwen/Qwen2.5-7B-Instruct',
        alternatives: ['deepseek-ai/DeepSeek-V2.5', 'THUDM/glm-4-9b-chat'],
        reasoning: '7B模型速度快、成本低，适合简短文本生成',
    },
    visionAnalysis: {
        recommended: 'Qwen/Qwen2-VL-7B-Instruct',
        alternatives: ['Qwen/Qwen2-VL-72B-Instruct', 'THUDM/glm-4v-9b'],
        reasoning: 'Qwen VL模型在中文理解和图片分析上表现优秀',
    },
    creativeThinking: {
        recommended: 'deepseek-ai/DeepSeek-R1',
        alternatives: ['deepseek-ai/DeepSeek-R1-Distill-Qwen-32B'],
        reasoning: 'DeepSeek R1有强大的推理能力，适合创意文案',
    },
};
function getAIConfig() {
    const env = process.env;
    return {
        provider: env.AI_PROVIDER || 'siliconflow',
        siliconflow: {
            apiKey: env.SILICONFLOW_API_KEY || '',
            defaultTextModel: env.SILICONFLOW_TEXT_MODEL || exports.defaultAIConfig.siliconflow.defaultTextModel,
            defaultVisionModel: env.SILICONFLOW_VISION_MODEL || exports.defaultAIConfig.siliconflow.defaultVisionModel,
            temperature: parseFloat(env.SILICONFLOW_TEMPERATURE || '0.7'),
            maxTokens: parseInt(env.SILICONFLOW_MAX_TOKENS || '2000', 10),
        },
        coze: {
            apiKey: env.COZE_API_KEY || '',
            botId: env.COZE_BOT_ID || '',
            apiBase: env.COZE_API_BASE || 'https://api.coze.cn',
        },
        openai: {
            apiKey: env.OPENAI_API_KEY || '',
            baseUrl: env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
            defaultModel: env.OPENAI_MODEL || 'gpt-4o-mini',
        },
    };
}
function validateAIConfig(config) {
    const errors = [];
    switch (config.provider) {
        case 'siliconflow':
            if (!config.siliconflow?.apiKey) {
                errors.push('硅基流动API密钥未配置，请设置 SILICONFLOW_API_KEY 环境变量');
            }
            break;
        case 'coze':
            if (!config.coze?.apiKey) {
                errors.push('Coze API密钥未配置，请设置 COZE_API_KEY 环境变量');
            }
            break;
        case 'openai':
            if (!config.openai?.apiKey) {
                errors.push('OpenAI API密钥未配置，请设置 OPENAI_API_KEY 环境变量');
            }
            break;
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
//# sourceMappingURL=ai-config.js.map