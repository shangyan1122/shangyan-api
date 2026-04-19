import { Controller, Post, Body, Get } from '@nestjs/common';
import { UnifiedAIService } from './unified-ai.service';
import { SiliconflowService } from './siliconflow.service';
import { getAIConfig, validateAIConfig } from './ai-config';
import { getSupabaseClient } from '@/storage/database/supabase-client';

@Controller('ai')
export class AIController {
  constructor(
    private readonly aiService: UnifiedAIService,
    private readonly siliconflowService: SiliconflowService
  ) {}

  /**
   * 获取当前AI服务状态
   */
  @Get('status')
  async getStatus() {
    const config = getAIConfig();
    const validation = validateAIConfig(config);
    const models = this.siliconflowService.getAvailableModels();

    return {
      code: 200,
      message: 'success',
      data: {
        provider: config.provider,
        configured: validation.valid,
        errors: validation.errors,
        models: models,
      },
    };
  }

  /**
   * 获取可用模型列表
   */
  @Get('models')
  async getModels() {
    const models = this.siliconflowService.getAvailableModels();

    return {
      code: 200,
      message: 'success',
      data: { models },
    };
  }

  @Post('generate-blessing')
  async generateBlessing(
    @Body() body: { banquetType: string; banquetName: string; guestName: string }
  ) {
    const result = await this.aiService.generateBlessing({
      banquetType: body.banquetType,
      banquetName: body.banquetName,
      guestName: body.guestName,
    });

    return {
      code: result.code,
      message: result.message,
      data: result.data ? { blessing: result.data.blessing } : null,
      error: result.error,
    };
  }

  @Post('generate-welcome')
  async generateWelcome(
    @Body()
    body: {
      banquetType: string;
      banquetName: string;
      hostName?: string;
      isPaid?: boolean;
      guestName?: string;
      photos?: string[];
    }
  ) {
    const result = await this.aiService.generateWelcome({
      banquetType: body.banquetType,
      banquetName: body.banquetName,
      hostName: body.hostName,
      photos: body.photos,
    });

    return {
      code: result.code,
      message: result.message,
      data: result.data ? { welcome: result.data.welcome } : null,
      error: result.error,
    };
  }

  @Post('generate-thanks')
  async generateThanks(
    @Body()
    body: {
      banquetType: string;
      banquetName: string;
      hostName?: string;
      guestName?: string;
      amount?: number;
      isPaid?: boolean;
      photos?: string[];
    }
  ) {
    const result = await this.aiService.generateThanks({
      banquetType: body.banquetType,
      banquetName: body.banquetName,
      hostName: body.hostName,
      photos: body.photos,
    });

    return {
      code: result.code,
      message: result.message,
      data: result.data ? { thanks: result.data.thanks } : null,
      error: result.error,
    };
  }

  @Post('regenerate-card')
  async regenerateCard(
    @Body()
    body: {
      banquetId: string;
      type: 'welcome' | 'thank';
      banquetType: string;
      banquetName: string;
      photos?: string[];
      isPaid?: boolean;
    }
  ) {
    try {
      const result = await this.aiService.regenerateCard({
        type: body.type,
        banquetType: body.banquetType,
        banquetName: body.banquetName,
        photos: body.photos,
        isPaid: body.isPaid,
      });

      if (result.code !== 200 || !result.data) {
        return {
          code: result.code,
          message: result.error || '生成失败',
          data: null,
        };
      }

      // 更新数据库
      const fieldName = body.type === 'welcome' ? 'ai_welcome_page' : 'ai_thank_page';
      const client = getSupabaseClient();
      const { error } = await client
        .from('banquets')
        .update({ [fieldName]: result.data.content })
        .eq('id', body.banquetId);

      if (error) {
        return {
          code: 500,
          message: '更新失败',
          data: null,
        };
      }

      return {
        code: 200,
        message: 'success',
        data: { content: result.data.content },
      };
    } catch (error) {
      console.error('重新生成AI卡片失败:', error);
      return {
        code: 500,
        message: '生成失败',
        data: null,
      };
    }
  }

  /**
   * 为嘉宾生成专属欢迎卡（付费功能）
   */
  @Post('generate-guest-welcome')
  async generateGuestWelcome(
    @Body()
    body: {
      banquetId: string;
      guestName: string;
      banquetType: string;
      banquetName: string;
      hostName: string;
    }
  ) {
    try {
      // 使用带有嘉宾姓名的欢迎词生成
      const result = await this.aiService.generateWelcome({
        banquetType: body.banquetType,
        banquetName: body.banquetName,
        hostName: body.hostName,
      });

      if (result.code !== 200 || !result.data) {
        return {
          code: result.code,
          message: result.error || '生成失败',
          data: null,
        };
      }

      // 拼接嘉宾个性化称呼
      const content = `${body.guestName}，${result.data.welcome}`;

      // 保存到嘉宾专属卡片表
      const client = getSupabaseClient();
      const { error } = await client.from('guest_ai_cards').upsert(
        {
          banquet_id: body.banquetId,
          guest_name: body.guestName,
          card_type: 'welcome',
          content: content,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: 'banquet_id,guest_name,card_type',
        }
      );

      if (error) {
        return {
          code: 500,
          message: '保存失败',
          data: null,
        };
      }

      return {
        code: 200,
        message: 'success',
        data: { content },
      };
    } catch (error) {
      console.error('生成嘉宾欢迎卡失败:', error);
      return {
        code: 500,
        message: '生成失败',
        data: null,
      };
    }
  }

  /**
   * 为嘉宾生成专属感谢卡（付费功能）
   */
  @Post('generate-guest-thanks')
  async generateGuestThanks(
    @Body()
    body: {
      banquetId: string;
      guestName: string;
      banquetType: string;
      banquetName: string;
      amount?: number;
    }
  ) {
    try {
      // 使用带有嘉宾信息的感谢词生成
      const result = await this.aiService.generateThanks({
        banquetType: body.banquetType,
        banquetName: body.banquetName,
      });

      if (result.code !== 200 || !result.data) {
        return {
          code: result.code,
          message: result.error || '生成失败',
          data: null,
        };
      }

      // 拼接嘉宾个性化称呼
      const content = `${body.guestName}，${result.data.thanks}`;

      // 保存到嘉宾专属卡片表
      const client = getSupabaseClient();
      const { error } = await client.from('guest_ai_cards').upsert(
        {
          banquet_id: body.banquetId,
          guest_name: body.guestName,
          card_type: 'thank',
          content: content,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: 'banquet_id,guest_name,card_type',
        }
      );

      if (error) {
        return {
          code: 500,
          message: '保存失败',
          data: null,
        };
      }

      return {
        code: 200,
        message: 'success',
        data: { content },
      };
    } catch (error) {
      console.error('生成嘉宾感谢卡失败:', error);
      return {
        code: 500,
        message: '生成失败',
        data: null,
      };
    }
  }

  /**
   * 获取嘉宾的专属卡片
   */
  @Post('get-guest-card')
  async getGuestCard(
    @Body() body: { banquetId: string; guestName: string; cardType: 'welcome' | 'thank' }
  ) {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('guest_ai_cards')
        .select('content')
        .eq('banquet_id', body.banquetId)
        .eq('guest_name', body.guestName)
        .eq('card_type', body.cardType)
        .single();

      if (error || !data) {
        return {
          code: 404,
          message: '未找到专属卡片',
          data: null,
        };
      }

      return {
        code: 200,
        message: 'success',
        data: { content: data.content },
      };
    } catch (error) {
      console.error('获取嘉宾卡片失败:', error);
      return {
        code: 500,
        message: '获取失败',
        data: null,
      };
    }
  }
}
