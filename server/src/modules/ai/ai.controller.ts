import { Controller, Post, Body } from '@nestjs/common'
import { AiService } from './ai.service'
import { getSupabaseClient } from '@/storage/database/supabase-client'

@Controller('ai')
export class AIController {
  constructor(private readonly aiService: AiService) {}

  /**
   * 生成祝福语
   */
  @Post('generate-blessing')
  async generateBlessing(@Body() body: { banquetType: string; banquetName: string; guestName: string }) {
    return this.aiService.generateBlessing(body)
  }

  /**
   * 生成欢迎词
   */
  @Post('generate-welcome')
  async generateWelcome(@Body() body: { banquetType: string; banquetName: string; hostName: string }) {
    return this.aiService.generateWelcome(body)
  }

  /**
   * 生成感谢词
   */
  @Post('generate-thanks')
  async generateThanks(@Body() body: { banquetType: string; banquetName: string; guestName?: string; amount?: number }) {
    return this.aiService.generateThanks(body)
  }

  /**
   * 重新生成欢迎/感谢卡片
   */
  @Post('regenerate-card')
  async regenerateCard(@Body() body: {
    banquetId: string
    type: 'welcome' | 'thank'
    banquetType: string
    banquetName: string
  }) {
    try {
      const { banquetId, type, banquetType, banquetName } = body

      const result = type === 'welcome'
        ? await this.aiService.generateWelcome({ banquetType, banquetName, hostName: '' })
        : await this.aiService.generateThanks({ banquetType, banquetName })

      if (result.code !== 200) {
        return result
      }

      const content = type === 'welcome'
        ? (result.data && 'welcome' in result.data ? result.data.welcome : null)
        : (result.data && 'thanks' in result.data ? result.data.thanks : null)
      const fieldName = type === 'welcome' ? 'ai_welcome_page' : 'ai_thank_page'

      // 更新数据库
      const client = getSupabaseClient()
      const { error } = await client
        .from('banquets')
        .update({ [fieldName]: content })
        .eq('id', banquetId)

      if (error) {
        console.error('更新AI卡片失败:', error)
        return { code: 500, message: '更新失败', data: null }
      }

      return { code: 200, message: 'success', data: { content } }
    } catch (error) {
      console.error('重新生成AI卡片失败:', error)
      return { code: 500, message: '生成失败', data: null }
    }
  }

  /**
   * 为嘉宾生成专属欢迎卡（付费功能）
   */
  @Post('generate-guest-welcome')
  async generateGuestWelcome(@Body() body: {
    banquetId: string
    guestName: string
    banquetType: string
    banquetName: string
    hostName: string
  }) {
    try {
      const { banquetId, guestName, banquetType, banquetName, hostName } = body

      const result = await this.aiService.generateWelcome({
        banquetType,
        banquetName,
        hostName: `${hostName}，嘉宾${guestName}`
      })

      if (result.code !== 200 || !result.data) {
        return { code: 500, message: '生成失败', data: null }
      }

      const content = result.data.welcome

      // 保存到嘉宾专属卡片表
      const client = getSupabaseClient()
      const { error } = await client
        .from('guest_ai_cards')
        .upsert({
          banquet_id: banquetId,
          guest_name: guestName,
          card_type: 'welcome',
          content,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'banquet_id,guest_name,card_type'
        })

      if (error) {
        console.error('保存嘉宾欢迎卡失败:', error)
        return { code: 500, message: '保存失败', data: null }
      }

      return { code: 200, message: 'success', data: { content } }
    } catch (error) {
      console.error('生成嘉宾欢迎卡失败:', error)
      return { code: 500, message: '生成失败', data: null }
    }
  }

  /**
   * 为嘉宾生成专属感谢卡（付费功能）
   */
  @Post('generate-guest-thanks')
  async generateGuestThanks(@Body() body: {
    banquetId: string
    guestName: string
    banquetType: string
    amount?: number
  }) {
    try {
      const { banquetId, guestName, banquetType, amount } = body

      const result = await this.aiService.generateThanks({
        banquetType,
        banquetName: `${guestName}${amount ? `随礼${amount}元` : '的到来'}`
      })

      if (result.code !== 200 || !result.data) {
        return { code: 500, message: '生成失败', data: null }
      }

      const content = result.data.thanks

      // 保存到嘉宾专属卡片表
      const client = getSupabaseClient()
      const { error } = await client
        .from('guest_ai_cards')
        .upsert({
          banquet_id: banquetId,
          guest_name: guestName,
          card_type: 'thank',
          content,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'banquet_id,guest_name,card_type'
        })

      if (error) {
        console.error('保存嘉宾感谢卡失败:', error)
        return { code: 500, message: '保存失败', data: null }
      }

      return { code: 200, message: 'success', data: { content } }
    } catch (error) {
      console.error('生成嘉宾感谢卡失败:', error)
      return { code: 500, message: '生成失败', data: null }
    }
  }

  /**
   * 获取嘉宾的专属卡片
   */
  @Post('get-guest-card')
  async getGuestCard(@Body() body: { banquetId: string; guestName: string; cardType: 'welcome' | 'thank' }) {
    try {
      const { banquetId, guestName, cardType } = body

      const client = getSupabaseClient()
      const { data, error } = await client
        .from('guest_ai_cards')
        .select('content')
        .eq('banquet_id', banquetId)
        .eq('guest_name', guestName)
        .eq('card_type', cardType)
        .single()

      if (error || !data) {
        return { code: 404, message: '未找到专属卡片', data: null }
      }

      return { code: 200, message: 'success', data: { content: data.content } }
    } catch (error) {
      console.error('获取嘉宾卡片失败:', error)
      return { code: 500, message: '获取失败', data: null }
    }
  }
}
