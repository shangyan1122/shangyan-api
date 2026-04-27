import { Module, Global } from '@nestjs/common'
import { CustomLogger } from './custom-logger'

/**
 * 日志模块
 *
 * 提供统一的日志服务
 */
@Global()
@Module({
  providers: [
    {
      provide: CustomLogger,
      useClass: CustomLogger
    }
  ],
  exports: [CustomLogger]
})
export class LoggerModule {}
