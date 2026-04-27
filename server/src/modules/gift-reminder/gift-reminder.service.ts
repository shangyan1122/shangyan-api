import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { getSupabaseClient } from '@/storage/database/supabase-client'
import { WechatSubscribeService } from '../wechat-subscribe/wechat-subscribe.service'
import { PaidFeaturesService } from '../paid-features/paid-features.service'
import { TencentSmsService } from '@/services/tencent-sms.service'

const supabase = getSupabaseClient()

export interface GiftReminder {
  id: string
  openid: string
  guest_name: string
  guest_phone?: string
  guest_openid?: string
  source_banquet_id?: string
  gift_amount: number
  gift_date: string
  banquet_name: string
  banquet_type: string
  last_contact_date?: string
  reminder_enabled: boolean
  reminder_frequency: 'monthly' | 'quarterly' | 'yearly' | 'custom'
  next_reminder_date: string
  notes?: string
}

/**
 * 人情往来提醒服务
 * 
 * 核心业务规则（按宴会维度绑定）：
 * 
 * 1. 人情提醒关系严格按宴会维度绑定，不是按用户维度
 * 2. 只有开通了人情提醒的宴会，其随礼嘉宾才与主办方建立互相提醒
 *    - 场景：A办宴1（开通人情），B随礼 → A与B有互相提醒
 *    - 场景：A办宴2（未开通人情），B随礼，C随礼 → A与B无新增（宴1已有），A与C无提醒
 *    - 场景：A后期为宴2补开人情 → A与C建立互相提醒
 * 3. 主办方→嘉宾：定期提醒主办方"该嘉宾曾在您的宴会随礼，记得礼尚往来"
 * 4. 嘉宾→主办方：当嘉宾办新宴时，提醒主办方"该嘉宾正在办宴，他曾随礼给您"
 * 5. 关系终身有效，不随宴会结束而失效
 */
@Injectable()
export class GiftReminderService {
  private readonly logger = new Logger(GiftReminderService.name)
  private readonly apiKey = process.env.SILICONFLOW_API_KEY || ''
  private readonly baseUrl = process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1'
  private readonly model = process.env.SILICONFLOW_MODEL || 'deepseek-ai/DeepSeek-V3-0324'

  constructor(
    @Inject(forwardRef(() => WechatSubscribeService))
    private readonly subscribeService: WechatSubscribeService,
    private readonly paidFeaturesService: PaidFeaturesService,
    private readonly smsService: TencentSmsService
  ) {}

  // ============================================================
  // 定时任务
  // ============================================================

  /**
   * 定时任务：检查并发送主办方→嘉宾的定期提醒
   * 每天上午 9 点执行
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkAndSendReminders() {
    this.logger.log('开始检查人情往来提醒...')

    const today = new Date().toISOString().split('T')[0]

    // 查询需要提醒的记录
    const { data: reminders, error } = await supabase
      .from('gift_reminders')
      .select('*')
      .eq('reminder_enabled', true)
      .lte('next_reminder_date', today)

    if (error) {
      this.logger.error('查询提醒记录失败:', error)
      return
    }

    if (!reminders || reminders.length === 0) {
      this.logger.log('没有需要发送的提醒')
      return
    }

    this.logger.log(`找到 ${reminders.length} 条提醒记录`)

    // 发送提醒
    for (const reminder of reminders) {
      try {
        // 验证来源宴会的人情提醒仍然开通（终身有效，但做安全检查）
        const sourceBanquetId = reminder.source_banquet_id
        if (sourceBanquetId) {
          const stillEnabled = await this.paidFeaturesService.checkFeatureEnabled(sourceBanquetId, 'gift_reminder')
          if (!stillEnabled) {
            // 该宴会的提醒功能已关闭（理论上不会发生，因为终身有效），但安全起见禁用
            this.logger.warn(`宴会 ${sourceBanquetId} 的人情提醒已关闭，跳过该提醒`)
            await supabase
              .from('gift_reminders')
              .update({ reminder_enabled: false })
              .eq('id', reminder.id)
            continue
          }
        }

        await this.sendReminder(reminder)
        await this.updateNextReminderDate(reminder)
      } catch (error) {
        this.logger.error(`发送提醒失败: ${reminder.id}`, error)
      }
    }
  }

  // ============================================================
  // 核心业务方法
  // ============================================================

  /**
   * 宴会开通人情提醒后触发：为该宴会的所有随礼嘉宾建立互相提醒
   * 
   * 规则：
   * - 只处理当前宴会的随礼记录
   * - 每条随礼记录建立双向提醒：
   *   a) 主办方→嘉宾：定期提醒主办方"该嘉宾曾随礼"
   *   b) 嘉宾→主办方：当嘉宾办新宴时提醒主办方回礼
   * - 已存在的提醒不重复创建
   * 
   * 场景覆盖：
   * - 首次开通：为所有已有随礼嘉宾建立提醒
   * - 后期补开：只为该宴会的随礼嘉宾建立提醒（其他宴会的随礼不影响）
   */
  async onBanquetGiftReminderEnabled(banquetId: string): Promise<void> {
    this.logger.log(`宴会人情提醒开通，建立互相提醒: banquetId=${banquetId}`)

    try {
      // 1. 获取宴会信息
      const { data: banquet, error: banquetError } = await supabase
        .from('banquets')
        .select('id, name, type, host_openid, host_name')
        .eq('id', banquetId)
        .single()

      if (banquetError || !banquet) {
        this.logger.error('获取宴会信息失败:', banquetError)
        return
      }

      // 2. 获取该宴会所有已支付的随礼记录（仅限当前宴会）
      const { data: giftRecords, error: giftError } = await supabase
        .from('gift_records')
        .select('id, openid, guest_name, amount, created_at, guest_openid')
        .eq('banquet_id', banquetId)
        .eq('payment_status', 'paid')

      if (giftError) {
        this.logger.error('查询随礼记录失败:', giftError)
        return
      }

      if (!giftRecords || giftRecords.length === 0) {
        this.logger.log('该宴会暂无随礼记录，无需建立提醒')
        return
      }

      this.logger.log(`宴会 ${banquet.name} 共有 ${giftRecords.length} 条随礼记录，开始建立互相提醒`)

      // 3. 对每个随礼嘉宾，建立双向提醒
      for (const record of giftRecords) {
        const guestOpenid = record.openid || record.guest_openid
        const guestName = record.guest_name || '嘉宾'
        const giftAmount = record.amount
        const giftDate = new Date(record.created_at).toLocaleDateString('zh-CN')

        // 跳过主办方的自随礼
        if (guestOpenid === banquet.host_openid) {
          continue
        }

        // 3a. 主办方 → 嘉宾：定期提醒主办方"该嘉宾曾在您的宴会随礼"
        await this.upsertReminderRecord({
          reminderOpenid: banquet.host_openid,   // 提醒接收方：主办方
          targetOpenid: guestOpenid,             // 提醒对象：嘉宾
          targetName: guestName,
          giftAmount: giftAmount,
          giftDate: giftDate,
          sourceBanquetId: banquetId,            // 来源宴会（用于验证是否仍开通）
          banquetName: banquet.name,
          banquetType: banquet.type,
          direction: 'host_to_guest'
        })

        // 3b. 嘉宾 → 主办方：当嘉宾办新宴时提醒主办方回礼
        await this.upsertReminderRecord({
          reminderOpenid: guestOpenid,           // 提醒接收方：嘉宾
          targetOpenid: banquet.host_openid,     // 提醒对象：主办方
          targetName: banquet.host_name || '主办方',
          giftAmount: giftAmount,
          giftDate: giftDate,
          sourceBanquetId: banquetId,            // 来源宴会
          banquetName: banquet.name,
          banquetType: banquet.type,
          direction: 'guest_to_host'
        })
      }

      this.logger.log(`宴会 ${banquet.name} 互相提醒建立完成`)
    } catch (error: any) {
      this.logger.error('建立互相提醒失败:', error)
    }
  }

  /**
   * 随礼成功后触发：如果该宴会已开通人情提醒，实时建立互相提醒
   * 
   * 规则：
   * - 仅当该宴会已开通人情提醒时才建立提醒
   * - 未开通的宴会，随礼不会触发任何提醒
   * - 这确保了"按宴会维度绑定"的规则
   */
  async onGiftPaymentSuccess(banquetId: string, guestOpenid: string, guestName: string, giftAmount: number): Promise<void> {
    this.logger.log(`随礼成功，检查人情提醒: banquetId=${banquetId}, guest=${guestOpenid}`)

    try {
      // 1. 获取宴会信息
      const { data: banquet, error: banquetError } = await supabase
        .from('banquets')
        .select('id, name, type, host_openid, host_name')
        .eq('id', banquetId)
        .single()

      if (banquetError || !banquet) {
        this.logger.error('获取宴会信息失败:', banquetError)
        return
      }

      // 跳过主办方的自随礼
      if (guestOpenid === banquet.host_openid) {
        return
      }

      // 2. 严格检查：该宴会是否开通了人情提醒
      const reminderEnabled = await this.paidFeaturesService.checkFeatureEnabled(banquetId, 'gift_reminder')

      if (!reminderEnabled) {
        this.logger.log(`宴会 ${banquet.name} 未开通人情提醒，不建立提醒关系`)
        return  // 未开通则不建立任何提醒
      }

      const giftDate = new Date().toLocaleDateString('zh-CN')

      // 3. 建立双向提醒
      // 3a. 主办方 → 嘉宾
      await this.upsertReminderRecord({
        reminderOpenid: banquet.host_openid,
        targetOpenid: guestOpenid,
        targetName: guestName,
        giftAmount: giftAmount,
        giftDate: giftDate,
        sourceBanquetId: banquetId,
        banquetName: banquet.name,
        banquetType: banquet.type,
        direction: 'host_to_guest'
      })

      // 3b. 嘉宾 → 主办方
      await this.upsertReminderRecord({
        reminderOpenid: guestOpenid,
        targetOpenid: banquet.host_openid,
        targetName: banquet.host_name || '主办方',
        giftAmount: giftAmount,
        giftDate: giftDate,
        sourceBanquetId: banquetId,
        banquetName: banquet.name,
        banquetType: banquet.type,
        direction: 'guest_to_host'
      })

      this.logger.log(`宴会 ${banquet.name} 随礼提醒建立完成: ${guestName}`)

    } catch (error: any) {
      this.logger.error('随礼触发人情提醒失败:', error)
    }
  }

  /**
   * 用户创建新宴会时触发：双向即时通知
   * 
   * 核心规则：A与B绑定关系后，无论A或B创建完成宴会，对方均立即收到通知
   * 通知渠道：微信订阅消息 + 短信
   * 通知内容：宴会类型、名称、时间、地点等基本信息
   * 
   * 数据源：直接从 gift_reminders 表查找所有与该用户有绑定关系的对方
   *   - openid = 对方, guest_openid = 新宴会主办方（对方订阅了关于新主办方的提醒）
   *   - openid = 新宴会主办方, guest_openid = 对方（新主办方订阅了关于对方的提醒）
   * 两个方向取并集，去重后通知
   */
  async onUserCreateBanquet(newBanquetId: string, hostOpenid: string): Promise<void> {
    this.logger.log(`用户 ${hostOpenid} 创建新宴会，触发双向人情通知`)

    try {
      // 1. 获取新宴会完整信息
      const { data: newBanquet, error: banquetError } = await supabase
        .from('banquets')
        .select('id, name, type, host_openid, host_name, host_phone, event_time, location')
        .eq('id', newBanquetId)
        .single()

      if (banquetError || !newBanquet) {
        this.logger.error('获取新宴会信息失败:', banquetError)
        return
      }

      const banquetInfo = {
        type: newBanquet.type || '宴会',
        name: newBanquet.name,
        eventTime: newBanquet.event_time ? new Date(newBanquet.event_time).toLocaleString('zh-CN') : '待定',
        location: newBanquet.location || '待定'
      }

      // 去重：收集所有需要通知的用户openid
      const notifiedOpenids = new Set<string>()

      // 2. 从 gift_reminders 表查找所有与该用户有绑定关系的对方
      // 方向A：openid = 对方, guest_openid = hostOpenid（对方订阅了关于新主办方的提醒）
      // 方向B：openid = hostOpenid, guest_openid = 对方（新主办方订阅了关于对方的提醒）
      const { data: remindersAsTarget } = await supabase
        .from('gift_reminders')
        .select('openid, guest_openid, source_banquet_id, reminder_enabled')
        .eq('guest_openid', hostOpenid)
        .eq('reminder_enabled', true)

      const { data: remindersAsSubscriber } = await supabase
        .from('gift_reminders')
        .select('openid, guest_openid, source_banquet_id, reminder_enabled')
        .eq('openid', hostOpenid)
        .eq('reminder_enabled', true)

      // 合并去重：收集所有与 hostOpenid 有绑定关系的对方openid
      const relatedOpenids = new Set<string>()
      const sourceBanquetIds = new Map<string, string>()  // openid -> source_banquet_id

      if (remindersAsTarget) {
        for (const r of remindersAsTarget) {
          if (r.openid !== hostOpenid) {
            relatedOpenids.add(r.openid)
            if (r.source_banquet_id) sourceBanquetIds.set(r.openid, r.source_banquet_id)
          }
        }
      }

      if (remindersAsSubscriber) {
        for (const r of remindersAsSubscriber) {
          if (r.guest_openid !== hostOpenid) {
            relatedOpenids.add(r.guest_openid)
            if (r.source_banquet_id) sourceBanquetIds.set(r.guest_openid, r.source_banquet_id)
          }
        }
      }

      if (relatedOpenids.size === 0) {
        this.logger.log('该用户没有人情绑定关系，无需通知')
        return
      }

      this.logger.log(`找到 ${relatedOpenids.size} 个绑定关系，开始发送通知`)

      // 3. 批量查询对方用户信息（手机号等）
      const relatedOpenidArray = Array.from(relatedOpenids)
      const { data: userProfiles } = await supabase
        .from('users')
        .select('openid, phone, nickname')
        .in('openid', relatedOpenidArray)

      const phoneMap = new Map<string, string>()
      if (userProfiles) {
        for (const u of userProfiles) {
          if (u.phone) phoneMap.set(u.openid, u.phone)
        }
      }

      // 4. 逐个发送通知
      for (const targetOpenid of relatedOpenids) {
        // 验证来源宴会的人情提醒仍然开通
        const sourceBanquetId = sourceBanquetIds.get(targetOpenid)
        if (sourceBanquetId) {
          const stillEnabled = await this.paidFeaturesService.checkFeatureEnabled(sourceBanquetId, 'gift_reminder')
          if (!stillEnabled) {
            this.logger.log(`来源宴会 ${sourceBanquetId} 人情提醒已关闭，跳过 ${targetOpenid}`)
            continue
          }
        }

        // 微信订阅消息通知
        try {
          await this.subscribeService.sendBanquetCreatedNotify({
            openid: targetOpenid,
            hostName: newBanquet.host_name || '您的好友',
            banquetType: banquetInfo.type,
            banquetName: banquetInfo.name,
            eventTime: banquetInfo.eventTime,
            location: banquetInfo.location
          })
          this.logger.log(`已微信通知 ${targetOpenid}`)
        } catch (err: any) {
          this.logger.warn(`微信通知失败 ${targetOpenid}: ${err.message}`)
        }

        // 短信通知
        const phone = phoneMap.get(targetOpenid)
        if (phone) {
          try {
            await this.smsService.sendBanquetCreatedNotify(
              phone,
              undefined,
              newBanquet.host_name || '您的好友',
              banquetInfo.type,
              banquetInfo.name,
              banquetInfo.eventTime,
              banquetInfo.location
            )
            this.logger.log(`已短信通知 ${phone}`)
          } catch (err: any) {
            this.logger.warn(`短信通知失败 ${phone}: ${err.message}`)
          }
        }

        notifiedOpenids.add(targetOpenid)
      }

      this.logger.log(`宴会创建双向通知完成，共通知 ${notifiedOpenids.size} 人`)
    } catch (error: any) {
      this.logger.error('新宴会创建触发双向人情通知失败:', error)
    }
  }

  // ============================================================
  // 提醒记录管理
  // ============================================================

  /**
   * 创建或更新提醒记录（幂等操作）
   * 
   * 唯一键：reminder_openid + target_openid + source_banquet_id
   * 同一个用户、同一个目标、同一个来源宴会，只创建一条记录
   */
  private async upsertReminderRecord(params: {
    reminderOpenid: string   // 提醒接收方（谁收到提醒）
    targetOpenid: string     // 提醒对象（提醒关于谁）
    targetName: string       // 提醒对象名称
    giftAmount: number
    giftDate: string
    sourceBanquetId: string  // 来源宴会（关键：按宴会维度绑定）
    banquetName: string
    banquetType: string
    direction?: string       // host_to_guest | guest_to_host
  }): Promise<void> {
    const { reminderOpenid, targetOpenid, targetName, giftAmount, giftDate, sourceBanquetId, banquetName, banquetType } = params

    // 检查是否已存在（同一接收方、同一目标、同一来源宴会）
    const { data: existing } = await supabase
      .from('gift_reminders')
      .select('id')
      .eq('openid', reminderOpenid)
      .eq('guest_openid', targetOpenid)
      .eq('source_banquet_id', sourceBanquetId)
      .maybeSingle()

    if (existing) {
      // 已存在，更新最后联系时间（不重复创建）
      await supabase
        .from('gift_reminders')
        .update({ last_contact_date: new Date().toISOString() })
        .eq('id', existing.id)
      return
    }

    // 创建新记录
    const nextReminderDate = this.calculateNextReminderDate('quarterly')

    await supabase
      .from('gift_reminders')
      .insert({
        openid: reminderOpenid,
        guest_name: targetName,
        guest_openid: targetOpenid,
        source_banquet_id: sourceBanquetId,
        gift_amount: giftAmount,
        gift_date: giftDate,
        banquet_name: banquetName,
        banquet_type: banquetType,
        reminder_enabled: true,
        reminder_frequency: 'quarterly',
        next_reminder_date: nextReminderDate
      })
  }

  // ============================================================
  // 提醒发送
  // ============================================================

  /**
   * 发送提醒
   */
  private async sendReminder(reminder: GiftReminder) {
    const reminderContent = await this.generateReminderContent(reminder)

    this.logger.log(`
发送提醒:
  接收方: ${reminder.openid}
  提醒对象: ${reminder.guest_name}
  来源宴会: ${reminder.source_banquet_id}
  内容: ${reminderContent}
    `)

    try {
      await this.subscribeService.sendGiftReminder({
        openid: reminder.openid,
        guestName: reminder.guest_name,
        giftAmount: reminder.gift_amount,
        giftDate: reminder.gift_date,
        banquetName: reminder.banquet_name,
        reminderContent
      })
      this.logger.log('订阅消息发送成功')
    } catch (error: any) {
      this.logger.error(`订阅消息发送失败: ${error.message}`)
    }

    await supabase
      .from('gift_reminders')
      .update({ last_contact_date: new Date().toISOString() })
      .eq('id', reminder.id)
  }

  /**
   * 生成提醒内容（AI增强）
   */
  private async generateReminderContent(reminder: GiftReminder): Promise<string> {
    const daysSince = Math.floor(
      (Date.now() - new Date(reminder.gift_date).getTime()) / (1000 * 60 * 60 * 24)
    )

    const prompt = `你是一个人情往来的提醒助手。请根据以下信息生成一条温馨的提醒消息：

宾客姓名: ${reminder.guest_name}
礼金金额: ¥${(reminder.gift_amount / 100).toFixed(0)}
宴会: ${reminder.banquet_name} (${reminder.banquet_type})
随礼日期: ${reminder.gift_date}
距离今天: ${daysSince}天

要求：
1. 语气温馨、友好
2. 提醒用户保持人情往来
3. 建议合适的回礼或联系时机
4. 不要太长，控制在50字以内

请直接输出提醒内容：`

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 100,
        }),
      })

      if (!response.ok) {
        throw new Error(`SiliconFlow API error: ${response.status}`)
      }

      const data = await response.json()
      return data.choices[0]?.message?.content || `【人情提醒】${reminder.guest_name}曾在${reminder.banquet_name}随礼¥${(reminder.gift_amount / 100).toFixed(0)}，已过去${daysSince}天，记得保持联系哦~`
    } catch (error) {
      this.logger.error('生成提醒内容失败:', error)
      return `【人情提醒】${reminder.guest_name}曾在${reminder.banquet_name}随礼¥${(reminder.gift_amount / 100).toFixed(0)}，已过去${daysSince}天，记得保持联系哦~`
    }
  }

  /**
   * 更新下次提醒时间
   */
  private async updateNextReminderDate(reminder: GiftReminder) {
    const nextDate = this.calculateNextReminderDate(reminder.reminder_frequency)

    await supabase
      .from('gift_reminders')
      .update({ next_reminder_date: nextDate })
      .eq('id', reminder.id)
  }

  /**
   * 计算下次提醒时间
   */
  private calculateNextReminderDate(frequency: string): string {
    const now = new Date()

    switch (frequency) {
      case 'monthly':
        now.setMonth(now.getMonth() + 1)
        break
      case 'quarterly':
        now.setMonth(now.getMonth() + 3)
        break
      case 'yearly':
        now.setFullYear(now.getFullYear() + 1)
        break
      default:
        now.setMonth(now.getMonth() + 1)
    }

    return now.toISOString().split('T')[0]
  }

  // ============================================================
  // CRUD 方法（前端页面使用）
  // ============================================================

  /**
   * 创建提醒记录
   */
  async createReminder(params: {
    openid: string
    guestName: string
    guestPhone?: string
    giftAmount: number
    giftDate: string
    banquetName: string
    banquetType: string
    reminderFrequency?: 'monthly' | 'quarterly' | 'yearly' | 'custom'
    notes?: string
  }): Promise<GiftReminder> {
    const {
      openid,
      guestName,
      guestPhone,
      giftAmount,
      giftDate,
      banquetName,
      banquetType,
      reminderFrequency = 'quarterly',
      notes
    } = params

    const nextReminderDate = this.calculateNextReminderDate(reminderFrequency)

    const { data, error } = await supabase
      .from('gift_reminders')
      .insert({
        openid,
        guest_name: guestName,
        guest_phone: guestPhone,
        gift_amount: giftAmount,
        gift_date: giftDate,
        banquet_name: banquetName,
        banquet_type: banquetType,
        reminder_enabled: true,
        reminder_frequency: reminderFrequency,
        next_reminder_date: nextReminderDate,
        notes
      })
      .select()
      .single()

    if (error) {
      this.logger.error('创建提醒记录失败:', error)
      throw new Error(error.message)
    }

    return data
  }

  /**
   * 获取用户的提醒列表
   */
  async getUserReminders(openid: string): Promise<GiftReminder[]> {
    const { data, error } = await supabase
      .from('gift_reminders')
      .select('*')
      .eq('openid', openid)
      .order('next_reminder_date', { ascending: true })

    if (error) {
      this.logger.error('获取提醒列表失败:', error)
      return []
    }

    return data || []
  }

  /**
   * 更新提醒设置
   */
  async updateReminder(params: {
    id: string
    openid: string
    reminderEnabled?: boolean
    reminderFrequency?: 'monthly' | 'quarterly' | 'yearly' | 'custom'
    notes?: string
  }): Promise<void> {
    const { id, openid, reminderEnabled, reminderFrequency, notes } = params

    const updateData: any = {}

    if (reminderEnabled !== undefined) {
      updateData.reminder_enabled = reminderEnabled
    }

    if (reminderFrequency) {
      updateData.reminder_frequency = reminderFrequency
      updateData.next_reminder_date = this.calculateNextReminderDate(reminderFrequency)
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    const { error } = await supabase
      .from('gift_reminders')
      .update(updateData)
      .eq('id', id)
      .eq('openid', openid)

    if (error) {
      this.logger.error('更新提醒设置失败:', error)
      throw new Error(error.message)
    }
  }

  /**
   * 删除提醒
   */
  async deleteReminder(id: string, openid: string): Promise<void> {
    const { error } = await supabase
      .from('gift_reminders')
      .delete()
      .eq('id', id)
      .eq('openid', openid)

    if (error) {
      this.logger.error('删除提醒失败:', error)
      throw new Error(error.message)
    }
  }
}
