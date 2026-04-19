import { Module } from '@nestjs/common';
import { MallOrderController } from './mall-order.controller';
import { MallOrderService } from './mall-order.service';

@Module({
  controllers: [MallOrderController],
  providers: [MallOrderService],
  exports: [MallOrderService],
})
export class MallOrderModule {}
