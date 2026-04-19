import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * 全局错误处理中间件
 */
@Injectable()
export class ErrorMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    try {
      next();
    } catch (error: any) {
      console.error('[Error Middleware]', error);

      const status =
        error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

      const message = error instanceof HttpException ? error.message : '服务器内部错误';

      res.status(status).json({
        code: status,
        msg: message,
        data: null,
        timestamp: new Date().toISOString(),
        path: req.url,
      });
    }
  }
}

/**
 * 统一响应格式
 */
export interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
  timestamp?: string;
}

/**
 * 成功响应
 */
export function success<T>(data: T, msg = 'success'): ApiResponse<T> {
  return {
    code: 200,
    msg,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 错误响应
 */
export function error(msg: string, code = 500): ApiResponse<null> {
  return {
    code,
    msg,
    data: null,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 分页响应
 */
export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): ApiResponse<PaginatedData<T>> {
  return success({
    items,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  });
}
