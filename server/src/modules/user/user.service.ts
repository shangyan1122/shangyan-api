import { Injectable } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'

@Injectable()
export class UserService {
  // 获取用户统计数据
  async getUserStats(openid: string) {
    const client = getSupabaseClient()
    
    // 查询主办的宴会数量
    const { count: totalBanquets } = await client
      .from('banquets')
      .select('*', { count: 'exact', head: true })
      .eq('host_openid', openid)

    // 先获取主办方的所有宴会ID
    const { data: banquets } = await client
      .from('banquets')
      .select('id')
      .eq('host_openid', openid)

    const banquetIds = banquets?.map(b => b.id) || []

    // 查询随礼记录数量和总金额
    let totalGifts = 0
    let totalAmount = 0

    if (banquetIds.length > 0) {
      const { data: giftRecords } = await client
        .from('gift_records')
        .select('amount')
        .eq('payment_status', 'paid')
        .in('banquet_id', banquetIds)

      totalGifts = giftRecords?.length || 0
      totalAmount = giftRecords?.reduce((sum, record) => sum + record.amount, 0) || 0
    }

    return {
      totalBanquets: totalBanquets || 0,
      totalGifts,
      totalAmount
    }
  }

  // 获取礼账列表（主办方视角）
  async getGiftLedger(hostOpenid: string, page: number = 1, pageSize: number = 20) {
    const client = getSupabaseClient()
    
    // 先获取主办方的所有宴会
    const { data: banquets } = await client
      .from('banquets')
      .select('id, name')
      .eq('host_openid', hostOpenid)

    if (!banquets || banquets.length === 0) {
      return { records: [], total: 0 }
    }

    const banquetIds = banquets.map(b => b.id)
    const banquetMap = new Map(banquets.map(b => [b.id, b.name]))

    // 查询这些宴会的随礼记录
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data: records, count } = await client
      .from('gift_records')
      .select('*', { count: 'exact' })
      .in('banquet_id', banquetIds)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false })
      .range(from, to)

    // 添加宴会名称
    const recordsWithBanquetName = records?.map(record => ({
      ...record,
      banquet_name: banquetMap.get(record.banquet_id)
    })) || []

    return {
      records: recordsWithBanquetName,
      total: count || 0
    }
  }

  // 获取嘉宾的随礼记录
  async getGuestGifts(guestOpenid: string) {
    const client = getSupabaseClient()
    
    const { data, error } = await client
      .from('gift_records')
      .select('*, banquets(name, type, event_time)')
      .eq('guest_openid', guestOpenid)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('获取嘉宾随礼记录失败:', error)
      return []
    }

    return data?.map(record => ({
      ...record,
      banquet_name: (record.banquets as any)?.name,
      banquet_type: (record.banquets as any)?.type,
      event_time: (record.banquets as any)?.event_time
    })) || []
  }

  /**
   * 获取嘉宾参加的宴会列表（去重），含回礼信息
   */
  async getGuestBanquets(guestOpenid: string) {
    const client = getSupabaseClient()
    
    // 查询嘉宾的随礼记录
    const { data: records, error } = await client
      .from('gift_records')
      .select('*')
      .eq('guest_openid', guestOpenid)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false })

    if (error || !records || records.length === 0) {
      console.error('获取嘉宾随礼记录失败:', error)
      return []
    }

    // 获取所有宴会ID
    const banquetIds = [...new Set(records.map(r => r.banquet_id))]
    
    // 查询宴会信息
    const { data: banquets, error: banquetError } = await client
      .from('banquets')
      .select('id, name, type, event_time, location, cover_image, host_openid')
      .in('id', banquetIds)

    if (banquetError || !banquets) {
      console.error('获取宴会信息失败:', banquetError)
      return []
    }

    // 查询回礼记录（按宴会ID查询，而非随礼记录ID，以覆盖同一宴会的所有回礼）
    const { data: returnGifts, error: returnGiftError } = await client
      .from('guest_return_gifts')
      .select('*')
      .eq('guest_openid', guestOpenid)
      .in('banquet_id', banquetIds)

    if (returnGiftError) {
      console.error('获取回礼记录失败:', returnGiftError)
    }

    // 建立宴会ID -> 回礼记录列表的映射（同一宴会可能有多条回礼）
    const returnGiftsByBanquet = new Map<string, any[]>()
    if (returnGifts) {
      for (const rg of returnGifts) {
        const list = returnGiftsByBanquet.get(rg.banquet_id) || []
        list.push(rg)
        returnGiftsByBanquet.set(rg.banquet_id, list)
      }
    }

    // 查询回礼设置（用于获取回礼商品详情）
    const { data: returnGiftSettings, error: settingsError } = await client
      .from('return_gift_settings')
      .select('banquet_id, mall_gift_enabled, mall_gift_items, onsite_gift_enabled, onsite_gift_items, gift_claim_mode, gift_threshold')
      .in('banquet_id', banquetIds)

    if (settingsError) {
      console.error('获取回礼设置失败:', settingsError)
    }

    const settingsMap = new Map<string, any>()
    if (returnGiftSettings) {
      for (const s of returnGiftSettings) {
        settingsMap.set(s.banquet_id, s)
      }
    }

    // 查询主办方信息
    const hostOpenids = [...new Set(banquets.map(b => b.host_openid))]
    const { data: hostUsers } = await client
      .from('users')
      .select('openid, nickname, avatar')
      .in('openid', hostOpenids)

    const hostMap = new Map<string, any>()
    if (hostUsers) {
      for (const u of hostUsers) {
        hostMap.set(u.openid, u)
      }
    }

    // 创建宴会映射
    const banquetMap = new Map(banquets.map(b => [b.id, b]))
    
    // 按宴会ID去重，汇总每个宴会的随礼和回礼信息
    const result: any[] = []
    const seenBanquets = new Set<string>()
    
    for (const record of records) {
      if (seenBanquets.has(record.banquet_id)) continue
      
      const banquet = banquetMap.get(record.banquet_id)
      if (banquet) {
        // 获取该宴会的所有回礼记录
        const banquetReturnGifts = returnGiftsByBanquet.get(record.banquet_id) || []
        const settings = settingsMap.get(record.banquet_id)
        const host = hostMap.get(banquet.host_openid)

        // 汇总该宴会的总随礼金额
        const sameBanquetRecords = records.filter(r => r.banquet_id === record.banquet_id)
        const totalAmount = sameBanquetRecords.reduce((sum, r) => sum + r.amount, 0)
        // 保留最新一条的祝福语
        const latestBlessing = record.blessing

        // 构建回礼信息（汇总所有回礼记录）
        const returnGiftInfo = this.buildReturnGiftInfo(banquetReturnGifts, settings)

        result.push({
          id: record.id,
          banquet_id: record.banquet_id,
          banquet_name: banquet.name,
          banquet_type: banquet.type,
          event_time: banquet.event_time,
          location: banquet.location,
          cover_image: banquet.cover_image,
          host_name: host?.nickname || '主办方',
          host_avatar: host?.avatar || '',
          amount: totalAmount,
          blessing: latestBlessing,
          gift_count: sameBanquetRecords.length,
          return_gift: returnGiftInfo,
          created_at: record.created_at
        })
        seenBanquets.add(record.banquet_id)
      }
    }

    return result
  }

  /**
   * 构建回礼信息摘要（支持同一宴会的多条回礼记录汇总）
   */
  private buildReturnGiftInfo(returnGifts: any[], settings: any): any {
    if ((!returnGifts || returnGifts.length === 0) && !settings) {
      return null
    }

    const hasReturnGift = returnGifts && returnGifts.length > 0
    const info: any = {
      has_return_gift: hasReturnGift,
      status: hasReturnGift ? returnGifts[0]?.status || 'pending' : 'none',
      // 商城回礼
      mall_gift: null,
      // 现场回礼
      onsite_gift: null,
    }

    // 商城回礼：查找已领取的商城礼品
    const claimedMallGift = returnGifts?.find(rg => rg.mall_gift_claimed)
    if (claimedMallGift) {
      info.mall_gift = {
        claimed: true,
        product_name: claimedMallGift.mall_product_name,
        product_image: claimedMallGift.mall_product_image,
        product_price: claimedMallGift.mall_product_price,
        claim_type: claimedMallGift.mall_claim_type,
        delivery_status: claimedMallGift.delivery_status,
      }
    } else if (settings?.mall_gift_enabled && settings.mall_gift_items?.length > 0) {
      // 未领取，但配置了商城礼品
      info.mall_gift = {
        claimed: false,
        available: true,
        items: settings.mall_gift_items.map((item: any) => ({
          product_name: item.product_name,
          product_image: item.product_image,
          product_price: item.product_price,
          remaining_count: item.remaining_count,
        })),
      }
    }

    // 现场回礼：查找已领取的现场礼品
    const claimedOnsiteGift = returnGifts?.find(rg => rg.onsite_gift_claimed)
    if (claimedOnsiteGift) {
      info.onsite_gift = {
        claimed: true,
        name: claimedOnsiteGift.onsite_gift_name,
        image: claimedOnsiteGift.onsite_gift_image,
        price: claimedOnsiteGift.onsite_gift_price,
        exchange_code: claimedOnsiteGift.exchange_code,
        exchange_status: claimedOnsiteGift.exchange_status,
      }
    } else if (settings?.onsite_gift_enabled && settings.onsite_gift_items?.length > 0) {
      // 未领取，但配置了现场礼品
      info.onsite_gift = {
        claimed: false,
        available: true,
        items: settings.onsite_gift_items.map((item: any) => ({
          name: item.name,
          image: item.image,
          price: item.price,
          remaining_count: item.remaining_count,
        })),
      }
    }

    // 领取模式
    if (settings) {
      info.gift_claim_mode = settings.gift_claim_mode
      info.gift_threshold = settings.gift_threshold
    }

    return info
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(openid: string) {
    const client = getSupabaseClient()
    
    // 查询用户表
    const { data: user, error } = await client
      .from('users')
      .select('*')
      .eq('openid', openid)
      .single()
    
    if (error || !user) {
      // 用户不存在，返回默认信息
      return {
        openid,
        nickname: '新用户',
        avatar: '',
        phone: '',
        isVip: false,
        vipExpireDate: ''
      }
    }
    
    return {
      id: user.id,
      openid: user.openid,
      nickname: user.nickname || '用户',
      avatar: user.avatar || '',
      phone: user.phone || '',
      isVip: user.is_vip || false,
      vipExpireDate: user.vip_expire_date || ''
    }
  }

  /**
   * 更新用户信息
   */
  async updateUserInfo(openid: string, data: { nickname?: string; avatar?: string }) {
    const client = getSupabaseClient()
    
    const updateData: any = { updated_at: new Date().toISOString() }
    if (data.nickname) updateData.nickname = data.nickname
    if (data.avatar) updateData.avatar = data.avatar
    
    await client
      .from('users')
      .update(updateData)
      .eq('openid', openid)
  }

  /**
   * 开通VIP
   */
  async activateVip(openid: string, months: number = 12): Promise<{ code: number; msg: string; data: { vipExpireDate: string } }> {
    const client = getSupabaseClient()
    
    try {
      // 查询用户
      const { data: user } = await client
        .from('users')
        .select('id, is_vip, vip_expire_date')
        .eq('openid', openid)
        .single()

      let isVip = false
      let vipExpireDateStr: string | null = null

      if (user) {
        isVip = user.is_vip || false
        vipExpireDateStr = user.vip_expire_date
      } else {
        // 用户不存在，创建用户
        const { data: newUser } = await client
          .from('users')
          .insert({ openid })
          .select('id')
          .single()
        
        if (!newUser) {
          return { code: 500, msg: '创建用户失败', data: { vipExpireDate: '' } }
        }
      }

      // 计算新的VIP到期时间
      let vipExpireDate: Date
      if (isVip && vipExpireDateStr && new Date(vipExpireDateStr) > new Date()) {
        // 如果当前是VIP且未过期，在原有基础上延长
        vipExpireDate = new Date(vipExpireDateStr)
      } else {
        // 否则从现在开始计算
        vipExpireDate = new Date()
      }
      vipExpireDate.setMonth(vipExpireDate.getMonth() + months)

      // 更新用户VIP状态
      await client
        .from('users')
        .update({
          is_vip: true,
          vip_expire_date: vipExpireDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('openid', openid)

      return {
        code: 200,
        msg: 'success',
        data: {
          vipExpireDate: vipExpireDate.toISOString().split('T')[0]
        }
      }
    } catch (error) {
      console.error('开通VIP失败:', error)
      return { code: 500, msg: '开通VIP失败', data: { vipExpireDate: '' } }
    }
  }
}
