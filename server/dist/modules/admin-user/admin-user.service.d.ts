export declare class AdminUserService {
    private readonly logger;
    getUsers(params: {
        page?: number;
        pageSize?: number;
        isVip?: boolean;
        search?: string;
    }): Promise<{
        code: number;
        msg: string;
        data: {
            list: any[];
            total: number;
            page: number;
            pageSize: number;
        };
    }>;
    getUserDetail(userId: string): Promise<{
        code: number;
        msg: string;
        data: any;
    }>;
    setVipStatus(userId: string, isVip: boolean, expireDays?: number): Promise<{
        code: number;
        msg: string;
        data: null;
    }>;
}
