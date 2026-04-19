import { Module } from '@nestjs/common';
import { ServiceFeeController } from './service-fee.controller';
import { ServiceFeeService } from './service-fee.service';
import { ShoppingVoucherService } from './shopping-voucher.service';

@Module({
  controllers: [ServiceFeeController],
  providers: [ServiceFeeService, ShoppingVoucherService],
  exports: [ServiceFeeService, ShoppingVoucherService],
})
export class ServiceFeeModule {}
