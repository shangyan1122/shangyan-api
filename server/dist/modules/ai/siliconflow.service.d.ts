import { ConfigService } from '@nestjs/config';
export interface SiliconFlowMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | Array<{
        type: 'text' | 'image_url';
        text?: string;
        image_url?: {
            url: string;
            detail?: 'low' | 'high' | 'auto';
        };
    }>;
}
export interface SiliconFlowRequest {
    model: string;
    messages: SiliconFlowMessage[];
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    stream?: boolean;
    thinking?: {
        type: 'enabled';
        budget_tokens?: number;
    };
}
export interface SiliconFlowResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    reasoning?: {
        content: string;
    };
}
export declare const SILICONFLOW_MODELS: {
    readonly DEEPSEEK_V2_5: "deepseek-ai/DeepSeek-V2.5";
    readonly DEEPSEEK_R1: "deepseek-ai/DeepSeek-R1";
    readonly DEEPSEEK_R1_DISTILL_QWAN_32B: "deepseek-ai/DeepSeek-R1-Distill-Qwan-32B";
    readonly QWEN_QWEN2_5_72B: "Qwen/Qwen2.5-72B-Instruct";
    readonly QWEN_QWEN2_5_32B: "Qwen/Qwen2.5-32B-Instruct";
    readonly QWEN_QWEN2_5_7B: "Qwen/Qwen2.5-7B-Instruct";
    readonly GLM_4_9B: "THUDM/glm-4-9b-chat";
    readonly GLM_4: "THUDM/glm-4-alltools";
    readonly QWEN_VL_MAX: "Qwen/Qwen2-VL-72B-Instruct";
    readonly QWEN_VL_FLASH: "Qwen/Qwen2-VL-7B-Instruct";
    readonly GLM_4V: "THUDM/glm-4v-9b";
    readonly QWEN_QWEN2_5_7B_INSTRUCT_Free: "Qwen/Qwen2.5-7B-Instruct";
    readonly DEEPSEEK_R1_FREE: "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B";
};
export type SiliconFlowModelType = (typeof SILICONFLOW_MODELS)[keyof typeof SILICONFLOW_MODELS];
export declare class SiliconflowService {
    private configService;
    private readonly logger;
    private client;
    private apiKey;
    private defaultTextModel;
    private defaultVisionModel;
    private defaultTemperature;
    private defaultMaxTokens;
    constructor(configService: ConfigService);
    setApiKey(apiKey: string): void;
    setDefaultModel(textModel?: string, visionModel?: string): void;
    chat(request: {
        messages: SiliconFlowMessage[];
        model?: SiliconFlowModelType;
        temperature?: number;
        max_tokens?: number;
        stream?: boolean;
        enable_thinking?: boolean;
        thinking_budget_tokens?: number;
    }): Promise<{
        success: boolean;
        content?: string;
        reasoning?: string;
        usage?: {
            prompt_tokens: number;
            completion_tokens: number;
            total_tokens: number;
        };
        error?: string;
    }>;
    visionChat(request: {
        messages: Array<{
            role: 'user' | 'assistant' | 'system';
            content: Array<{
                type: 'text' | 'image_url';
                text?: string;
                image_url?: {
                    url: string;
                    detail?: 'low' | 'high' | 'auto';
                };
            }>;
        }>;
        model?: SiliconFlowModelType;
        temperature?: number;
        max_tokens?: number;
    }): Promise<{
        success: boolean;
        content?: string;
        usage?: {
            prompt_tokens: number;
            completion_tokens: number;
            total_tokens: number;
        };
        error?: string;
    }>;
    generateText(prompt: string, options?: {
        model?: SiliconFlowModelType;
        temperature?: number;
        max_tokens?: number;
        systemPrompt?: string;
    }): Promise<{
        success: boolean;
        content?: string;
        error?: string;
    }>;
    getAvailableModels(): Array<{
        id: string;
        name: string;
        type: 'text' | 'vision' | 'thinking';
    }>;
}
