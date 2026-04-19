export declare class TestController {
    private readonly logger;
    initData(): Promise<{
        code: number;
        msg: string;
        data: {
            message: string;
        };
    } | {
        code: number;
        msg: string;
        data: null;
    }>;
    private createTestUsers;
    private createTestBanquets;
    private createMerchantAccount;
    private createReturnGiftSettings;
    clearData(): Promise<{
        code: number;
        msg: string;
        data: null;
    }>;
    getStatus(): Promise<{
        code: number;
        msg: string;
        data: {
            testUsers: {
                openid: any;
                nickname: any;
            }[];
            testBanquets: {
                id: any;
                name: any;
                status: any;
            }[];
            sampleProducts: {
                id: any;
                name: any;
            }[];
            testMerchants: {
                id: any;
                merchant_name: any;
                balance: any;
            }[];
        };
    }>;
}
