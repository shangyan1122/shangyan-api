import { Module, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { GiftService } from '../gift/gift.service';
import { ReferralService } from '../referral/referral.service';
import { ReturnGiftModule } from '../return-gift/return-gift.module';
import { ProfitSharingModule } from '../profit-sharing/profit-sharing.module';
import { ProfitSharingService } from '../profit-sharing/profit-sharing.service';

@Module({
  imports: [ReturnGiftModule, ProfitSharingModule],
  controllers: [PaymentController],
  providers: [PaymentService, GiftService, ReferralService],
  exports: [PaymentService],
})
export class PaymentModule implements OnModuleInit {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly paymentService: PaymentService
  ) {}

  onModuleInit() {
    // 注入ProfitSharingService到PaymentService，避免循环依赖
    const profitSharingService = this.moduleRef.get(ProfitSharingService, { strict: false });
    this.paymentService.setProfitSharingService(profitSharingService);
  }
}
