import { Controller, Post, Body } from '@nestjs/common';
import { AICoverService } from './ai-cover.service';
import { Logger } from '@nestjs/common';

@Controller('ai-cover')
export class AICoverController {
  private readonly logger = new Logger(AICoverController.name);

  constructor(private readonly aiCoverService: AICoverService) {}

  /**
   * 生成宴会封面
   */
  @Post('generate')
  async generateCover(
    @Body()
    body: {
      banquetType: string;
      banquetName: string;
      style?: 'traditional' | 'modern' | 'elegant' | 'festive';
      customPrompt?: string;
    }
  ) {
    this.logger.log(`生成宴会封面: ${body.banquetName}`);

    try {
      const coverUrl = await this.aiCoverService.generateBanquetCover(body);

      return {
        code: 200,
        msg: '生成成功',
        data: { url: coverUrl },
      };
    } catch (error) {
      this.logger.error('生成宴会封面失败:', error);
      return {
        code: 500,
        msg: error.message || '生成失败',
        data: null,
      };
    }
  }

  /**
   * 生成邀请函封面
   */
  @Post('invitation')
  async generateInvitation(
    @Body()
    body: {
      banquetType: string;
      banquetName: string;
      hostName: string;
      banquetTime: string;
      banquetLocation: string;
      style?: 'traditional' | 'modern' | 'elegant';
    }
  ) {
    this.logger.log(`生成邀请函封面: ${body.banquetName}`);

    try {
      const coverUrl = await this.aiCoverService.generateInvitationCover(body);

      return {
        code: 200,
        msg: '生成成功',
        data: { url: coverUrl },
      };
    } catch (error) {
      this.logger.error('生成邀请函封面失败:', error);
      return {
        code: 500,
        msg: error.message || '生成失败',
        data: null,
      };
    }
  }
}
