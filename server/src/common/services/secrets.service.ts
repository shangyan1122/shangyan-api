import { Injectable, Logger } from '@nestjs/common';

/**
 * 密钥管理服务
 *
 * 【安全说明】
 * 1. 生产环境密钥应通过环境变量注入，禁止硬编码
 * 2. 建议使用密钥管理服务（如 AWS Secrets Manager、Azure Key Vault）
 * 3. 敏感密钥应定期轮换
 * 4. 开发环境可使用 .env 文件，生产环境必须使用安全存储
 */
@Injectable()
export class SecretsService {
  private readonly logger = new Logger(SecretsService.name);

  /**
   * 获取密钥（优先从环境变量，其次从密钥管理服务）
   *
   * @param key 密钥名称
   * @param required 是否必需（如果为true且密钥不存在，抛出异常）
   * @returns 密钥值
   */
  get(key: string, required: boolean = true): string {
    // 1. 优先从环境变量获取
    const value = process.env[key];

    if (!value) {
      if (required) {
        this.logger.error(`必需的密钥未配置: ${key}`);
        throw new Error(`密钥未配置: ${key}。请在环境变量中设置此密钥。`);
      }
      this.logger.warn(`可选密钥未配置: ${key}`);
      return '';
    }

    // 2. 验证密钥不是占位符
    if (this.isPlaceholder(value)) {
      if (required) {
        this.logger.error(`密钥 ${key} 使用了占位符值，请更换为真实密钥`);
        throw new Error(`密钥 ${key} 使用了占位符值，生产环境必须使用真实密钥`);
      }
      this.logger.warn(`密钥 ${key} 使用了占位符值`);
    }

    return value;
  }

  /**
   * 获取可选密钥
   */
  getOptional(key: string): string {
    return this.get(key, false);
  }

  /**
   * 检查是否为占位符值
   */
  private isPlaceholder(value: string): boolean {
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

  /**
   * 验证所有必需密钥是否已配置
   * 应在应用启动时调用
   */
  validateRequiredSecrets(): { valid: boolean; missing: string[] } {
    const requiredSecrets = [
      // 微信小程序
      'WECHAT_APP_ID',
      'WECHAT_APP_SECRET',

      // 微信支付（如果启用支付功能）
      // 'WECHAT_MCH_ID',
      // 'WECHAT_PAY_API_KEY',
      // 'WECHAT_API_V3_KEY',

      // Supabase
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',

      // 数据库
      'DATABASE_URL',
    ];

    const missing: string[] = [];

    for (const key of requiredSecrets) {
      const value = process.env[key];
      if (!value || this.isPlaceholder(value)) {
        missing.push(key);
      }
    }

    if (missing.length > 0) {
      this.logger.warn(`以下必需密钥未配置或使用了占位符: ${missing.join(', ')}`);
      this.logger.warn('生产环境必须配置真实密钥，请参考部署文档');
    } else {
      this.logger.log('✅ 所有必需密钥已配置');
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * 获取微信小程序配置
   */
  getWechatConfig() {
    return {
      appId: this.get('WECHAT_APP_ID'),
      appSecret: this.get('WECHAT_APP_SECRET'),
    };
  }

  /**
   * 获取微信支付配置
   */
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

  /**
   * 获取Supabase配置
   */
  getSupabaseConfig() {
    return {
      url: this.get('SUPABASE_URL'),
      anonKey: this.get('SUPABASE_ANON_KEY'),
      serviceKey: this.getOptional('SUPABASE_SERVICE_KEY'),
    };
  }

  /**
   * 获取数据库连接配置
   */
  getDatabaseConfig() {
    const databaseUrl = this.get('DATABASE_URL');

    // 解析数据库URL
    // 格式: postgresql://user:password@host:port/database
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
    } catch (e) {
      this.logger.error('数据库URL格式错误');
      throw new Error('DATABASE_URL 格式错误，请检查配置');
    }
  }

  /**
   * 检查是否为生产环境
   */
  isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * 检查是否为开发环境
   */
  isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  }

  /**
   * 获取环境名称
   */
  getEnvironment(): string {
    return process.env.NODE_ENV || 'development';
  }
}
