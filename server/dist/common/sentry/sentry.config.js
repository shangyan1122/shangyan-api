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
exports.initSentry = initSentry;
exports.captureException = captureException;
exports.captureMessage = captureMessage;
exports.setUserContext = setUserContext;
exports.clearUserContext = clearUserContext;
const Sentry = __importStar(require("@sentry/nestjs"));
function initSentry() {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) {
        console.log('⚠️ Sentry DSN 未配置，跳过错误监控初始化');
        return false;
    }
    Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        ignoreErrors: [
            'NetworkError',
            'Network request failed',
            '微信支付',
        ],
        ignoreTransactions: [
            'GET /api/hello',
            'GET /api/health',
        ],
        beforeSend(event, hint) {
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
function captureException(error, context) {
    if (context) {
        Sentry.withScope((scope) => {
            Object.entries(context).forEach(([key, value]) => {
                scope.setExtra(key, value);
            });
            Sentry.captureException(error);
        });
    }
    else {
        Sentry.captureException(error);
    }
}
function captureMessage(message, level = 'info') {
    Sentry.captureMessage(message, level);
}
function setUserContext(user) {
    Sentry.setUser({
        id: user.id,
        username: user.openid,
        role: user.role,
    });
}
function clearUserContext() {
    Sentry.setUser(null);
}
//# sourceMappingURL=sentry.config.js.map