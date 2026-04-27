import { Module } from '@nestjs/common'
import { AdminStatsController } from './admin-stats.controller'
import { AdminStatsService } from './admin-stats.service'
import { CommonModule } from '@/common/common.module'
import { AdminAuthModule } from '@/modules/admin-auth/admin-auth.module'

@Module({
  imports: [CommonModule, AdminAuthModule],
  controllers: [AdminStatsController],
  providers: [AdminStatsService],
  exports: [AdminStatsService]
})
export class AdminStatsModule {}
