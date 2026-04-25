import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger, Inject } from '@nestjs/common';
import { Request } from 'express';
import { AdminAuthService } from '@/modules/admin-auth/admin-auth.service';

/**
 * Admin 认证守卫
 * 验证 Admin JWT Token
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  private readonly logger = new Logger(AdminAuthGuard.name);

  constructor(
    @Inject(AdminAuthService) private adminAuthService: AdminAuthService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // 从 Authorization header 获取 token
    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn('Admin认证失败: 缺少Authorization header');
      throw new UnauthorizedException('请先登录');
    }

    const token = authHeader.substring(7); // 去掉 'Bearer ' 前缀

    // 验证 token
    const decoded = this.adminAuthService.verifyToken(token);
    if (!decoded) {
      this.logger.warn('Admin认证失败: Token无效或已过期');
      throw new UnauthorizedException('登录已过期，请重新登录');
    }

    // 注入管理员信息到请求对象
    request.admin = {
      id: decoded.id,
      phone: decoded.phone,
      role: decoded.role,
    };

    this.logger.debug(`Admin认证成功: id=${decoded.id}, phone=${decoded.phone}`);
    return true;
  }
}
