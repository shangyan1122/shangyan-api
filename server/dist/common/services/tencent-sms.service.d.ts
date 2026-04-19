import { ConfigService } from '@nestjs/config';
export interface SendSmsRequest {
    PhoneNumberSet: string[];
    TemplateId: string;
    SmsSdkAppId: string;
    SignName: string;
    TemplateParamSet?: string[];
}
export interface SendSmsResult {
    success: boolean;
    message?: string;
    error?: string;
    serialNo?: string;
}
export declare class TencentSmsService {
    private configService;
    private readonly logger;
    private client;
    private appId;
    private appKey;
    private loginTemplateId;
    private sign;
    private region;
    private sendLog;
    private readonly MAX_SENDS_PER_HOUR;
    private readonly MIN_INTERVAL_MS;
    constructor(configService: ConfigService);
    private init;
    private checkSendLimit;
    private updateSendLog;
    sendLoginCode(phone: string, code: string): Promise<SendSmsResult>;
    sendSms(phone: string, templateId: string, params: string[]): Promise<SendSmsResult>;
    batchSendSms(phones: string[], templateId: string, params: string[]): Promise<{
        success: boolean;
        results: Array<{
            phone: string;
            success: boolean;
            error?: string;
        }>;
    }>;
}
