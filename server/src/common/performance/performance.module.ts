import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common'
import { PerformanceController } from './performance.controller'
import { PerformanceMiddleware } from './performance.middleware'
import { AdminAuthModule } from '@/modules/admin-auth/admin-auth.module'

@Module({
  imports: [AdminAuthModule],
  controllers: [PerformanceController]
})
export class PerformanceModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(PerformanceMiddleware)
      .forRoutes('*')
  }
}
