import { AdminAuthService } from './admin-auth.service';
export declare class AdminAuthController {
    private readonly adminAuthService;
    private readonly logger;
    constructor(adminAuthService: AdminAuthService);
    sendCode(body: {
        phone: string;
    }): Promise<{
        code: number;
        msg: string;
        data: null;
    }>;
    login(body: {
        phone: string;
        code: string;
    }): Promise<{
        code: number;
        msg: string;
        data: {
            token: string;
            user: any;
        } | null;
    }>;
    getProfile(auth: string): Promise<{
        code: number;
        msg: string;
        data: any;
    }>;
}
