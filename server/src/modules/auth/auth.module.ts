import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { CommonModule } from '@/common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [AuthController],
})
export class AuthModule {}
