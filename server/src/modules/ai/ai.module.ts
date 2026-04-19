import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { AiService } from './ai.service';
import { SiliconflowService } from './siliconflow.service';
import { UnifiedAIService } from './unified-ai.service';

@Module({
  controllers: [AIController],
  providers: [AiService, SiliconflowService, UnifiedAIService],
  exports: [AiService, SiliconflowService, UnifiedAIService],
})
export class AIModule {}
