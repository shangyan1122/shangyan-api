import { Request } from 'express';
export declare class AuditLogService {
    private readonly logger;
    log(params: {
        openid: string;
        action: string;
        resource: string;
        resourceId?: string;
        details?: any;
        request?: Request;
    }): Promise<void>;
    logLogin(openid: string, request?: Request, success?: boolean): Promise<void>;
    logLogout(openid: string, request?: Request): Promise<void>;
    logPayment(params: {
        openid: string;
        banquetId: string;
        amount: number;
        status: 'created' | 'success' | 'failed';
        transactionId?: string;
        request?: Request;
    }): Promise<void>;
    logWithdraw(params: {
        openid: string;
        amount: number;
        status: 'applied' | 'success' | 'failed';
        withdrawId?: string;
        request?: Request;
    }): Promise<void>;
    logDataAccess(params: {
        openid: string;
        dataType: string;
        dataId: string;
        action: 'read' | 'update' | 'delete' | 'export';
        request?: Request;
    }): Promise<void>;
    logPermissionDenied(params: {
        openid: string;
        resource: string;
        action: string;
        reason?: string;
        request?: Request;
    }): Promise<void>;
    queryLogs(params: {
        openid?: string;
        action?: string;
        resource?: string;
        startDate?: Date;
        endDate?: Date;
        page?: number;
        pageSize?: number;
    }): Promise<{
        logs: any[];
        total: number;
    }>;
    detectAnomalousActivity(openid: string): Promise<{
        isAnomalous: boolean;
        reasons: string[];
    }>;
    private extractIpAddress;
}
