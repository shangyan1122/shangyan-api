import { Module } from '@nestjs/common';
import { AdminOrderController } from './admin-order.controller';
import { AdminOrderService } from './admin-order.service';

@Module({
  controllers: [AdminOrderController],
  providers: [AdminOrderService],
  exports: [AdminOrderService],
})
export class AdminOrderModule {}
