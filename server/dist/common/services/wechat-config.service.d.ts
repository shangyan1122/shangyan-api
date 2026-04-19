export declare class WechatConfigService {
    private readonly logger;
    private readonly appId;
    private readonly appSecret;
    private accessToken;
    private tokenExpireTime;
    isConfigured(): boolean;
    getAppId(): string;
    getAccessToken(): Promise<string>;
    generateMiniProgramCode(scene: string, page?: string, width?: number): Promise<{
        base64: string;
        url: string;
        scene: string;
    }>;
    login(code: string): Promise<{
        openid: string;
        sessionKey: string;
    }>;
    sendTemplateMessage(openid: string, templateId: string, data: Record<string, {
        value: string;
    }>, page?: string): Promise<boolean>;
}
