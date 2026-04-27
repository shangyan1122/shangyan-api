import { Injectable, NestMiddleware, Logger } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { performanceMonitor } from './performance-monitor'

/**
 * 性能监控中间件
 *
 * 功能：
 * 1. 记录每个 API 请求的响应时间
 * 2. 记录请求方法、路径、状态码
 * 3. 记录慢请求（超过阈值的请求）
 */
@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PerformanceMiddleware.name)
  private readonly slowRequestThreshold = 3000 // 3秒

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now()
    const url = req.url
    const method = req.method
    const self = this

    // 记录响应
    const originalSend = res.send
    res.send = function (body) {
      const duration = Date.now() - startTime
      const statusCode = res.statusCode

      // 记录性能指标
      performanceMonitor.record(`HTTP ${method} ${url}`, duration, {
        method,
        url,
        statusCode,
        success: statusCode >= 200 && statusCode < 400
      })

      // 记录慢请求
      if (duration > self.slowRequestThreshold) {
        self.logger.warn(
          `慢请求检测: ${method} ${url} - ${duration}ms (阈值: ${self.slowRequestThreshold}ms)`
        )
      }

      // 记录错误请求
      if (statusCode >= 500) {
        self.logger.error(
          `错误请求: ${method} ${url} - ${statusCode} - ${duration}ms`
        )
      }

      return originalSend.call(res, body)
    }

    next()
  }
}
