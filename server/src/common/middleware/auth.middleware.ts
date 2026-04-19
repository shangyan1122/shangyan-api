import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * 用户认证中间件
 * 从请求头获取用户信息并注入到请求对象中
 *
 * 微信小程序登录流程：
 * 1. 前端调用 wx.login() 获取 code
 * 2. 前端将 code 发送到后端
 * 3. 后端用 code 换取 openid 和 session_key
 * 4. 后端生成自定义 token 返回给前端
 * 5. 前端后续请求携带 token
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // 从请求头获取 token
    const token = req.headers['authorization']?.replace('Bearer ', '');

    if (token) {
      try {
        // TODO: 验证 token 并获取用户信息
        // 这里暂时使用 mock 数据，实际项目需要实现 token 验证逻辑
        // const decoded = this.jwtService.verify(token)
        // req.user = decoded

        // Mock 用户信息（开发阶段使用）
        req.user = {
          openid: 'test_openid_' + Date.now(),
          nickname: '测试用户',
          avatar: '',
        };
      } catch (error) {
        console.error('[Auth] Token verification failed:', error);
      }
    }

    // 如果没有 token 或验证失败，使用 mock 用户信息（开发阶段）
    if (!req.user) {
      req.user = {
        openid: 'anonymous_openid',
        nickname: '匿名用户',
        avatar: '',
      };
    }

    next();
  }
}

/**
 * 扩展 Express Request 类型
 */
declare module 'express' {
  interface Request {
    user?: {
      openid: string;
      nickname?: string;
      avatar?: string;
    };
  }
}
