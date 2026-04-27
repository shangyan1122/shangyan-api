import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

/**
 * 用户认证中间件
 * 
 * 注意：当前项目使用全局 AuthGuard 进行认证，此中间件已不使用。
 * 保留此文件仅作为类型声明的载体。
 * 
 * 认证逻辑请参考：src/common/guards/auth.guard.ts
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // 认证已由全局 AuthGuard 处理，此中间件不再执行认证逻辑
    next()
  }
}

/**
 * 扩展 Express Request 类型
 */
declare module 'express' {
  interface Request {
    user?: {
      openid: string
      id?: string
      nickname?: string
      avatar?: string
    }
    admin?: {
      id: string
      phone: string
      name?: string
      role: string
    }
  }
}
