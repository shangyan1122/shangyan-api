import { Module } from '@nestjs/common'
import { AdminOrderController } from './admin-order.controller'
import { AdminOrderService } from './admin-order.service'
import { CommonModule } from '@/common/common.module'
import { AdminAuthModule } from '@/modules/admin-auth/admin-auth.module'
import { WechatPayModule } from '@/modules/wechat-pay/wechat-pay.module'

@Module({
  imports: [CommonModule, AdminAuthModule, WechatPayModule],
  controllers: [AdminOrderController],
  providers: [AdminOrderService],
  exports: [AdminOrderService]
})
export class AdminOrderModule {}
