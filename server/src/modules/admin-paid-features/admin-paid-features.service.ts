import { Injectable, Logger } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'
import * as ExcelJS from 'exceljs'

@Injectable()
export class AdminPaidFeaturesService {
  private readonly logger = new Logger(AdminPaidFeaturesService.name)

  /**
   * 获取付费功能订单列表
   */
  async getPaidFeaturesOrders(params: {
    page?: number
    pageSize?: number
    featureType?: string
    status?: string
    startDate?: string
    endDate?: string
  }): Promise<{ code: number; msg: string; data: { list: any[]; total: number; page: number; pageSize: number } }> {
    const { page = 1, pageSize = 10, featureType, status, startDate, endDate } = params

    try {
      const client = getSupabaseClient()

      let query = client
        .from('payment_orders')
        .select('*', { count: 'exact' })
        .eq('order_type', 'paid_feature')
        .order('created_at', { ascending: false })

      // 功能类型筛选
      if (featureType) {
        query = query.eq('feature_type', featureType)
      }

      // 状态筛选
      if (status) {
        query = query.eq('status', status)
      }

      // 日期筛选
      if (startDate) {
        query = query.gte('created_at', startDate)
      }
      if (endDate) {
        query = query.lte('created_at', endDate + 'T23:59:59')
      }

      // 获取总数
      const { count, error: countError } = await query

      if (countError) {
        this.logger.error(`获取付费功能订单总数失败: ${countError.message}`)
        return { code: 500, msg: '查询失败', data: { list: [], total: 0, page, pageSize } }
      }

      // 获取数据（分页）
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { data: orders, error: dataError } = await query.range(from, to)

      if (dataError) {
        this.logger.error(`获取付费功能订单列表失败: ${dataError.message}`)
        return { code: 500, msg: '查询失败', data: { list: [], total: 0, page, pageSize } }
      }

      // 获取用户信息
      const openids = orders?.map(o => o.openid) || []
      let userInfoMap: Record<string, any> = {}

      if (openids.length > 0) {
        const { data: users } = await client
          .from('users')
          .select('openid, nickname, phone')
          .in('openid', openids)

        users?.forEach(user => {
          userInfoMap[user.openid] = user
        })
      }

      // 获取宴会信息
      const banquetIds = orders?.map(o => o.banquet_id) || []
      let banquetInfoMap: Record<string, any> = {}

      if (banquetIds.length > 0) {
        const { data: banquets } = await client
          .from('banquets')
          .select('id, title')
          .in('id', banquetIds)

        banquets?.forEach(banquet => {
          banquetInfoMap[banquet.id] = banquet
        })
      }

      // 组装数据
      const list = orders?.map(order => {
        const user = userInfoMap[order.openid] || {}
        const banquet = banquetInfoMap[order.banquet_id] || {}
        return {
          id: order.id,
          orderNo: order.order_no,
          openid: order.openid,
          userName: user.nickname || '-',
          userPhone: user.phone || '-',
          banquetId: order.banquet_id,
          banquetName: banquet.title || '-',
          featureType: order.feature_type,
          amount: order.amount,
          status: order.status,
          transactionId: order.transaction_id || null,
          createdAt: order.created_at,
          paidAt: order.paid_at || null
        }
      }) || []

      return {
        code: 200,
        msg: 'success',
        data: {
          list,
          total: count || 0,
          page,
          pageSize
        }
      }
    } catch (error: any) {
      this.logger.error(`查询付费功能订单异常: ${error.message}`)
      return { code: 500, msg: '查询失败', data: { list: [], total: 0, page, pageSize } }
    }
  }

  /**
   * 获取付费功能统计
   */
  async getPaidFeaturesStats(): Promise<{ code: number; msg: string; data: any }> {
    try {
      const client = getSupabaseClient()

      // 累计收入和订单数
      const { data: allOrders } = await client
        .from('payment_orders')
        .select('amount, feature_type')
        .eq('order_type', 'paid_feature')
        .eq('status', 'completed')

      const totalAmount = allOrders?.reduce((sum, o) => sum + (o.amount || 0), 0) || 0
      const totalCount = allOrders?.length || 0

      // 按功能类型统计
      const byFeatureType = {
        ai_page: { count: 0, amount: 0 },
        gift_export: { count: 0, amount: 0 },
        gift_reminder: { count: 0, amount: 0 }
      }

      allOrders?.forEach(order => {
        const type = order.feature_type
        if (byFeatureType[type]) {
          byFeatureType[type].count += 1
          byFeatureType[type].amount += order.amount || 0
        }
      })

      // 今日收入和订单数
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString()

      const { data: todayOrders } = await client
        .from('payment_orders')
        .select('amount')
        .eq('order_type', 'paid_feature')
        .eq('status', 'completed')
        .gte('created_at', todayStr)

      const todayAmount = todayOrders?.reduce((sum, o) => sum + (o.amount || 0), 0) || 0
      const todayCount = todayOrders?.length || 0

      return {
        code: 200,
        msg: 'success',
        data: {
          totalAmount,
          totalCount,
          byFeatureType,
          todayAmount,
          todayCount
        }
      }
    } catch (error: any) {
      this.logger.error(`获取付费功能统计失败: ${error.message}`)
      return {
        code: 500,
        msg: '查询失败',
        data: {
          totalAmount: 0,
          totalCount: 0,
          byFeatureType: {
            ai_page: { count: 0, amount: 0 },
            gift_export: { count: 0, amount: 0 },
            gift_reminder: { count: 0, amount: 0 }
          },
          todayAmount: 0,
          todayCount: 0
        }
      }
    }
  }

  /**
   * 导出付费功能订单
   */
  async exportPaidFeaturesOrders(params: {
    startDate?: string
    endDate?: string
    featureType?: string
  }): Promise<Buffer> {
    const { startDate, endDate, featureType } = params

    try {
      const client = getSupabaseClient()

      let query = client
        .from('payment_orders')
        .select('*')
        .eq('order_type', 'paid_feature')
        .order('created_at', { ascending: false })

      if (featureType) {
        query = query.eq('feature_type', featureType)
      }

      if (startDate) {
        query = query.gte('created_at', startDate)
      }
      if (endDate) {
        query = query.lte('created_at', endDate + 'T23:59:59')
      }

      const { data: orders } = await query

      if (!orders || orders.length === 0) {
        return Buffer.from('')
      }

      // 获取用户信息
      const openids = orders.map(o => o.openid)
      const { data: users } = await client
        .from('users')
        .select('openid, nickname, phone')
        .in('openid', openids)

      const userInfoMap: Record<string, any> = {}
      users?.forEach(user => {
        userInfoMap[user.openid] = user
      })

      // 获取宴会信息
      const banquetIds = orders.map(o => o.banquet_id)
      const { data: banquets } = await client
        .from('banquets')
        .select('id, title')
        .in('id', banquetIds)

      const banquetInfoMap: Record<string, any> = {}
      banquets?.forEach(banquet => {
        banquetInfoMap[banquet.id] = banquet
      })

      // 创建Excel工作簿
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('付费功能订单')

      // 设置列
      worksheet.columns = [
        { header: '订单号', key: 'orderNo', width: 30 },
        { header: '用户昵称', key: 'userName', width: 20 },
        { header: '手机号', key: 'userPhone', width: 15 },
        { header: '宴会名称', key: 'banquetName', width: 25 },
        { header: '功能类型', key: 'featureType', width: 20 },
        { header: '金额（元）', key: 'amount', width: 15 },
        { header: '状态', key: 'status', width: 15 },
        { header: '创建时间', key: 'createdAt', width: 25 },
        { header: '支付时间', key: 'paidAt', width: 25 }
      ]

      // 添加数据
      const statusMap: Record<string, string> = {
        pending: '待支付',
        completed: '已完成',
        failed: '失败'
      }

      const featureTypeMap: Record<string, string> = {
        ai_page: 'AI页面生成',
        gift_export: '礼账导出',
        gift_reminder: '人情提醒'
      }

      orders.forEach(order => {
        const user = userInfoMap[order.openid] || {}
        const banquet = banquetInfoMap[order.banquet_id] || {}
        worksheet.addRow({
          orderNo: order.order_no,
          userName: user.nickname || '-',
          userPhone: user.phone || '-',
          banquetName: banquet.title || '-',
          featureType: featureTypeMap[order.feature_type] || order.feature_type,
          amount: (order.amount / 100).toFixed(2),
          status: statusMap[order.status] || order.status,
          createdAt: order.created_at,
          paidAt: order.paid_at || '-'
        })
      })

      // 生成Buffer
      return Buffer.from(await workbook.xlsx.writeBuffer())
    } catch (error: any) {
      this.logger.error(`导出付费功能订单失败: ${error.message}`)
      throw error
    }
  }
}
