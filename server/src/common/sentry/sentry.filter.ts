import { Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import { Request, Response } from 'express';

/**
 * 全局异常过滤器 - 集成 Sentry
 *
 * 功能：
 * 1. 捕获所有异常并上报到 Sentry
 * 2. 返回统一的错误响应格式
 * 3. 记录请求上下文信息
 */
@Catch()
export class SentryFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // 获取状态码
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';
    let errorData: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        errorData = (exceptionResponse as any).error || null;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // 上报到 Sentry
    Sentry.withScope((scope) => {
      // 设置用户信息
      if ((request as any).user) {
        scope.setUser({
          id: (request as any).user.openid,
          username: (request as any).user.openid,
        });
      }

      // 设置请求信息
      scope.setTag('path', request.url);
      scope.setTag('method', request.method);
      scope.setExtra('body', this.sanitizeBody(request.body));
      scope.setExtra('query', request.query);
      scope.setExtra('headers', this.sanitizeHeaders(request.headers));

      // 捕获异常
      if (exception instanceof Error) {
        Sentry.captureException(exception);
      } else {
        Sentry.captureMessage(`非 Error 类型异常: ${JSON.stringify(exception)}`, 'error');
      }
    });

    // 返回错误响应
    const errorResponse = {
      code: status,
      msg: message,
      data: errorData,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }

  /**
   * 清理请求体中的敏感信息
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'api_key'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***';
      }
    }

    return sanitized;
  }

  /**
   * 清理请求头中的敏感信息
   */
  private sanitizeHeaders(headers: any): any {
    if (!headers || typeof headers !== 'object') return headers;

    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '***';
      }
    }

    return sanitized;
  }
}
