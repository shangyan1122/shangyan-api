"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TencentSmsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TencentSmsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const tencentcloud = __importStar(require("tencentcloud-sdk-nodejs"));
const SmsClient = tencentcloud.sms.v20210111.Client;
let TencentSmsService = TencentSmsService_1 = class TencentSmsService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(TencentSmsService_1.name);
        this.appId = '';
        this.appKey = '';
        this.loginTemplateId = '';
        this.sign = '';
        this.region = 'ap-guangzhou';
        this.sendLog = new Map();
        this.MAX_SENDS_PER_HOUR = 10;
        this.MIN_INTERVAL_MS = 60000;
        this.init();
    }
    init() {
        const secretId = this.configService.get('TENCENT_SMS_SECRET_ID') ||
            this.configService.get('TENCENT_CLOUD_SECRET_ID') ||
            '';
        const secretKey = this.configService.get('TENCENT_SMS_SECRET_KEY') ||
            this.configService.get('TENCENT_CLOUD_SECRET_KEY') ||
            '';
        this.appId =
            this.configService.get('TENCENT_SMS_SDK_APP_ID') ||
                this.configService.get('TENCENT_SMS_APP_ID') ||
                '';
        this.appKey = this.configService.get('TENCENT_SMS_APP_KEY') || '';
        this.loginTemplateId =
            this.configService.get('TENCENT_SMS_TEMPLATE_ID') ||
                this.configService.get('TENCENT_SMS_LOGIN_TEMPLATE_ID') ||
                '';
        this.sign =
            this.configService.get('TENCENT_SMS_SIGN_NAME') ||
                this.configService.get('TENCENT_SMS_SIGN') ||
                '尚宴礼记';
        this.region = this.configService.get('TENCENT_SMS_REGION') || 'ap-guangzhou';
        this.logger.log(`📋 腾讯云短信配置检查:`);
        this.logger.log(`  SecretId: ${secretId ? '✓ 已配置' : '✗ 未配置'}`);
        this.logger.log(`  SecretKey: ${secretKey ? '✓ 已配置' : '✗ 未配置'}`);
        this.logger.log(`  SdkAppId: ${this.appId ? '✓ 已配置' : '✗ 未配置'}`);
        this.logger.log(`  AppKey: ${this.appKey ? '✓ 已配置' : '✗ 未配置'}`);
        this.logger.log(`  TemplateId: ${this.loginTemplateId ? '✓ 已配置' : '✗ 未配置'}`);
        this.logger.log(`  Sign: ${this.sign ? '✓ 已配置' : '✗ 未配置'}`);
        if (!this.loginTemplateId) {
            this.logger.warn('⚠️ 腾讯云短信模板ID未配置');
            return;
        }
        try {
            if (!secretId || !secretKey) {
                this.logger.warn('⚠️ 腾讯云 SecretId/SecretKey 未配置，短信功能不可用');
                this.logger.warn('请在 Railway 环境变量中设置:');
                this.logger.warn('  TENCENT_CLOUD_SECRET_ID=你的SecretId');
                this.logger.warn('  TENCENT_CLOUD_SECRET_KEY=你的SecretKey');
                return;
            }
            const clientConfig = {
                credential: {
                    secretId: secretId,
                    secretKey: secretKey,
                },
                region: this.region,
                profile: {
                    httpProfile: {
                        endpoint: 'sms.tencentcloudapi.com',
                    },
                },
            };
            this.client = new SmsClient(clientConfig);
            this.logger.log('✅ 腾讯云短信服务初始化成功');
        }
        catch (error) {
            this.logger.error('❌ 初始化腾讯云短信客户端失败:', error);
        }
    }
    checkSendLimit(phone) {
        const now = Date.now();
        const log = this.sendLog.get(phone);
        if (!log) {
            return { allowed: true, message: '' };
        }
        if (now - log.lastSendTime < this.MIN_INTERVAL_MS) {
            return {
                allowed: false,
                message: `请${Math.ceil((this.MIN_INTERVAL_MS - (now - log.lastSendTime)) / 1000)}秒后再试`,
            };
        }
        if (log.count >= this.MAX_SENDS_PER_HOUR) {
            return {
                allowed: false,
                message: '发送次数超限，请稍后再试',
            };
        }
        return { allowed: true, message: '' };
    }
    updateSendLog(phone) {
        const now = Date.now();
        const log = this.sendLog.get(phone);
        if (log && now - log.lastSendTime > 3600000) {
            this.sendLog.set(phone, { count: 1, lastSendTime: now });
        }
        else if (log) {
            log.count++;
            log.lastSendTime = now;
        }
        else {
            this.sendLog.set(phone, { count: 1, lastSendTime: now });
        }
    }
    async sendLoginCode(phone, code) {
        this.logger.log(`发送登录验证码: phone=${phone}, code=${code}`);
        if (!this.client) {
            this.logger.warn('短信客户端未初始化，模拟发送成功');
            this.updateSendLog(phone);
            return {
                success: true,
                message: '模拟发送成功（开发模式）',
                serialNo: `mock_${Date.now()}`,
            };
        }
        const check = this.checkSendLimit(phone);
        if (!check.allowed) {
            return {
                success: false,
                error: check.message,
            };
        }
        try {
            const params = {
                PhoneNumberSet: [`+86${phone}`],
                TemplateId: this.loginTemplateId,
                SmsSdkAppId: this.appId,
                SignName: this.sign,
                TemplateParamSet: [code, '5'],
            };
            const response = await this.client.SendSms(params);
            const sendStatusSet = response.SendStatusSet || [];
            if (sendStatusSet.length > 0) {
                const status = sendStatusSet[0];
                if (status.Code === 'Ok') {
                    this.updateSendLog(phone);
                    this.logger.log(`短信发送成功: SerialNo=${status.SerialNo}`);
                    return {
                        success: true,
                        message: '发送成功',
                        serialNo: status.SerialNo,
                    };
                }
                else {
                    this.logger.error(`短信发送失败: ${status.Code} - ${status.Message}`);
                    return {
                        success: false,
                        error: status.Message || '发送失败',
                    };
                }
            }
            return {
                success: false,
                error: '发送失败，未收到响应',
            };
        }
        catch (error) {
            this.logger.error('发送短信异常:', error);
            return {
                success: false,
                error: error.message || '发送失败',
            };
        }
    }
    async sendSms(phone, templateId, params) {
        if (!this.client) {
            this.logger.warn('短信客户端未初始化');
            return {
                success: false,
                error: '短信服务未配置',
            };
        }
        try {
            const requestParams = {
                PhoneNumberSet: [`+86${phone}`],
                TemplateId: templateId,
                SmsSdkAppId: this.appId,
                SignName: this.sign,
                TemplateParamSet: params,
            };
            const response = await this.client.SendSms(requestParams);
            const sendStatusSet = response.SendStatusSet || [];
            if (sendStatusSet.length > 0 && sendStatusSet[0].Code === 'Ok') {
                return {
                    success: true,
                    serialNo: sendStatusSet[0].SerialNo,
                };
            }
            return {
                success: false,
                error: sendStatusSet[0]?.Message || '发送失败',
            };
        }
        catch (error) {
            this.logger.error('发送短信异常:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
    async batchSendSms(phones, templateId, params) {
        if (!this.client) {
            return {
                success: false,
                results: phones.map((phone) => ({ phone, success: false, error: '短信服务未配置' })),
            };
        }
        const results = [];
        for (const phone of phones) {
            const result = await this.sendSms(phone, templateId, params);
            results.push({
                phone,
                success: result.success,
                error: result.error,
            });
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        return {
            success: results.every((r) => r.success),
            results,
        };
    }
};
exports.TencentSmsService = TencentSmsService;
exports.TencentSmsService = TencentSmsService = TencentSmsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], TencentSmsService);
//# sourceMappingURL=tencent-sms.service.js.map