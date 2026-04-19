import { ConfigService } from '@nestjs/config';
import { TencentSmsService } from '@/common/services/tencent-sms.service';
export declare class AdminAuthService {
    private configService;
    private smsService;
    private readonly logger;
    private readonly jwtSecret;
    private readonly codeExpireMinutes;
    private readonly maxCodeAttempts;
    private readonly codeCleanInterval;
    constructor(configService: ConfigService, smsService: TencentSmsService);
    private startCodeCleanup;
    private isPhoneAuthorized;
    getAuthorizedPhones(): string[];
    sendLoginCode(phone: string): Promise<{
        code: number;
        msg: string;
        data: null;
    }>;
    login(phone: string, code: string): Promise<{
        code: number;
        msg: string;
        data: {
            token: string;
            user: any;
        } | null;
    }>;
    private findOrCreateAdmin;
    getProfile(adminId: string): Promise<{
        code: number;
        msg: string;
        data: any;
    }>;
    getAdminList(): Promise<{
        code: number;
        msg: string;
        data: any[];
    }>;
    updateAdmin(adminId: string, updates: {
        name?: string;
        role?: string;
        status?: string;
    }): Promise<{
        code: number;
        msg: string;
    }>;
    private generateToken;
    verifyToken(token: string): any;
    refreshToken(token: string): Promise<{
        code: number;
        msg: string;
        data: {
            token: string;
        } | null;
    }>;
}
