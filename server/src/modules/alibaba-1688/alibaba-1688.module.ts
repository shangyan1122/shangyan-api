import { Module } from '@nestjs/common'
import { Alibaba1688Controller } from './alibaba-1688.controller'
import { Alibaba1688Service } from './alibaba-1688.service'
import { Alibaba1688OAuthService } from './alibaba-1688-oauth.service'
import { AdminAuthModule } from '@/modules/admin-auth/admin-auth.module'

@Module({
  imports: [AdminAuthModule],
  controllers: [Alibaba1688Controller],
  providers: [Alibaba1688Service, Alibaba1688OAuthService],
  exports: [Alibaba1688Service, Alibaba1688OAuthService]
})
export class Alibaba1688Module {}
