"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wechatPayConfig = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
function loadPrivateKey() {
    const envKey = process.env.WECHAT_PRIVATE_KEY;
    if (envKey) {
        return envKey.replace(/\\n/g, '\n');
    }
    const keyPath = process.env.WECHAT_KEY_PATH || (0, path_1.join)(process.cwd(), 'certs', 'apiclient_key.pem');
    if ((0, fs_1.existsSync)(keyPath)) {
        try {
            return (0, fs_1.readFileSync)(keyPath, 'utf-8');
        }
        catch (e) {
            console.warn('读取商户私钥文件失败:', keyPath);
        }
    }
    return '';
}
function loadPfxCert() {
    const certPath = process.env.WECHAT_PFX_PATH || (0, path_1.join)(process.cwd(), 'certs', 'apiclient_cert.p12');
    if ((0, fs_1.existsSync)(certPath)) {
        try {
            return (0, fs_1.readFileSync)(certPath);
        }
        catch (e) {
            console.warn('读取商户证书文件失败:', certPath);
        }
    }
    return undefined;
}
exports.wechatPayConfig = {
    appId: process.env.WECHAT_APPID || process.env.WECHAT_APP_ID || 'wx_app_id',
    mchId: process.env.WECHAT_MCH_ID || process.env.WECHAT_PAY_MCH_ID || 'merchant_id',
    apiKey: process.env.WECHAT_API_KEY || process.env.WECHAT_PAY_API_KEY || 'your_api_key',
    apiV3Key: process.env.WECHAT_API_V3_KEY || 'your_api_v3_key',
    serialNo: process.env.WECHAT_SERIAL_NO || 'your_serial_no',
    privateKey: loadPrivateKey(),
    publicKey: process.env.WECHAT_PUBLIC_KEY,
    notifyUrl: process.env.WECHAT_NOTIFY_URL || 'https://your-domain.com/api/wechat-pay/notify',
    certPath: process.env.WECHAT_CERT_PATH || (0, path_1.join)(process.cwd(), 'certs', 'apiclient_cert.pem'),
    keyPath: process.env.WECHAT_KEY_PATH || (0, path_1.join)(process.cwd(), 'certs', 'apiclient_key.pem'),
    pfx: loadPfxCert(),
};
//# sourceMappingURL=wechat-pay.config.js.map