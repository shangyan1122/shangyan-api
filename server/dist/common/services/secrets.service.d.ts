export declare class SecretsService {
    private readonly logger;
    get(key: string, required?: boolean): string;
    getOptional(key: string): string;
    private isPlaceholder;
    validateRequiredSecrets(): {
        valid: boolean;
        missing: string[];
    };
    getWechatConfig(): {
        appId: string;
        appSecret: string;
    };
    getWechatPayConfig(): {
        mchId: string;
        apiKey: string;
        apiV3Key: string;
        serialNo: string;
        notifyUrl: string;
        pfxPath: string;
        pfxPassphrase: string;
    } | null;
    getSupabaseConfig(): {
        url: string;
        anonKey: string;
        serviceKey: string;
    };
    getDatabaseConfig(): {
        host: string;
        port: number;
        username: string;
        password: string;
        database: string;
        ssl: boolean | {
            rejectUnauthorized: boolean;
        };
    };
    isProduction(): boolean;
    isDevelopment(): boolean;
    getEnvironment(): string;
}
