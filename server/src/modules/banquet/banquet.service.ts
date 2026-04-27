import { Injectable, Logger } from '@nestjs/common'
import { query, SqlBuilder, getClient } from '@/storage/database/pg-client'
import { AiService } from '../ai/ai.service'
import { WechatConfigService } from '@/common/services/wechat-config.service'
import { WechatPayService } from '../wechat-pay/wechat-pay.service'

/**
 * 带超时控制的 Promise 封装
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  const timer = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
  )
  return Promise.race([promise, timer])
}
import { GiftReminderService } from '../gift-reminder/gift-reminder.service'

@Injectable()
export class BanquetService {
  private readonly logger = new Logger(BanquetService.name)

  constructor(
    private readonly aiService: AiService,
    private readonly wechatConfig: WechatConfigService,
    private readonly wechatPayService: WechatPayService,
    private readonly giftReminderService: GiftReminderService
  ) {}

  async getBanquets(hostOpenid: string, status?: string) {
    try {
      const builder = new SqlBuilder()
        .select('*')
        .from('banquets')
        .where({ host_openid: hostOpenid })
        .orderBy('created_at', 'DESC')

      if (status) {
        builder.where({ status })
      }

      const { query: selectQuery, values } = builder.build()
      const result = await query(selectQuery, values)

      this.logger.log(`获取宴会列表成功: openid=${hostOpenid}, status=${status || 'all'}, count=${result.rows.length}`)
      return result.rows
    } catch (error: any) {
      this.logger.error(`获取宴会列表失败: ${error.message}`)
      throw new Error(error.message)
    }
  }

  async getBanquetById(id: string) {
    try {
      const { query: selectQuery, values } = new SqlBuilder()
        .select('*')
        .from('banquets')
        .where({ id })
        .limit(1)
        .build()

      const result = await query(selectQuery, values)

      if (result.rows.length === 0) {
        throw new Error(`宴会不存在: ${id}`)
      }

      this.logger.log(`获取宴会详情成功: id=${id}`)
      return result.rows[0]
    } catch (error: any) {
      this.logger.error(`获取宴会详情失败: ${error.message}`)
      throw new Error(error.message)
    }
  }

  async createBanquet(banquetData: any) {
    // 生成AI欢迎页和感谢页内容
    let aiWelcomePage = ''
    let aiThankPage = ''

    this.logger.log(`开始创建宴会: ${banquetData.name}, 类型: ${banquetData.type}`)

    // 获取主角照片
    const photos = banquetData.photos || []
    const coverImage = banquetData.coverImage || banquetData.cover_image || (photos.length > 0 ? photos[0] : null)
    const isAiPaid = banquetData.ai_page_paid || false

    this.logger.log(`照片数量: ${photos.length}, 封面图片: ${coverImage ? '已设置' : '未设置'}, AI付费: ${isAiPaid}`)

    try {
      if (photos.length > 0) {
        // 有照片：使用主角照片生成欢迎词和感谢词（最多等待8秒）
        this.logger.log('正在使用主角照片生成欢迎词...')
        const welcomeResult = await withTimeout(
          this.aiService.generateWelcomeWithPhotos({
            banquetType: banquetData.type,
            banquetName: banquetData.name,
            hostName: banquetData.hostName || banquetData.name.split('的')[0] || '',
            photos: photos
          }),
          8000,
          'AI生成欢迎词超时'
        )
        if (welcomeResult && welcomeResult.data) {
          aiWelcomePage = welcomeResult.data.welcome || ''
          this.logger.log(`欢迎词生成成功: ${aiWelcomePage}`)
        }

        this.logger.log('正在使用主角照片生成感谢词...')
        const thanksResult = await withTimeout(
          this.aiService.generateThanksWithPhotos({
            banquetType: banquetData.type,
            banquetName: banquetData.name,
            hostName: banquetData.hostName || banquetData.name.split('的')[0] || '',
            photos: photos
          }),
          8000,
          'AI生成感谢词超时'
        )
        if (thanksResult && thanksResult.data) {
          aiThankPage = thanksResult.data.thanks || ''
          this.logger.log(`感谢词生成成功: ${aiThankPage}`)
        }
      } else {
        // 无照片：根据宴会类型自动生成欢迎卡和感谢卡（最多等待5秒）
        this.logger.log('无照片，根据宴会类型自动生成欢迎卡和感谢卡...')
        const defaultResult = await withTimeout(
          this.aiService.generateDefaultCards({
            banquetType: banquetData.type,
            banquetName: banquetData.name,
            hostName: banquetData.hostName || banquetData.name.split('的')[0] || ''
          }),
          5000,
          'AI生成默认卡片超时'
        )
        if (defaultResult && defaultResult.data) {
          aiWelcomePage = defaultResult.data.welcome || `欢迎莅临${banquetData.name}！`
          aiThankPage = defaultResult.data.thanks || `感谢您参加${banquetData.name}！`
          this.logger.log(`默认卡片生成成功`)
        }
      }
    } catch (error: any) {
      this.logger.warn(`AI内容生成失败: ${error.message}，使用默认内容`)
      // 使用默认内容
      aiWelcomePage = `欢迎莅临${banquetData.name}！`
      aiThankPage = `感谢您参加${banquetData.name}！`
    }

    const dataToInsert = {
      host_openid: banquetData.host_openid,
      type: banquetData.type,
      name: banquetData.name,
      host_nickname: banquetData.host_nickname || banquetData.hostNickname || null,
      event_time: banquetData.eventTime || banquetData.event_time,
      location: banquetData.location,
      photos: JSON.stringify(banquetData.photos || []),
      photo_keys: banquetData.photoKeys || banquetData.photo_keys || [],
      cover_image: banquetData.coverImage || banquetData.cover_image || null,
      return_gift_config: JSON.stringify(banquetData.returnGiftConfig || banquetData.return_gift_config || null),
      return_gift_ids: JSON.stringify(banquetData.returnGiftIds || banquetData.return_gift_ids || []),
      description: banquetData.description || null,
      staff_wechat: banquetData.staff_wechat || null,
      status: 'active',
      ai_welcome_page: aiWelcomePage,
      ai_thank_page: aiThankPage,
      // AI页面相关字段
      ai_page_enabled: true,
      ai_page_paid: banquetData.ai_page_paid || false,
      ai_page_images: JSON.stringify(banquetData.photos || []),
      ai_page_cover_image: banquetData.ai_page_cover_image || banquetData.custom_banquet_cover || null,
      welcome_page_image: banquetData.welcome_page_image || banquetData.custom_welcome_cover || null,
      thank_page_image: banquetData.thank_page_image || banquetData.custom_thank_cover || null,
      welcome_text: aiWelcomePage,
      thank_text: aiThankPage
    }

    this.logger.log(`准备插入宴会数据: ${JSON.stringify(dataToInsert)}`)

    // 🔥 使用事务确保宴会和回礼设置同时创建或同时失败
    let data: any

    try {
      const client = await getClient()

      try {
        // 开始事务
        await client.query('BEGIN')
        this.logger.log('事务开始...')

        // 插入宴会数据
        const { query: insertQuery, values } = new SqlBuilder()
          .from('banquets')
          .insert(dataToInsert)
          .build()

        this.logger.log(`插入查询: ${insertQuery}`)
        this.logger.log(`参数数量: ${values.length}`)

        const result = await client.query(insertQuery, values)
        data = result.rows[0]
        this.logger.log(`宴会数据插入成功: id=${data.id}`)

        // 如果有回礼配置，在同一事务中创建 return_gift_settings 记录
        const returnGiftConfig = banquetData.returnGiftConfig || banquetData.return_gift_config
        if (returnGiftConfig && (
          returnGiftConfig.red_packet_enabled ||
          returnGiftConfig.mall_gift_enabled ||
          returnGiftConfig.onsite_gift_enabled
        )) {
          this.logger.log('在同一事务中创建回礼设置记录...')

          const settingsData = {
            banquet_id: data.id,
            red_packet_enabled: returnGiftConfig.red_packet_enabled || false,
            red_packet_amount: returnGiftConfig.red_packet_amount || 0,
            mall_gift_enabled: returnGiftConfig.mall_gift_enabled || false,
            mall_gift_items: JSON.stringify(returnGiftConfig.mall_gift_items || []),
            onsite_gift_enabled: returnGiftConfig.onsite_gift_enabled || false,
            onsite_gift_items: JSON.stringify(returnGiftConfig.onsite_gift_items || []),
            gift_claim_mode: 'all',
            total_budget: returnGiftConfig.total_budget || 0
          }

          const { query: settingsInsertQuery, values: settingsValues } = new SqlBuilder()
            .from('return_gift_settings')
            .insert(settingsData)
            .build()

          const settingsResult = await client.query(settingsInsertQuery, settingsValues)
          this.logger.log(`回礼设置记录插入成功: id=${settingsResult.rows[0].id}`)
        }

        // 提交事务
        await client.query('COMMIT')
        this.logger.log('事务提交成功')
      } catch (error) {
        // 回滚事务
        await client.query('ROLLBACK')
        this.logger.error('事务回滚:', error)
        throw error
      } finally {
        // 释放客户端
        client.release()
      }
    } catch (error: any) {
      this.logger.error(`宴会创建失败: ${error.message}`)
      throw error
    }

    this.logger.log(`宴会创建成功: id=${data.id}`)

    // 异步触发人情往来提醒：检查新宴会主办方是否曾在其他开通了人情提醒的宴会随礼
    // 如果是，通知那些宴会的主办方"该嘉宾正在办新宴，是时候回礼了"
    try {
      await this.giftReminderService.onUserCreateBanquet(data.id, data.host_openid)
    } catch (err: any) {
      this.logger.warn(`触发人情往来提醒失败（不影响宴会创建）: ${err.message}`)
    }

    // 自动生成二维码
    try {
      const qrcodeData = await this.getBanquetQrcode(data.id)
      data.qr_code = qrcodeData.qrcodeUrl || null
      data.qr_code_page = qrcodeData.page || null
    } catch (err: any) {
      this.logger.warn(`生成二维码失败: ${err.message}`)
    }

    return data
  }

  /**
   * 获取宴会二维码
   * 用于嘉宾扫码进入随礼页面
   *
   * scene参数说明：
   * - 微信限制scene最长32字符
   * - UUID格式(36字符)会被自动转换为32字符格式（去掉横线）
   * - 前端scan页面需要将32字符还原为UUID格式
   */
  async getBanquetQrcode(banquetId: string) {
    this.logger.log(`获取宴会二维码: ${banquetId}`)

    try {
      const result = await this.wechatConfig.generateMiniProgramCode(
        banquetId,
        'pages/scan/index',
        430
      )

      // 返回编码后的scene（32字符格式）
      const encodedScene = result.scene || banquetId.replace(/-/g, '')

      return {
        qrcodeUrl: result.base64,
        page: `pages/scan/index?id=${banquetId}`,
        scene: encodedScene,
        sceneFormat: 'short',  // 标识scene是32字符格式
        originalId: banquetId, // 保留原始UUID
        tip: this.wechatConfig.isConfigured() ? undefined : '请配置微信小程序 AppID 和 AppSecret 后生成真实二维码'
      }
    } catch (error: any) {
      this.logger.error(`获取宴会二维码失败: ${error.message}`)
      return {
        qrcodeUrl: '',
        page: `pages/scan/index?id=${banquetId}`,
        scene: banquetId.replace(/-/g, ''),
        error: error.message
      }
    }
  }

  /**
   * 更新宴会
   */
  async updateBanquet(id: string, data: any) {
    try {
      const { query: updateQuery, values } = new SqlBuilder()
        .from('banquets')
        .update({
          ...data,
          updated_at: new Date()
        })
        .where({ id })
        .build()

      const result = await query(updateQuery, values)
      this.logger.log(`更新宴会成功: id=${id}`)
      return result.rows[0]
    } catch (error: any) {
      this.logger.error(`更新宴会失败: ${error.message}`)
      throw new Error(error.message)
    }
  }

  /**
   * 删除宴会
   */
  async deleteBanquet(id: string) {
    try {
      const { query: deleteQuery, values } = new SqlBuilder()
        .from('banquets')
        .delete()
        .where({ id })
        .build()

      const result = await query(deleteQuery, values)
      this.logger.log(`删除宴会成功: id=${id}`)
      return result.rows[0]
    } catch (error: any) {
      this.logger.error(`删除宴会失败: ${error.message}`)
      throw new Error(error.message)
    }
  }
}
