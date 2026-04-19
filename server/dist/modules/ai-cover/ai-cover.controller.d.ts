import { AICoverService } from './ai-cover.service';
export declare class AICoverController {
    private readonly aiCoverService;
    private readonly logger;
    constructor(aiCoverService: AICoverService);
    generateCover(body: {
        banquetType: string;
        banquetName: string;
        style?: 'traditional' | 'modern' | 'elegant' | 'festive';
        customPrompt?: string;
    }): Promise<{
        code: number;
        msg: string;
        data: {
            url: string;
        };
    } | {
        code: number;
        msg: any;
        data: null;
    }>;
    generateInvitation(body: {
        banquetType: string;
        banquetName: string;
        hostName: string;
        banquetTime: string;
        banquetLocation: string;
        style?: 'traditional' | 'modern' | 'elegant';
    }): Promise<{
        code: number;
        msg: string;
        data: {
            url: string;
        };
    } | {
        code: number;
        msg: any;
        data: null;
    }>;
}
