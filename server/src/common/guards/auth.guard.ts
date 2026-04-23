import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  SetMetadata,
  applyDecorators,
  UseGuards,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

/**
 * JWT认证服务接口
 * 用于解耦守卫和具体JWT实现
 */
export interface JwtAuthServiceInterface {
  authenticate(request: Request): { openid: string; nickname?: string } | null;
}

/**
 * 认证守卫
 * 验证用户身份并注入用户信息到请求对象
 *
 * 【安全说明】
 * - 所有接口默认需要认证
 * - 使用 @Public() 装饰器标记公开接口
 * - 禁止在守卫中硬编码默认用户，防止权限绕过
 * - 支持JWT Token验证（推荐）和传统方式（兼容）
 *
 * 【认证优先级】
 * 1. JWT Token（Authorization: Bearer <token>）- 推荐
 * 2. 微信小程序专用 header（X-WX-Openid）
 * 3. 请求体 openid（仅可信环境）
 * 4. 查询参数 openid（仅可信环境）
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private reflector: Reflector,
    @Optional() @Inject('JwtAuthService') private jwtAuthService: JwtAuthServiceInterface
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // 检查是否跳过认证
    const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
    if (isPublic) {
      return true;
    }

    // 从请求头或请求体获取 openid
    const user = this.authenticate(request);

    if (!user || !user.openid) {
      this.logger.warn('未授权访问: 缺少有效的用户身份标识');
      throw new UnauthorizedException('请先登录');
    }

    // 注入用户信息到请求对象
    request.user = {
      openid: user.openid,
      nickname: user.nickname || (request.headers['x-wx-nickname'] as string) || '',
      avatar: (request.headers['x-wx-avatar'] as string) || '',
    };

    return true;
  }

  /**
   * 认证用户身份
   *
   * 【认证流程】
   * 1. 优先使用JWT认证（如果配置了JwtAuthService）
   * 2. 回退到传统方式（兼容旧版本）
   */
  private authenticate(request: Request): { openid: string; nickname?: string } | null {
    // 1. 尝试JWT认证（推荐方式）
    if (this.jwtAuthService) {
      const user = this.jwtAuthService.authenticate(request);
      if (user) {
        this.logger.debug(`JWT认证成功: openid=${user.openid}`);
        return user;
      }
    }

    // 2. 回退到传统方式（兼容）
    const openid = this.extractOpenidLegacy(request);
    if (openid) {
      return { openid };
    }

    return null;
  }

  /**
   * 从请求中提取 openid（传统方式）
   *
   * 【安全警告】
   * - 此方式仅用于兼容，不推荐在生产环境使用
   * - 请求体和查询参数中的 openid 可能被伪造
   * - 生产环境应使用 JWT Token
   */
  private extractOpenidLegacy(request: Request): string | null {
    // 从 Authorization header 提取（简单token格式）
    const authHeader = request.headers['authorization'];
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');

      if (token && token !== 'null' && token !== 'undefined') {
        // 尝试从简单token格式中提取 openid
        // 格式: token_{openid}_{timestamp}
        const parts = token.split('_');
        if (parts.length >= 2 && parts[1] && parts[0] === 'token') {
          return parts[1];
        }

        // 如果不是简单格式，可能是JWT，交给JWT服务处理
        // 不再直接返回null，继续尝试其他方式
      }
    }

    // 从微信小程序专用 header 提取
    const wxOpenid = request.headers['x-wx-openid'] as string;
    if (wxOpenid) {
      // 验证格式
      if (this.isValidOpenid(wxOpenid)) {
        return wxOpenid;
      }
    }

    // 从请求体提取（仅用于特定场景）
    // ⚠️ 注意：请求体中的 openid 可能被伪造
    const bodyOpenid = (request.body as any)?.openid;
    if (bodyOpenid && this.isValidOpenid(bodyOpenid)) {
      this.logger.debug('从请求体获取openid（不推荐）');
      return bodyOpenid;
    }

    // 从查询参数提取（仅用于特定场景）
    // ⚠️ 注意：查询参数中的 openid 可能被伪造
    const queryOpenid = request.query.openid as string;
    if (queryOpenid && this.isValidOpenid(queryOpenid)) {
      this.logger.debug('从查询参数获取openid（不推荐）');
      return queryOpenid;
    }

    return null;
  }

  /**
   * 验证openid格式
   * 防止注入攻击
   */
  private isValidOpenid(openid: string): boolean {
    if (!openid || typeof openid !== 'string') {
      return false;
    }

    // openid 应该是字母数字下划线横线组成，长度合理
    // 格式可能是：真实openid（28位）、模拟openid（mock_开头）、测试openid
    const validPattern = /^[a-zA-Z0-9_\-]{10,100}$/;
    return validPattern.test(openid);
  }
}

/**
 * 公开接口装饰器
 * 标记不需要认证的接口
 */
export const Public = () => SetMetadata('isPublic', true);

/**
 * 需要认证装饰器
 * 组合装饰器，同时应用守卫和元数据
 */
export const RequireAuth = () => applyDecorators(UseGuards(AuthGuard));
