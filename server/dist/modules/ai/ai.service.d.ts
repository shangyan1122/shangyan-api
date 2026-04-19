export declare class AiService {
    private readonly logger;
    private llmClient;
    constructor();
    generateBlessing(data: {
        banquetType: string;
        banquetName: string;
        guestName: string;
    }): Promise<{
        code: number;
        message: string;
        data: {
            blessing: string;
        } | null;
    }>;
    generateWelcomeWithPhotos(data: {
        banquetType: string;
        banquetName: string;
        hostName?: string;
        photos: string[];
    }): Promise<{
        code: number;
        message: string;
        data: {
            welcome: string;
        } | null;
    }>;
    generateWelcome(data: {
        banquetType: string;
        banquetName: string;
        hostName: string;
    }): Promise<{
        code: number;
        message: string;
        data: {
            welcome: string;
        } | null;
    }>;
    generateThanksWithPhotos(data: {
        banquetType: string;
        banquetName: string;
        hostName?: string;
        photos: string[];
    }): Promise<{
        code: number;
        message: string;
        data: {
            thanks: string;
        } | null;
    }>;
    generateThanks(data: {
        banquetType: string;
        banquetName: string;
        hostName?: string;
        guestName?: string;
        amount?: number;
    }): Promise<{
        code: number;
        message: string;
        data: {
            thanks: string;
        } | null;
    }>;
}
