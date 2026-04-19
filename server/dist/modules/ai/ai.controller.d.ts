import { UnifiedAIService } from './unified-ai.service';
import { SiliconflowService } from './siliconflow.service';
export declare class AIController {
    private readonly aiService;
    private readonly siliconflowService;
    constructor(aiService: UnifiedAIService, siliconflowService: SiliconflowService);
    getStatus(): Promise<{
        code: number;
        message: string;
        data: {
            provider: "siliconflow" | "coze" | "openai" | "azure";
            configured: boolean;
            errors: string[];
            models: {
                id: string;
                name: string;
                type: "text" | "vision" | "thinking";
            }[];
        };
    }>;
    getModels(): Promise<{
        code: number;
        message: string;
        data: {
            models: {
                id: string;
                name: string;
                type: "text" | "vision" | "thinking";
            }[];
        };
    }>;
    generateBlessing(body: {
        banquetType: string;
        banquetName: string;
        guestName: string;
    }): Promise<{
        code: number;
        message: string;
        data: {
            blessing: string;
        } | null;
        error: string | undefined;
    }>;
    generateWelcome(body: {
        banquetType: string;
        banquetName: string;
        hostName?: string;
        isPaid?: boolean;
        guestName?: string;
        photos?: string[];
    }): Promise<{
        code: number;
        message: string;
        data: {
            welcome: string;
        } | null;
        error: string | undefined;
    }>;
    generateThanks(body: {
        banquetType: string;
        banquetName: string;
        hostName?: string;
        guestName?: string;
        amount?: number;
        isPaid?: boolean;
        photos?: string[];
    }): Promise<{
        code: number;
        message: string;
        data: {
            thanks: string;
        } | null;
        error: string | undefined;
    }>;
    regenerateCard(body: {
        banquetId: string;
        type: 'welcome' | 'thank';
        banquetType: string;
        banquetName: string;
        photos?: string[];
        isPaid?: boolean;
    }): Promise<{
        code: number;
        message: string;
        data: null;
    } | {
        code: number;
        message: string;
        data: {
            content: string;
        };
    }>;
    generateGuestWelcome(body: {
        banquetId: string;
        guestName: string;
        banquetType: string;
        banquetName: string;
        hostName: string;
    }): Promise<{
        code: number;
        message: string;
        data: null;
    } | {
        code: number;
        message: string;
        data: {
            content: string;
        };
    }>;
    generateGuestThanks(body: {
        banquetId: string;
        guestName: string;
        banquetType: string;
        banquetName: string;
        amount?: number;
    }): Promise<{
        code: number;
        message: string;
        data: null;
    } | {
        code: number;
        message: string;
        data: {
            content: string;
        };
    }>;
    getGuestCard(body: {
        banquetId: string;
        guestName: string;
        cardType: 'welcome' | 'thank';
    }): Promise<{
        code: number;
        message: string;
        data: null;
    } | {
        code: number;
        message: string;
        data: {
            content: any;
        };
    }>;
}
