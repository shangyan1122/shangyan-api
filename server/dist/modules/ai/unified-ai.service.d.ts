import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SiliconflowService } from './siliconflow.service';
export interface GenerateRequest {
    prompt: string;
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    enableThinking?: boolean;
}
export interface VisionRequest {
    text: string;
    imageUrl: string;
    model?: string;
    temperature?: number;
}
export declare class UnifiedAIService implements OnModuleInit {
    private configService;
    private siliconflowService;
    private readonly logger;
    private siliconflow;
    private currentProvider;
    constructor(configService: ConfigService, siliconflowService: SiliconflowService);
    onModuleInit(): void;
    getProvider(): string;
    getAvailableModels(): {
        id: string;
        name: string;
        type: "text" | "vision" | "thinking";
    }[];
    generateText(request: GenerateRequest): Promise<{
        success: boolean;
        content?: string;
        reasoning?: string;
        error?: string;
    }>;
    analyzeImage(request: VisionRequest): Promise<{
        success: boolean;
        content?: string;
        error?: string;
    }>;
    generateBlessing(data: {
        banquetType: string;
        banquetName: string;
        guestName?: string;
    }): Promise<{
        code: number;
        message: string;
        data?: {
            blessing: string;
        };
        error?: string;
    }>;
    generateWelcome(data: {
        banquetType: string;
        banquetName: string;
        hostName?: string;
        photos?: string[];
    }): Promise<{
        code: number;
        message: string;
        data?: {
            welcome: string;
        };
        error?: string;
    }>;
    private generateWelcomeText;
    generateThanks(data: {
        banquetType: string;
        banquetName: string;
        hostName?: string;
        photos?: string[];
    }): Promise<{
        code: number;
        message: string;
        data?: {
            thanks: string;
        };
        error?: string;
    }>;
    private generateThanksText;
    regenerateCard(data: {
        type: 'welcome' | 'thank';
        banquetType: string;
        banquetName: string;
        photos?: string[];
        isPaid?: boolean;
    }): Promise<{
        code: number;
        message: string;
        data?: {
            content: string;
        };
        error?: string;
    }>;
}
