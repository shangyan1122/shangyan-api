import { AiService } from '../ai/ai.service';
import { WechatConfigService } from '@/common/services/wechat-config.service';
export declare class BanquetService {
    private readonly aiService;
    private readonly wechatConfig;
    private readonly logger;
    constructor(aiService: AiService, wechatConfig: WechatConfigService);
    getBanquets(hostOpenid: string, status?: string): Promise<any[]>;
    getBanquetById(id: string): Promise<any>;
    createBanquet(banquetData: any): Promise<any>;
    getBanquetQrcode(banquetId: string): Promise<{
        qrcodeUrl: string;
        page: string;
        scene: string;
        sceneFormat: string;
        originalId: string;
        tip: string | undefined;
        error?: undefined;
    } | {
        qrcodeUrl: string;
        page: string;
        scene: string;
        error: any;
        sceneFormat?: undefined;
        originalId?: undefined;
        tip?: undefined;
    }>;
    updateBanquet(id: string, data: any): Promise<void>;
    deleteBanquet(id: string): Promise<void>;
}
