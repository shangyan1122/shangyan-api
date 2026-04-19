export declare class AICoverService {
    private readonly logger;
    private imageClient;
    constructor();
    generateBanquetCover(params: {
        banquetType: string;
        banquetName: string;
        style?: 'traditional' | 'modern' | 'elegant' | 'festive';
        customPrompt?: string;
    }): Promise<string>;
    private buildPrompt;
    generateInvitationCover(params: {
        banquetType: string;
        banquetName: string;
        hostName: string;
        banquetTime: string;
        banquetLocation: string;
        style?: 'traditional' | 'modern' | 'elegant';
    }): Promise<string>;
    private buildInvitationPrompt;
    private downloadImage;
}
