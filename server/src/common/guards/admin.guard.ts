import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger, SetMetadata } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import { AdminAuthService } from '@/modules/admin-auth/admin-auth.service'

/**
 * 公开接口装饰器（管理员接口专用）
 */
export const AdminPublic = () => SetMetadata('isPublic', true)

/**
 * 管理员认证守卫
 * 验证管理员身份并注入管理员信息到请求对象
 *
 * 【使用方法】
 * @UseGuards(AdminGuard)
 * 后续通过 req.admin 或 @Req() req: Request 获取管理员信息
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name)

  constructor(
    private reflector: Reflector,
    private readonly adminAuthService: AdminAuthService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()

    // 检查是否跳过认证
    const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler())
    if (isPublic) {
      return true
    }

    // 从请求头获取 token
    const authHeader = request.headers['authorization']
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      this.logger.warn('管理员认证失败: 缺少 token')
      throw new UnauthorizedException('请先登录')
    }

    // 验证 token
    const admin = this.adminAuthService.verifyToken(token)

    if (!admin) {
      this.logger.warn('管理员认证失败: token 无效')
      throw new UnauthorizedException('登录已过期，请重新登录')
    }

    // 注入管理员信息到请求对象
    ;(request as any).admin = admin

    this.logger.debug(`管理员认证成功: id=${admin.id}, phone=${admin.phone}`)

    return true
  }
}
