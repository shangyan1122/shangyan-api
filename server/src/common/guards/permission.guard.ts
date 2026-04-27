import { Injectable, CanActivate, ExecutionContext, Logger, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PermissionService } from '@/services/permission.service'

/**
 * 权限守卫装饰器
 * 使用方法: @RequirePermissions('banquet:read')
 */
export const RequirePermissions = (...permissions: string[]) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('permissions', permissions, descriptor.value)
  }
}

/**
 * 权限守卫
 * 检查用户是否有访问权限
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name)

  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 获取路由所需的权限
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler()
    )

    // 如果没有设置权限要求，默认允许访问
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true
    }

    // 获取用户信息
    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user || !user.id) {
      throw new ForbiddenException('未授权访问')
    }

    // 检查用户权限
    for (const permission of requiredPermissions) {
      const hasPermission = await this.permissionService.hasPermission(user.id, permission)
      if (!hasPermission) {
        this.logger.warn(`用户 ${user.id} 缺少权限: ${permission}`)
        throw new ForbiddenException(`缺少权限: ${permission}`)
      }
    }

    return true
  }
}
