/**
 * 统一AI服务
 * 支持多提供商：硅基流动、Coze、OpenAI
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SiliconflowService,
  SILICONFLOW_MODELS,
  SiliconFlowModelType,
} from './siliconflow.service';
import { getAIConfig, modelRecommendations, validateAIConfig } from './ai-config';

export interface GenerateRequest {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  enableThinking?: boolean;
}

export interface VisionRequest {
  text: string;
  imageUrl: string;
  model?: string;
  temperature?: number;
}

@Injectable()
export class UnifiedAIService implements OnModuleInit {
  private readonly logger = new Logger(UnifiedAIService.name);
  private siliconflow: SiliconflowService;
  private currentProvider: string = 'siliconflow';

  constructor(
    private configService: ConfigService,
    private siliconflowService: SiliconflowService
  ) {
    this.siliconflow = siliconflowService;
  }

  onModuleInit() {
    const config = getAIConfig();
    const validation = validateAIConfig(config);

    if (!validation.valid) {
      this.logger.warn('⚠️ AI配置存在问题:');
      validation.errors.forEach((err) => this.logger.warn(`  - ${err}`));
    }

    this.currentProvider = config.provider;

    // 根据配置设置默认模型
    if (config.provider === 'siliconflow' && config.siliconflow) {
      this.siliconflow.setDefaultModel(
        config.siliconflow.defaultTextModel,
        config.siliconflow.defaultVisionModel
      );
    }

    this.logger.log(`✅ AI服务初始化完成，当前提供商: ${this.currentProvider}`);
  }

  /**
   * 获取当前提供商
   */
  getProvider(): string {
    return this.currentProvider;
  }

  /**
   * 获取可用模型列表
   */
  getAvailableModels() {
    return this.siliconflow.getAvailableModels();
  }

  /**
   * 文本生成
   */
  async generateText(request: GenerateRequest): Promise<{
    success: boolean;
    content?: string;
    reasoning?: string;
    error?: string;
  }> {
    const config = getAIConfig();

    // 根据选择的模型决定是否启用思考
    const model =
      request.model || config.siliconflow?.defaultTextModel || SILICONFLOW_MODELS.QWEN_QWEN2_5_7B;
    const enableThinking =
      request.enableThinking || model.includes('DeepSeek-R1') || model.includes('R1-Distill');

    const result = await this.siliconflow.chat({
      messages: [
        ...(request.systemPrompt
          ? [{ role: 'system' as const, content: request.systemPrompt }]
          : []),
        { role: 'user' as const, content: request.prompt },
      ],
      model: model as SiliconFlowModelType,
      temperature: request.temperature ?? config.siliconflow?.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? config.siliconflow?.maxTokens ?? 2000,
      enable_thinking: enableThinking,
    });

    return {
      success: result.success,
      content: result.content,
      reasoning: result.reasoning,
      error: result.error,
    };
  }

  /**
   * 视觉理解（图片分析）
   */
  async analyzeImage(request: VisionRequest): Promise<{
    success: boolean;
    content?: string;
    error?: string;
  }> {
    const config = getAIConfig();
    const model =
      request.model || config.siliconflow?.defaultVisionModel || SILICONFLOW_MODELS.QWEN_VL_FLASH;

    const result = await this.siliconflow.visionChat({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: request.text },
            {
              type: 'image_url',
              image_url: {
                url: request.imageUrl,
                detail: 'low',
              },
            },
          ],
        },
      ],
      model: model as SiliconFlowModelType,
      temperature: request.temperature ?? 0.7,
    });

    return {
      success: result.success,
      content: result.content,
      error: result.error,
    };
  }

  // ========== 业务方法 ==========

  /**
   * 生成祝福语
   */
  async generateBlessing(data: {
    banquetType: string;
    banquetName: string;
    guestName?: string;
  }): Promise<{ code: number; message: string; data?: { blessing: string }; error?: string }> {
    const prompt = `请为${data.guestName ? `${data.guestName}参加` : ''}${data.banquetType}"${data.banquetName}"生成一句温馨的祝福语，要求：
1. 符合${data.banquetType}的喜庆氛围
2. 简洁优美，20字以内
3. 不要包含"祝"、"愿"等开头词

直接输出祝福语即可，不要其他内容。`;

    const result = await this.generateText({
      prompt,
      temperature: 0.8,
      maxTokens: 100,
    });

    if (!result.success || !result.content) {
      return {
        code: 500,
        message: result.error || '生成失败',
        error: result.error,
      };
    }

    return {
      code: 200,
      message: 'success',
      data: { blessing: result.content.trim() },
    };
  }

  /**
   * 生成欢迎词
   */
  async generateWelcome(data: {
    banquetType: string;
    banquetName: string;
    hostName?: string;
    photos?: string[];
  }): Promise<{ code: number; message: string; data?: { welcome: string }; error?: string }> {
    // 如果有照片，使用视觉模型
    if (data.photos && data.photos.length > 0) {
      const photoUrl = data.photos[0];

      const result = await this.analyzeImage({
        text: `这是${data.banquetType}"${data.banquetName}"的主角照片。请根据照片中人物的气质、穿着、表情等，生成一段简短的欢迎词，要求：
1. 温馨感人，体现主人的热情好客
2. 符合${data.banquetType}的喜庆氛围
3. 可根据照片中人物的特点（如气质优雅、笑容灿烂等）进行个性化描述
4. 严格控制在20字以内

直接输出欢迎词即可，不要包含标题。`,
        imageUrl: photoUrl,
      });

      if (!result.success || !result.content) {
        // 降级到纯文本生成
        this.logger.warn('视觉模型调用失败，降级到文本生成');
        return this.generateWelcomeText(data);
      }

      return {
        code: 200,
        message: 'success',
        data: { welcome: result.content.trim() },
      };
    }

    // 纯文本生成
    return this.generateWelcomeText(data);
  }

  /**
   * 纯文本生成欢迎词
   */
  private async generateWelcomeText(data: {
    banquetType: string;
    banquetName: string;
    hostName?: string;
  }): Promise<{ code: number; message: string; data?: { welcome: string }; error?: string }> {
    const prompt = `请为${data.banquetType}"${data.banquetName}"生成一段欢迎词${data.hostName ? `，主人是${data.hostName}` : ''}，要求：
1. 温馨感人，体现主人的热情
2. 符合${data.banquetType}的氛围，融入中国传统文化元素
3. 严格控制在20字以内

直接输出欢迎词即可。`;

    const result = await this.generateText({
      prompt,
      temperature: 0.8,
      maxTokens: 100,
    });

    if (!result.success || !result.content) {
      return {
        code: 500,
        message: result.error || '生成失败',
        error: result.error,
      };
    }

    return {
      code: 200,
      message: 'success',
      data: { welcome: result.content.trim() },
    };
  }

  /**
   * 生成感谢词
   */
  async generateThanks(data: {
    banquetType: string;
    banquetName: string;
    hostName?: string;
    photos?: string[];
  }): Promise<{ code: number; message: string; data?: { thanks: string }; error?: string }> {
    // 如果有照片，使用视觉模型
    if (data.photos && data.photos.length > 0) {
      const photoUrl = data.photos[0];

      const result = await this.analyzeImage({
        text: `这是${data.banquetType}"${data.banquetName}"的主角照片。请根据照片中人物的气质、穿着、表情等，生成一段简短的感谢词，要求：
1. 真诚感谢嘉宾的到来和祝福
2. 符合${data.banquetType}的氛围
3. 可根据照片中人物展现的幸福、喜悦等特点进行个性化描述
4. 严格控制在20字以内

直接输出感谢词即可，不要包含标题。`,
        imageUrl: photoUrl,
      });

      if (!result.success || !result.content) {
        // 降级到纯文本生成
        this.logger.warn('视觉模型调用失败，降级到文本生成');
        return this.generateThanksText(data);
      }

      return {
        code: 200,
        message: 'success',
        data: { thanks: result.content.trim() },
      };
    }

    // 纯文本生成
    return this.generateThanksText(data);
  }

  /**
   * 纯文本生成感谢词
   */
  private async generateThanksText(data: {
    banquetType: string;
    banquetName: string;
    hostName?: string;
  }): Promise<{ code: number; message: string; data?: { thanks: string }; error?: string }> {
    const prompt = `请为${data.banquetType}"${data.banquetName}"生成一段感谢词，要求：
1. 真诚感谢，表达心意
2. 符合${data.banquetType}的氛围，融入中国传统文化元素
3. 严格控制在20字以内

直接输出感谢词即可。`;

    const result = await this.generateText({
      prompt,
      temperature: 0.8,
      maxTokens: 100,
    });

    if (!result.success || !result.content) {
      return {
        code: 500,
        message: result.error || '生成失败',
        error: result.error,
      };
    }

    return {
      code: 200,
      message: 'success',
      data: { thanks: result.content.trim() },
    };
  }

  /**
   * 重新生成卡片（支持视觉）
   */
  async regenerateCard(data: {
    type: 'welcome' | 'thank';
    banquetType: string;
    banquetName: string;
    photos?: string[];
    isPaid?: boolean;
  }): Promise<{ code: number; message: string; data?: { content: string }; error?: string }> {
    if (data.type === 'welcome') {
      const result = await this.generateWelcome({
        banquetType: data.banquetType,
        banquetName: data.banquetName,
        photos: data.photos,
      });
      return {
        code: result.code,
        message: result.message,
        data: result.data ? { content: result.data.welcome } : undefined,
        error: result.error,
      };
    } else {
      const result = await this.generateThanks({
        banquetType: data.banquetType,
        banquetName: data.banquetName,
        photos: data.photos,
      });
      return {
        code: result.code,
        message: result.message,
        data: result.data ? { content: result.data.thanks } : undefined,
        error: result.error,
      };
    }
  }
}
