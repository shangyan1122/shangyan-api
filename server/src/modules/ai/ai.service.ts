import { Injectable, Logger } from '@nestjs/common'

/**
 * AI 服务 - 统一使用硅基流动 (SiliconFlow) API
 * 支持文本生成和多模态视觉理解
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name)
  private readonly apiKey = process.env.SILICONFLOW_API_KEY || ''
  private readonly baseUrl = process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1'
  private readonly textModel = process.env.SILICONFLOW_MODEL || 'deepseek-ai/DeepSeek-V3-0324'
  private readonly visionModel = process.env.SILICONFLOW_VISION_MODEL || 'Qwen/Qwen2.5-VL-7B-Instruct'

  /**
   * 调用 SiliconFlow 文本 API
   */
  private async invokeText(messages: Array<{ role: string; content: string }>, options?: { temperature?: number; maxTokens?: number }): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.textModel,
          messages,
          temperature: options?.temperature || 0.8,
          max_tokens: options?.maxTokens || 100,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`SiliconFlow API error: ${response.status} - ${error}`)
      }

      const data = await response.json()
      return data.choices[0]?.message?.content || ''
    } catch (error: any) {
      this.logger.error('SiliconFlow 文本 API 调用失败:', error)
      throw error
    }
  }

  /**
   * 调用 SiliconFlow 视觉 API（多模态）
   */
  private async invokeVision(textPrompt: string, imageUrl: string, options?: { temperature?: number; maxTokens?: number }): Promise<string> {
    try {
      const messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: textPrompt },
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            }
          ]
        }
      ]

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.visionModel,
          messages,
          temperature: options?.temperature || 0.8,
          max_tokens: options?.maxTokens || 100,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`SiliconFlow Vision API error: ${response.status} - ${error}`)
      }

      const data = await response.json()
      return data.choices[0]?.message?.content || ''
    } catch (error: any) {
      this.logger.error('SiliconFlow 视觉 API 调用失败:', error)
      throw error
    }
  }

  /**
   * 生成祝福语
   */
  async generateBlessing(data: { banquetType: string; banquetName: string; guestName: string }): Promise<{ code: number; message: string; data: { blessing: string } | null }> {
    try {
      const prompt = `请为${data.guestName}参加${data.banquetType}"${data.banquetName}"生成一句温馨的祝福语，要求：
1. 符合${data.banquetType}的喜庆氛围
2. 简洁优美，20字以内
3. 不要包含"祝"、"愿"等开头词

直接输出祝福语即可，不要其他内容。`

      const content = await this.invokeText([{ role: 'user', content: prompt }])

      return {
        code: 200,
        message: 'success',
        data: { blessing: content }
      }
    } catch (error) {
      this.logger.error('生成祝福语失败:', error)
      return { code: 500, message: '生成失败', data: null }
    }
  }

  /**
   * 使用主角照片生成个性化欢迎词（视觉模型）
   */
  async generateWelcomeWithPhotos(data: {
    banquetType: string
    banquetName: string
    hostName?: string
    photos: string[]
  }): Promise<{ code: number; message: string; data: { welcome: string } | null }> {
    try {
      const { banquetType, banquetName, hostName, photos } = data

      if (photos && photos.length > 0) {
        const coverPhoto = photos[0]
        const textPrompt = `这是${banquetType}"${banquetName}"的主角照片。请根据照片中人物的气质、穿着、表情等，生成一段简短的欢迎词，要求：
1. 温馨感人，体现主人的热情好客
2. 符合${banquetType}的喜庆氛围
3. 可根据照片中人物的特点（如气质优雅、笑容灿烂等）进行个性化描述
4. 严格控制在20字以内

直接输出欢迎词即可，不要包含标题。`

        const content = await this.invokeVision(textPrompt, coverPhoto)

        return {
          code: 200,
          message: 'success',
          data: { welcome: content }
        }
      }

      // 没有照片时降级到纯文本生成
      return this.generateWelcome({
        banquetType,
        banquetName,
        hostName: hostName || ''
      })
    } catch (error) {
      this.logger.error('生成欢迎词（视觉）失败:', error)
      // 降级到纯文本生成
      return this.generateWelcome({
        banquetType: data.banquetType,
        banquetName: data.banquetName,
        hostName: data.hostName || ''
      })
    }
  }

  /**
   * 生成欢迎词（纯文本）
   */
  async generateWelcome(data: { banquetType: string; banquetName: string; hostName: string }): Promise<{ code: number; message: string; data: { welcome: string } | null }> {
    try {
      const prompt = `请为${data.banquetType}"${data.banquetName}"生成一段欢迎词${data.hostName ? `，主人是${data.hostName}` : ''}，要求：
1. 温馨感人，体现主人的热情
2. 符合${data.banquetType}的氛围，融入中国传统文化元素
3. 严格控制在20字以内

直接输出欢迎词即可。`

      const content = await this.invokeText([{ role: 'user', content: prompt }])

      return {
        code: 200,
        message: 'success',
        data: { welcome: content }
      }
    } catch (error) {
      this.logger.error('生成欢迎词失败:', error)
      return { code: 500, message: '生成失败', data: null }
    }
  }

  /**
   * 使用主角照片生成个性化感谢词（视觉模型）
   */
  async generateThanksWithPhotos(data: {
    banquetType: string
    banquetName: string
    hostName?: string
    photos: string[]
  }): Promise<{ code: number; message: string; data: { thanks: string } | null }> {
    try {
      const { banquetType, banquetName, hostName, photos } = data

      if (photos && photos.length > 0) {
        const coverPhoto = photos[0]
        const textPrompt = `这是${banquetType}"${banquetName}"的主角照片。请根据照片中人物的气质、穿着、表情等，生成一段简短的感谢词，要求：
1. 真诚感谢嘉宾的到来和祝福
2. 符合${banquetType}的氛围
3. 可根据照片中人物展现的幸福、喜悦等特点进行个性化描述
4. 严格控制在20字以内

直接输出感谢词即可，不要包含标题。`

        const content = await this.invokeVision(textPrompt, coverPhoto)

        return {
          code: 200,
          message: 'success',
          data: { thanks: content }
        }
      }

      // 没有照片时降级到纯文本生成
      return this.generateThanks({
        banquetType,
        banquetName,
        hostName: hostName || ''
      })
    } catch (error) {
      this.logger.error('生成感谢词（视觉）失败:', error)
      // 降级到纯文本生成
      return this.generateThanks({
        banquetType: data.banquetType,
        banquetName: data.banquetName,
        hostName: data.hostName || ''
      })
    }
  }

  /**
   * 根据宴会类型自动生成欢迎卡和感谢卡（无照片时使用）
   * 使用宴会类型的主题色彩和文化元素生成默认卡片
   */
  async generateDefaultCards(data: {
    banquetType: string
    banquetName: string
    hostName?: string
  }): Promise<{ code: number; message: string; data: { welcome: string; thanks: string } | null }> {
    try {
      // 宴会类型对应的传统文化主题
      const banquetThemes: Record<string, { welcome: string; thanks: string }> = {
        '婚宴': { welcome: '百年好合，龙凤呈祥', thanks: '琴瑟和鸣，永结同心' },
        '回门': { welcome: '归宁之喜，阖家欢聚', thanks: '感恩回门，情满归途' },
        '寿宴': { welcome: '福如东海，寿比南山', thanks: '福寿绵长，恩泽深厚' },
        '满月': { welcome: '喜得贵子，满月吉庆', thanks: '弥月之喜，感恩厚爱' },
        '升学': { welcome: '金榜题名，前程似锦', thanks: '学业有成，师恩难忘' },
        '乔迁': { welcome: '乔迁之喜，紫气东来', thanks: '新居落成，感恩莅临' },
        '谢师': { welcome: '尊师重道，桃李满天下', thanks: '师恩如海，铭记于心' },
        '聚餐': { welcome: '高朋满座，把酒言欢', thanks: '友谊长存，后会有期' }
      }

      const theme = banquetThemes[data.banquetType] || { welcome: '', thanks: '' }

      // 使用AI生成更个性化的内容，fallback到模板
      let welcome = theme.welcome
      let thanks = theme.thanks

      try {
        const welcomeResult = await this.generateWelcome({
          banquetType: data.banquetType,
          banquetName: data.banquetName,
          hostName: data.hostName || ''
        })
        if (welcomeResult?.data?.welcome) {
          welcome = welcomeResult.data.welcome
        }
      } catch (e) {
        this.logger.warn('AI生成欢迎词失败，使用默认模板')
      }

      try {
        const thanksResult = await this.generateThanks({
          banquetType: data.banquetType,
          banquetName: data.banquetName,
          hostName: data.hostName || ''
        })
        if (thanksResult?.data?.thanks) {
          thanks = thanksResult.data.thanks
        }
      } catch (e) {
        this.logger.warn('AI生成感谢词失败，使用默认模板')
      }

      return {
        code: 200,
        message: 'success',
        data: { welcome, thanks }
      }
    } catch (error) {
      this.logger.error('生成默认卡片失败:', error)
      return { code: 500, message: '生成失败', data: null }
    }
  }

  /**
   * 生成感谢词（纯文本）
   */
  async generateThanks(data: { banquetType: string; banquetName: string; hostName?: string; guestName?: string; amount?: number }): Promise<{ code: number; message: string; data: { thanks: string } | null }> {
    try {
      const prompt = `请为${data.banquetType}"${data.banquetName}"生成一段感谢词，要求：
1. 真诚感谢，表达心意
2. 符合${data.banquetType}的氛围，融入中国传统文化元素
3. 严格控制在20字以内

直接输出感谢词即可。`

      const content = await this.invokeText([{ role: 'user', content: prompt }])

      return {
        code: 200,
        message: 'success',
        data: { thanks: content }
      }
    } catch (error) {
      this.logger.error('生成感谢词失败:', error)
      return { code: 500, message: '生成失败', data: null }
    }
  }
}
