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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentryFilter = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const Sentry = __importStar(require("@sentry/nestjs"));
let SentryFilter = class SentryFilter extends core_1.BaseExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest();
        const response = ctx.getResponse();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = '服务器内部错误';
        let errorData = null;
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            }
            else if (typeof exceptionResponse === 'object') {
                message = exceptionResponse.message || message;
                errorData = exceptionResponse.error || null;
            }
        }
        else if (exception instanceof Error) {
            message = exception.message;
        }
        Sentry.withScope((scope) => {
            if (request.user) {
                scope.setUser({
                    id: request.user.openid,
                    username: request.user.openid,
                });
            }
            scope.setTag('path', request.url);
            scope.setTag('method', request.method);
            scope.setExtra('body', this.sanitizeBody(request.body));
            scope.setExtra('query', request.query);
            scope.setExtra('headers', this.sanitizeHeaders(request.headers));
            if (exception instanceof Error) {
                Sentry.captureException(exception);
            }
            else {
                Sentry.captureMessage(`非 Error 类型异常: ${JSON.stringify(exception)}`, 'error');
            }
        });
        const errorResponse = {
            code: status,
            msg: message,
            data: errorData,
            timestamp: new Date().toISOString(),
            path: request.url,
        };
        response.status(status).json(errorResponse);
    }
    sanitizeBody(body) {
        if (!body || typeof body !== 'object')
            return body;
        const sanitized = { ...body };
        const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'api_key'];
        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '***';
            }
        }
        return sanitized;
    }
    sanitizeHeaders(headers) {
        if (!headers || typeof headers !== 'object')
            return headers;
        const sanitized = { ...headers };
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
        for (const header of sensitiveHeaders) {
            if (sanitized[header]) {
                sanitized[header] = '***';
            }
        }
        return sanitized;
    }
};
exports.SentryFilter = SentryFilter;
exports.SentryFilter = SentryFilter = __decorate([
    (0, common_1.Catch)()
], SentryFilter);
//# sourceMappingURL=sentry.filter.js.map