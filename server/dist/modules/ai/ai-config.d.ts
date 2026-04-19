export interface AIConfig {
    provider: 'siliconflow' | 'coze' | 'openai' | 'azure';
    siliconflow?: {
        apiKey: string;
        defaultTextModel: string;
        defaultVisionModel: string;
        temperature: number;
        maxTokens: number;
    };
    coze?: {
        apiKey: string;
        botId: string;
        apiBase: string;
    };
    openai?: {
        apiKey: string;
        baseUrl: string;
        defaultModel: string;
    };
}
export declare const defaultAIConfig: AIConfig;
export declare const modelRecommendations: {
    cardGeneration: {
        recommended: string;
        alternatives: string[];
        reasoning: string;
    };
    visionAnalysis: {
        recommended: string;
        alternatives: string[];
        reasoning: string;
    };
    creativeThinking: {
        recommended: string;
        alternatives: string[];
        reasoning: string;
    };
};
export declare function getAIConfig(): AIConfig;
export declare function validateAIConfig(config: AIConfig): {
    valid: boolean;
    errors: string[];
};
