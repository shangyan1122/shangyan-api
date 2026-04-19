/**
 * 腾讯云短信服务
 * 文档: https://cloud.tencent.com/document/product/382
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as tencentcloud from 'tencentcloud-sdk-nodejs';

const SmsClient = tencentcloud.sms.v20210111.Client;

export interface SendSmsRequest {
  PhoneNumberSet: string[]; // 手机号列表 e.g. ["+8613800138000"]
  TemplateId: string; // 模板 ID
  SmsSdkAppId: string; // 短信应用 App ID
  SignName: string; // 签名（腾讯云 SMS v20210111 API 参数名）
  TemplateParamSet?: string[]; // 模板参数
}

export interface SendSmsResult {
  success: boolean;
  message?: string;
  error?: string;
  serialNo?: string; // 发送流水号
}

@Injectable()
export class TencentSmsService {
  private readonly logger = new Logger(TencentSmsService.name);
  private client: any;

  // 配置
  private appId: string = '';
  private appKey: string = '';
  private loginTemplateId: string = '';
  private sign: string = '';
  private region: string = 'ap-guangzhou';

  // 短信发送限制（防止频繁发送）
  private sendLog: Map<string, { count: number; lastSendTime: number }> = new Map();
  private readonly MAX_SENDS_PER_HOUR = 10; // 每小时最多发送10条
  private readonly MIN_INTERVAL_MS = 60000; // 最小发送间隔60秒

  constructor(private configService: ConfigService) {
    this.init();
  }

  private init() {
    // 读取腾讯云凭证（支持多种变量名）
    const secretId =
      this.configService.get<string>('TENCENT_SMS_SECRET_ID') ||
      this.configService.get<string>('TENCENT_CLOUD_SECRET_ID') ||
      '';
    const secretKey =
      this.configService.get<string>('TENCENT_SMS_SECRET_KEY') ||
      this.configService.get<string>('TENCENT_CLOUD_SECRET_KEY') ||
      '';

    // 读取短信配置（支持多种变量名）
    this.appId =
      this.configService.get<string>('TENCENT_SMS_SDK_APP_ID') ||
      this.configService.get<string>('TENCENT_SMS_APP_ID') ||
      '';
    this.appKey = this.configService.get<string>('TENCENT_SMS_APP_KEY') || '';
    this.loginTemplateId =
      this.configService.get<string>('TENCENT_SMS_TEMPLATE_ID') ||
      this.configService.get<string>('TENCENT_SMS_LOGIN_TEMPLATE_ID') ||
      '';
    this.sign =
      this.configService.get<string>('TENCENT_SMS_SIGN_NAME') ||
      this.configService.get<string>('TENCENT_SMS_SIGN') ||
      '尚宴礼记';
    this.region = this.configService.get<string>('TENCENT_SMS_REGION') || 'ap-guangzhou';

    // 记录配置状态
    this.logger.log(`📋 腾讯云短信配置检查:`);
    this.logger.log(`  SecretId: ${secretId ? '✓ 已配置' : '✗ 未配置'}`);
    this.logger.log(`  SecretKey: ${secretKey ? '✓ 已配置' : '✗ 未配置'}`);
    this.logger.log(`  SdkAppId: ${this.appId ? '✓ 已配置' : '✗ 未配置'}`);
    this.logger.log(`  AppKey: ${this.appKey ? '✓ 已配置' : '✗ 未配置'}`);
    this.logger.log(`  TemplateId: ${this.loginTemplateId ? '✓ 已配置' : '✗ 未配置'}`);
    this.logger.log(`  Sign: ${this.sign ? '✓ 已配置' : '✗ 未配置'}`);

    // 检查必须的配置
    if (!this.loginTemplateId) {
      this.logger.warn('⚠️ 腾讯云短信模板ID未配置');
      return;
    }

    // 初始化客户端 - 使用 SecretId/SecretKey 方式
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
    } catch (error) {
      this.logger.error('❌ 初始化腾讯云短信客户端失败:', error);
    }
  }

  /**
   * 发送短信前检查
   */
  private checkSendLimit(phone: string): { allowed: boolean; message: string } {
    const now = Date.now();
    const log = this.sendLog.get(phone);

    // 如果没有发送记录，允许发送
    if (!log) {
      return { allowed: true, message: '' };
    }

    // 检查发送间隔
    if (now - log.lastSendTime < this.MIN_INTERVAL_MS) {
      return {
        allowed: false,
        message: `请${Math.ceil((this.MIN_INTERVAL_MS - (now - log.lastSendTime)) / 1000)}秒后再试`,
      };
    }

    // 检查每小时发送次数
    if (log.count >= this.MAX_SENDS_PER_HOUR) {
      return {
        allowed: false,
        message: '发送次数超限，请稍后再试',
      };
    }

    return { allowed: true, message: '' };
  }

  /**
   * 更新发送记录
   */
  private updateSendLog(phone: string) {
    const now = Date.now();
    const log = this.sendLog.get(phone);

    // 如果上次记录超过1小时，重置计数
    if (log && now - log.lastSendTime > 3600000) {
      this.sendLog.set(phone, { count: 1, lastSendTime: now });
    } else if (log) {
      log.count++;
      log.lastSendTime = now;
    } else {
      this.sendLog.set(phone, { count: 1, lastSendTime: now });
    }
  }

  /**
   * 发送登录验证码
   */
  async sendLoginCode(phone: string, code: string): Promise<SendSmsResult> {
    this.logger.log(`发送登录验证码: phone=${phone}, code=${code}`);

    // 检查配置
    if (!this.client) {
      this.logger.warn('短信客户端未初始化，模拟发送成功');
      this.updateSendLog(phone);
      return {
        success: true,
        message: '模拟发送成功（开发模式）',
        serialNo: `mock_${Date.now()}`,
      };
    }

    // 检查发送限制
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
        TemplateParamSet: [code, '5'], // 验证码 + 5分钟有效期
      };

      const response = await this.client.SendSms(params);

      // 处理响应
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
        } else {
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
    } catch (error: any) {
      this.logger.error('发送短信异常:', error);
      return {
        success: false,
        error: error.message || '发送失败',
      };
    }
  }

  /**
   * 发送自定义模板短信
   */
  async sendSms(phone: string, templateId: string, params: string[]): Promise<SendSmsResult> {
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
    } catch (error: any) {
      this.logger.error('发送短信异常:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 批量发送短信（用于提醒等）
   */
  async batchSendSms(
    phones: string[],
    templateId: string,
    params: string[]
  ): Promise<{
    success: boolean;
    results: Array<{ phone: string; success: boolean; error?: string }>;
  }> {
    if (!this.client) {
      return {
        success: false,
        results: phones.map((phone) => ({ phone, success: false, error: '短信服务未配置' })),
      };
    }

    const results: Array<{ phone: string; success: boolean; error?: string }> = [];

    for (const phone of phones) {
      const result = await this.sendSms(phone, templateId, params);
      results.push({
        phone,
        success: result.success,
        error: result.error,
      });

      // 添加延迟避免频率限制
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return {
      success: results.every((r) => r.success),
      results,
    };
  }
}
