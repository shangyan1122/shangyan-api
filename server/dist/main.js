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
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const express = __importStar(require("express"));
const path = __importStar(require("path"));
const http_status_interceptor_1 = require("./interceptors/http-status.interceptor");
const storage_1 = require("./storage");
const sentry_config_1 = require("./common/sentry/sentry.config");
const sentry_filter_1 = require("./common/sentry/sentry.filter");
function parsePort() {
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
    (0, sentry_config_1.initSentry)();
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: true,
        credentials: true,
    });
    app.setGlobalPrefix('api');
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));
    app.useGlobalInterceptors(new http_status_interceptor_1.HttpStatusInterceptor());
    app.useGlobalFilters(new sentry_filter_1.SentryFilter());
    app.enableShutdownHooks();
    const webAdminDist = path.join(__dirname, '../../web-admin/dist');
    app.use('/admin', express.static(webAdminDist));
    app.use('/admin', (req, res) => {
        res.sendFile(path.join(webAdminDist, 'index.html'));
    });
    try {
        await (0, storage_1.initializeStorageBuckets)();
        console.log('✅ 存储桶初始化完成');
    }
    catch (error) {
        console.warn('⚠️ 存储桶初始化失败，部分功能可能受限:', error.message);
    }
    const port = parsePort();
    try {
        await app.listen(port);
        console.log(`Server running on http://localhost:${port}`);
    }
    catch (err) {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ 端口 \({port} 被占用! 请运行 'npx kill-port \){port}' 然后重试。`);
            process.exit(1);
        }
        else {
            throw err;
        }
    }
    console.log(`Application is running on: http://localhost:3000`);
}
bootstrap();
//# sourceMappingURL=main.js.map