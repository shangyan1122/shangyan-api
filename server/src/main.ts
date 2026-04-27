// 生产环境通过 CloudBase EnvParams 注入环境变量，开发环境用 dotenv
if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv/config'); } catch { /* dotenv not installed in production */ }
}
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import * as express from 'express';
import * as path from 'path';
import { HttpStatusInterceptor } from '@/interceptors/http-status.interceptor';
import { initializeStorageBuckets } from '@/storage';
import { initSentry } from '@/common/sentry/sentry.config';
import { SentryFilter } from '@/common/sentry/sentry.filter';
import { initializeRecommendOfficerTables } from '@/common/init-recommend-tables';
import { AdminAuthService } from '@/modules/admin-auth/admin-auth.service';

function parsePort(): number {
  // 优先使用环境变量 PORT（CloudBase 云托管会注入）
  if (process.env.PORT) {
    const port = parseInt(process.env.PORT, 10);
    if (!isNaN(port) && port > 0 && port < 65536) {
      return port;
    }
  }
  
  // 其次使用命令行参数
  const args = process.argv.slice(2);
  const portIndex = args.indexOf('-p');
  if (portIndex !== -1 && args[portIndex + 1]) {
    const port = parseInt(args[portIndex + 1], 10);
    if (!isNaN(port) && port > 0 && port < 65536) {
      return port;
    }
  }
  
  // 默认端口
  return 3000;
}

async function bootstrap() {
  // 初始化 Sentry 错误监控
  initSentry();

  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (origin, callback) => {
      // 允许的来源列表
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:5173',
        // 微信小程序云端请求没有 origin，允许通过
        // 生产环境域名（备案通过后替换）
        process.env.CORS_ORIGIN,
      ].filter(Boolean)

      // 没有 origin 的请求（如微信小程序、Postman）允许通过
      if (!origin) return callback(null, true)

      if (allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        // 开发环境允许所有来源，生产环境仅允许白名单
        if (process.env.NODE_ENV !== 'production') {
          callback(null, true)
        } else {
          callback(new Error('Not allowed by CORS'))
        }
      }
    },
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // 全局拦截器：统一将 POST 请求的 201 状态码改为 200
  app.useGlobalInterceptors(new HttpStatusInterceptor());
  
  // 全局异常过滤器：集成 Sentry
  app.useGlobalFilters(new SentryFilter());
  
  // 开启优雅关闭 Hooks (关键!)
  app.enableShutdownHooks();

  // 静态文件服务 - Web 管理后台
  const webAdminDist = path.join(__dirname, '../web-admin');
  app.use('/admin', express.static(webAdminDist));
  app.use('/admin', (req, res) => {
    res.sendFile(path.join(webAdminDist, 'index.html'));
  });

  // 初始化存储桶
  try {
    await initializeStorageBuckets();
    console.log('✅ 存储桶初始化完成');
  } catch (error) {
    console.warn('⚠️ 存储桶初始化失败，部分功能可能受限:', error.message);
  }

  // 初始化推荐官相关表
  try {
    await initializeRecommendOfficerTables();
  } catch (error) {
    console.warn('⚠️ 推荐官表初始化失败:', error.message);
  }

  // 初始化总管理员（确保 19503511949 始终为超级管理员）
  try {
    const adminAuthService = app.get(AdminAuthService);
    await adminAuthService.initializeSuperAdmin();
    console.log('✅ 总管理员初始化完成');
  } catch (error) {
    console.warn('⚠️ 总管理员初始化失败:', error.message);
  }

  // 2. 解析端口
  const port = parsePort();
  try {
    await app.listen(port, '0.0.0.0');
    console.log(`Server running on http://0.0.0.0:${port}`);
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ 端口 \({port} 被占用! 请运行 'npx kill-port \){port}' 然后重试。`);
      process.exit(1);
    } else {
      throw err;
    }
  }
  console.log(`Application is running on: http://localhost:3000`);
}
bootstrap();
