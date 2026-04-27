import { Module, Global } from '@nestjs/common'
import { WechatConfigService } from './services/wechat-config.service'
import { PermissionService } from '@/services/permission.service'
import { PermissionGuard } from './guards/permission.guard'
import { AdminGuard } from './guards/admin.guard'
import { AdminAuthModule } from '@/modules/admin-auth/admin-auth.module'
import { LoggerModule } from './logger/logger.module'

@Global()
@Module({
  imports: [AdminAuthModule, LoggerModule],
  providers: [WechatConfigService, PermissionService, PermissionGuard, AdminGuard],
  exports: [WechatConfigService, PermissionService, PermissionGuard, AdminGuard]
})
export class CommonModule {}
