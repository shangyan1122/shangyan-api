import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import * as express from 'express';
import * as path from 'path';
import { HttpStatusInterceptor } from '@/interceptors/http-status.interceptor';
import { initializeStorageBuckets } from '@/storage';
import { initSentry } from '@/common/sentry/sentry.config';
import { SentryFilter } from '@/common/sentry/sentry.filter';

function parsePort(): number {
  // 优先使用环境变量 PORT（CloudBase 等云平台使用）
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
  return 3000;
}

async function bootstrap() {
  // 启动日志（用于调试 Railway 部署）
  console.log('='.repeat(60));
  console.log('尚宴礼记 API 服务启动中...');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('PORT:', process.env.PORT);
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ 已配置' : '⚠️ 未配置（将使用默认值）');
  console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ 已配置' : '⚠️ 未配置（将使用默认值）');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ 已配置' : '⚠️ 未配置');
  console.log('='.repeat(60));

  // 初始化 Sentry 错误监控
  initSentry();

  const app = await NestFactory.create(AppModule);

  // CORS 配置：允许所有来源访问（开发环境）
  app.enableCors({
    origin: '*',
    credentials: false, // 当 origin 为 '*' 时，credentials 必须为 false
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // 静态文件服务 - Web 管理后台（必须在 setGlobalPrefix 之前配置，避免被 api 前缀覆盖）
  const webAdminDist = path.join(__dirname, '../web-admin');
  app.use('/admin', express.static(webAdminDist));
  app.use('/admin', (req, res) => {
    res.sendFile(path.join(webAdminDist, 'index.html'));
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

  // 初始化存储桶
  try {
    await initializeStorageBuckets();
    console.log('✅ 存储桶初始化完成');
  } catch (error) {
    console.warn('⚠️ 存储桶初始化失败，部分功能可能受限:', error.message);
    console.warn('   应用将继续启动，但文件上传功能可能不可用。');
  }

  // 2. 解析端口
  const port = parsePort();
  try {
    await app.listen(port);
    console.log(`Server running on http://localhost:${port}`);
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ 端口 \({port} 被占用! 请运行 'npx kill-port \){port}' 然后重试。`);
      process.exit(1);
    } else {
      throw err;
    }
  }
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
