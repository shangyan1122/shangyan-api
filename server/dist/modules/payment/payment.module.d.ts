import { OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PaymentService } from './payment.service';
export declare class PaymentModule implements OnModuleInit {
    private readonly moduleRef;
    private readonly paymentService;
    constructor(moduleRef: ModuleRef, paymentService: PaymentService);
    onModuleInit(): void;
}
