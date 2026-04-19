import { Alibaba1688Service, Alibaba1688Config, DropshipOrder } from './alibaba-1688.service';
export declare class Alibaba1688Controller {
    private readonly alibaba1688Service;
    private readonly logger;
    constructor(alibaba1688Service: Alibaba1688Service);
    getConfig(): Promise<{
        code: number;
        msg: string;
        data: Alibaba1688Config | null;
    }>;
    saveConfig(body: Partial<Alibaba1688Config>): Promise<{
        code: number;
        msg: string;
        data: Alibaba1688Config | null;
    }>;
    updateConfig(id: string, body: Partial<Alibaba1688Config>): Promise<{
        code: number;
        msg: string;
        data: Alibaba1688Config | null;
    }>;
    toggleDropship(body: {
        enabled: boolean;
    }): Promise<{
        code: number;
        msg: string;
    }>;
    getStatus(): Promise<{
        code: number;
        msg: string;
        data: {
            enabled: boolean;
        };
    }>;
    getOrders(banquetId?: string, status?: string, limit?: string, offset?: string): Promise<{
        code: number;
        msg: string;
        data: {
            orders: DropshipOrder[];
            total: number;
        };
    }>;
    getOrderById(id: string): Promise<{
        code: number;
        msg: string;
        data: DropshipOrder | null;
    }>;
    syncLogistics(id: string): Promise<{
        code: number;
        msg: string;
    }>;
    syncAllLogistics(): Promise<{
        code: number;
        msg: string;
    }>;
    getStats(banquetId?: string): Promise<{
        code: number;
        msg: string;
        data: any;
    }>;
}
