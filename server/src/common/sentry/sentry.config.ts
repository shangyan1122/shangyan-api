import * as Sentry from '@sentry/nestjs';

/**
 * Sentry 初始化配置
 *
 * 使用方法：
 * 1. 在 .env.local 中配置 SENTRY_DSN
 * 2. 在 main.ts 中调用 initSentry()
 */
export function initSentry() {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.log('⚠️ Sentry DSN 未配置，跳过错误监控初始化');
    return false;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',

    // 采样率配置
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // 性能监控采样
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // 忽略特定错误
    ignoreErrors: [
      // 忽略网络错误
      'NetworkError',
      'Network request failed',
      // 忽略微信支付相关错误（由业务逻辑处理）
      '微信支付',
    ],

    // 忽略特定事务
    ignoreTransactions: [
      // 健康检查
      'GET /api/hello',
      'GET /api/health',
    ],

    // 在发送前处理事件
    beforeSend(event, hint) {
      // 过滤敏感信息
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
      }
      return event;
    },
  });

  console.log('✅ Sentry 错误监控已初始化');
  return true;
}

/**
 * 手动捕获异常
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * 手动捕获消息
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * 设置用户上下文
 */
export function setUserContext(user: { id: string; openid: string; role?: string }) {
  Sentry.setUser({
    id: user.id,
    username: user.openid,
    role: user.role,
  });
}

/**
 * 清除用户上下文
 */
export function clearUserContext() {
  Sentry.setUser(null);
}
