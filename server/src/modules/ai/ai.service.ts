import { Injectable, Logger } from '@nestjs/common';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private llmClient: LLMClient;

  constructor() {
    const config = new Config();
    this.llmClient = new LLMClient(config);
  }

  /**
   * 生成祝福语
   */
  async generateBlessing(data: {
    banquetType: string;
    banquetName: string;
    guestName: string;
  }): Promise<{ code: number; message: string; data: { blessing: string } | null }> {
    try {
      const prompt = `请为${data.guestName}参加${data.banquetType}"${data.banquetName}"生成一句温馨的祝福语，要求：
1. 符合${data.banquetType}的喜庆氛围
2. 简洁优美，20字以内
3. 不要包含"祝"、"愿"等开头词

直接输出祝福语即可，不要其他内容。`;

      const messages = [{ role: 'user' as const, content: prompt }];

      const response = await this.llmClient.invoke(messages, {
        model: 'doubao-seed-1-6-lite-251015',
        temperature: 0.8,
      });

      return {
        code: 200,
        message: 'success',
        data: {
          blessing: response.content,
        },
      };
    } catch (error) {
      this.logger.error('生成祝福语失败:', error);
      return {
        code: 500,
        message: '生成失败',
        data: null,
      };
    }
  }

  /**
   * 使用主角照片生成个性化欢迎词（视觉模型）
   */
  async generateWelcomeWithPhotos(data: {
    banquetType: string;
    banquetName: string;
    hostName?: string;
    photos: string[]; // 主角照片URL列表
  }): Promise<{ code: number; message: string; data: { welcome: string } | null }> {
    try {
      const { banquetType, banquetName, hostName, photos } = data;

      // 如果有照片，使用视觉模型分析
      if (photos && photos.length > 0) {
        const coverPhoto = photos[0]; // 第一张作为封面

        // 构建多模态消息
        const messages = [
          {
            role: 'user' as const,
            content: [
              {
                type: 'text' as const,
                text: `这是${banquetType}"${banquetName}"的主角照片。请根据照片中人物的气质、穿着、表情等，生成一段简短的欢迎词，要求：
1. 温馨感人，体现主人的热情好客
2. 符合${banquetType}的喜庆氛围
3. 可根据照片中人物的特点（如气质优雅、笑容灿烂等）进行个性化描述
4. 严格控制在20字以内

直接输出欢迎词即可，不要包含标题。`,
              },
              {
                type: 'image_url' as const,
                image_url: {
                  url: coverPhoto,
                  detail: 'low' as const, // 使用低细节以节省token
                },
              },
            ],
          },
        ];

        const response = await this.llmClient.invoke(messages, {
          model: 'doubao-seed-1-6-vision-250815',
          temperature: 0.8,
        });

        return {
          code: 200,
          message: 'success',
          data: {
            welcome: response.content,
          },
        };
      }

      // 没有照片时使用纯文本生成
      return this.generateWelcome({
        banquetType,
        banquetName,
        hostName: hostName || '',
      });
    } catch (error) {
      this.logger.error('生成欢迎词失败:', error);
      // 降级到纯文本生成
      return this.generateWelcome({
        banquetType: data.banquetType,
        banquetName: data.banquetName,
        hostName: data.hostName || '',
      });
    }
  }

  /**
   * 生成欢迎词（纯文本）
   */
  async generateWelcome(data: {
    banquetType: string;
    banquetName: string;
    hostName: string;
  }): Promise<{ code: number; message: string; data: { welcome: string } | null }> {
    try {
      const prompt = `请为${data.banquetType}"${data.banquetName}"生成一段欢迎词${data.hostName ? `，主人是${data.hostName}` : ''}，要求：
1. 温馨感人，体现主人的热情
2. 符合${data.banquetType}的氛围，融入中国传统文化元素
3. 严格控制在20字以内

直接输出欢迎词即可。`;

      const messages = [{ role: 'user' as const, content: prompt }];

      const response = await this.llmClient.invoke(messages, {
        model: 'doubao-seed-1-6-lite-251015',
        temperature: 0.8,
      });

      return {
        code: 200,
        message: 'success',
        data: {
          welcome: response.content,
        },
      };
    } catch (error) {
      this.logger.error('生成欢迎词失败:', error);
      return {
        code: 500,
        message: '生成失败',
        data: null,
      };
    }
  }

  /**
   * 使用主角照片生成个性化感谢词（视觉模型）
   */
  async generateThanksWithPhotos(data: {
    banquetType: string;
    banquetName: string;
    hostName?: string;
    photos: string[]; // 主角照片URL列表
  }): Promise<{ code: number; message: string; data: { thanks: string } | null }> {
    try {
      const { banquetType, banquetName, hostName, photos } = data;

      // 如果有照片，使用视觉模型分析
      if (photos && photos.length > 0) {
        const coverPhoto = photos[0]; // 第一张作为封面

        // 构建多模态消息
        const messages = [
          {
            role: 'user' as const,
            content: [
              {
                type: 'text' as const,
                text: `这是${banquetType}"${banquetName}"的主角照片。请根据照片中人物的气质、穿着、表情等，生成一段简短的感谢词，要求：
1. 真诚感谢嘉宾的到来和祝福
2. 符合${banquetType}的氛围
3. 可根据照片中人物展现的幸福、喜悦等特点进行个性化描述
4. 严格控制在20字以内

直接输出感谢词即可，不要包含标题。`,
              },
              {
                type: 'image_url' as const,
                image_url: {
                  url: coverPhoto,
                  detail: 'low' as const, // 使用低细节以节省token
                },
              },
            ],
          },
        ];

        const response = await this.llmClient.invoke(messages, {
          model: 'doubao-seed-1-6-vision-250815',
          temperature: 0.8,
        });

        return {
          code: 200,
          message: 'success',
          data: {
            thanks: response.content,
          },
        };
      }

      // 没有照片时使用纯文本生成
      return this.generateThanks({
        banquetType,
        banquetName,
        hostName: hostName || '',
      });
    } catch (error) {
      this.logger.error('生成感谢词失败:', error);
      // 降级到纯文本生成
      return this.generateThanks({
        banquetType: data.banquetType,
        banquetName: data.banquetName,
        hostName: data.hostName || '',
      });
    }
  }

  /**
   * 生成感谢词（纯文本）
   */
  async generateThanks(data: {
    banquetType: string;
    banquetName: string;
    hostName?: string;
    guestName?: string;
    amount?: number;
  }): Promise<{ code: number; message: string; data: { thanks: string } | null }> {
    try {
      const prompt = `请为${data.banquetType}"${data.banquetName}"生成一段感谢词，要求：
1. 真诚感谢，表达心意
2. 符合${data.banquetType}的氛围，融入中国传统文化元素
3. 严格控制在20字以内

直接输出感谢词即可。`;

      const messages = [{ role: 'user' as const, content: prompt }];

      const response = await this.llmClient.invoke(messages, {
        model: 'doubao-seed-1-6-lite-251015',
        temperature: 0.8,
      });

      return {
        code: 200,
        message: 'success',
        data: {
          thanks: response.content,
        },
      };
    } catch (error) {
      this.logger.error('生成感谢词失败:', error);
      return {
        code: 500,
        message: '生成失败',
        data: null,
      };
    }
  }
}
