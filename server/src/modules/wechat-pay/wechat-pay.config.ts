import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface WechatPayConfig {
  appId: string;
  mchId: string;
  apiKey: string;
  apiV3Key: string;
  serialNo: string;
  privateKey: string;
  publicKey?: string;
  notifyUrl: string;
  // 商户证书路径（用于转账等需要证书的接口）
  certPath?: string;
  keyPath?: string;
  pfx?: Buffer;
}

/**
 * 读取商户私钥文件
 */
function loadPrivateKey(): string {
  // 优先从环境变量读取
  const envKey = process.env.WECHAT_PRIVATE_KEY;
  if (envKey) {
    return envKey.replace(/\\n/g, '\n');
  }

  // 尝试从文件读取
  const keyPath = process.env.WECHAT_KEY_PATH || join(process.cwd(), 'certs', 'apiclient_key.pem');
  if (existsSync(keyPath)) {
    try {
      return readFileSync(keyPath, 'utf-8');
    } catch (e) {
      console.warn('读取商户私钥文件失败:', keyPath);
    }
  }

  return '';
}

/**
 * 读取商户证书文件（PFX格式，用于转账等操作）
 */
function loadPfxCert(): Buffer | undefined {
  const certPath =
    process.env.WECHAT_PFX_PATH || join(process.cwd(), 'certs', 'apiclient_cert.p12');
  if (existsSync(certPath)) {
    try {
      return readFileSync(certPath);
    } catch (e) {
      console.warn('读取商户证书文件失败:', certPath);
    }
  }
  return undefined;
}

export const wechatPayConfig: WechatPayConfig = {
  // 小程序 AppID
  appId: process.env.WECHAT_APPID || process.env.WECHAT_APP_ID || 'wx_app_id',

  // 商户号
  mchId: process.env.WECHAT_MCH_ID || process.env.WECHAT_PAY_MCH_ID || 'merchant_id',

  // API 密钥（V2）
  apiKey: process.env.WECHAT_API_KEY || process.env.WECHAT_PAY_API_KEY || 'your_api_key',

  // APIv3 密钥
  apiV3Key: process.env.WECHAT_API_V3_KEY || 'your_api_v3_key',

  // 商户证书序列号
  serialNo: process.env.WECHAT_SERIAL_NO || 'your_serial_no',

  // 商户私钥（从文件读取或环境变量）
  privateKey: loadPrivateKey(),

  // 平台公钥（可选）
  publicKey: process.env.WECHAT_PUBLIC_KEY,

  // 支付回调通知地址
  notifyUrl: process.env.WECHAT_NOTIFY_URL || 'https://your-domain.com/api/wechat-pay/notify',

  // 商户证书路径
  certPath: process.env.WECHAT_CERT_PATH || join(process.cwd(), 'certs', 'apiclient_cert.pem'),
  keyPath: process.env.WECHAT_KEY_PATH || join(process.cwd(), 'certs', 'apiclient_key.pem'),

  // PFX证书（用于转账等需要双向证书的接口）
  pfx: loadPfxCert(),
};
