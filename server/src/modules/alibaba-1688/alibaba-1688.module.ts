import { Module } from '@nestjs/common';
import { Alibaba1688Controller } from './alibaba-1688.controller';
import { Alibaba1688Service } from './alibaba-1688.service';

@Module({
  controllers: [Alibaba1688Controller],
  providers: [Alibaba1688Service],
  exports: [Alibaba1688Service],
})
export class Alibaba1688Module {}
