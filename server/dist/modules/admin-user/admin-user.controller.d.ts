import { AdminUserService } from './admin-user.service';
export declare class AdminUserController {
    private readonly adminUserService;
    private readonly logger;
    constructor(adminUserService: AdminUserService);
    getUsers(page?: string, pageSize?: string, isVip?: string, search?: string): Promise<{
        code: number;
        msg: string;
        data: {
            list: any[];
            total: number;
            page: number;
            pageSize: number;
        };
    }>;
    getUserDetail(id: string): Promise<{
        code: number;
        msg: string;
        data: any;
    }>;
    setVipStatus(id: string, body: {
        isVip: boolean;
        expireDays?: number;
    }): Promise<{
        code: number;
        msg: string;
        data: null;
    }>;
}
