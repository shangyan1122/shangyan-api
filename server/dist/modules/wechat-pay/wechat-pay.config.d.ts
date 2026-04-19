export interface WechatPayConfig {
    appId: string;
    mchId: string;
    apiKey: string;
    apiV3Key: string;
    serialNo: string;
    privateKey: string;
    publicKey?: string;
    notifyUrl: string;
    certPath?: string;
    keyPath?: string;
    pfx?: Buffer;
}
export declare const wechatPayConfig: WechatPayConfig;
