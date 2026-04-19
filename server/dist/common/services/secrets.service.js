"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SecretsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretsService = void 0;
const common_1 = require("@nestjs/common");
let SecretsService = SecretsService_1 = class SecretsService {
    constructor() {
        this.logger = new common_1.Logger(SecretsService_1.name);
    }
    get(key, required = true) {
        const value = process.env[key];
        if (!value) {
            if (required) {
                this.logger.error(`必需的密钥未配置: ${key}`);
                throw new Error(`密钥未配置: ${key}。请在环境变量中设置此密钥。`);
            }
            this.logger.warn(`可选密钥未配置: ${key}`);
            return '';
        }
        if (this.isPlaceholder(value)) {
            if (required) {
                this.logger.error(`密钥 ${key} 使用了占位符值，请更换为真实密钥`);
                throw new Error(`密钥 ${key} 使用了占位符值，生产环境必须使用真实密钥`);
            }
            this.logger.warn(`密钥 ${key} 使用了占位符值`);
        }
        return value;
    }
    getOptional(key) {
        return this.get(key, false);
    }
    isPlaceholder(value) {
        const placeholders = [
            'your_',
            'placeholder',
            'test_',
            'mock_',
            'dummy_',
            'example_',
            'xxx',
            '###',
        ];
        return placeholders.some((p) => value.toLowerCase().startsWith(p));
    }
    validateRequiredSecrets() {
        const requiredSecrets = [
            'WECHAT_APP_ID',
            'WECHAT_APP_SECRET',
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY',
            'DATABASE_URL',
        ];
        const missing = [];
        for (const key of requiredSecrets) {
            const value = process.env[key];
            if (!value || this.isPlaceholder(value)) {
                missing.push(key);
            }
        }
        if (missing.length > 0) {
            this.logger.warn(`以下必需密钥未配置或使用了占位符: ${missing.join(', ')}`);
            this.logger.warn('生产环境必须配置真实密钥，请参考部署文档');
        }
        else {
            this.logger.log('✅ 所有必需密钥已配置');
        }
        return {
            valid: missing.length === 0,
            missing,
        };
    }
    getWechatConfig() {
        return {
            appId: this.get('WECHAT_APP_ID'),
            appSecret: this.get('WECHAT_APP_SECRET'),
        };
    }
    getWechatPayConfig() {
        const mchId = this.getOptional('WECHAT_MCH_ID');
        if (!mchId) {
            this.logger.warn('微信支付未配置，支付功能将使用模拟模式');
            return null;
        }
        return {
            mchId,
            apiKey: this.get('WECHAT_PAY_API_KEY'),
            apiV3Key: this.get('WECHAT_API_V3_KEY'),
            serialNo: this.getOptional('WECHAT_SERIAL_NO'),
            notifyUrl: this.getOptional('WECHAT_NOTIFY_URL'),
            pfxPath: this.getOptional('WECHAT_PFX_PATH'),
            pfxPassphrase: this.getOptional('WECHAT_PFX_PASSPHRASE'),
        };
    }
    getSupabaseConfig() {
        return {
            url: this.get('SUPABASE_URL'),
            anonKey: this.get('SUPABASE_ANON_KEY'),
            serviceKey: this.getOptional('SUPABASE_SERVICE_KEY'),
        };
    }
    getDatabaseConfig() {
        const databaseUrl = this.get('DATABASE_URL');
        try {
            const url = new URL(databaseUrl);
            return {
                host: url.hostname,
                port: parseInt(url.port) || 5432,
                username: url.username,
                password: url.password,
                database: url.pathname.slice(1),
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            };
        }
        catch (e) {
            this.logger.error('数据库URL格式错误');
            throw new Error('DATABASE_URL 格式错误，请检查配置');
        }
    }
    isProduction() {
        return process.env.NODE_ENV === 'production';
    }
    isDevelopment() {
        return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    }
    getEnvironment() {
        return process.env.NODE_ENV || 'development';
    }
};
exports.SecretsService = SecretsService;
exports.SecretsService = SecretsService = SecretsService_1 = __decorate([
    (0, common_1.Injectable)()
], SecretsService);
//# sourceMappingURL=secrets.service.js.map