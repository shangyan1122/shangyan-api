import { Module } from '@nestjs/common';
import { WithdrawController } from './withdraw.controller';
import { WithdrawService } from './withdraw.service';
import { PaymentService } from '../payment/payment.service';

@Module({
  controllers: [WithdrawController],
  providers: [WithdrawService, PaymentService],
  exports: [WithdrawService],
})
export class WithdrawModule {}
