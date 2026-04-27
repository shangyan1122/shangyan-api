import { Injectable, Logger } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'
import * as ExcelJS from 'exceljs'

@Injectable()
export class AdminRechargeService {
  private readonly logger = new Logger(AdminRechargeService.name)

  /**
   * 获取充值订单列表
   */
  async getRechargeOrders(params: {
    page?: number
    pageSize?: number
    status?: string
    search?: string
    startDate?: string
    endDate?: string
  }): Promise<{ code: number; msg: string; data: { list: any[]; total: number; page: number; pageSize: number } }> {
    const { page = 1, pageSize = 10, status, search, startDate, endDate } = params

    try {
      const client = getSupabaseClient()

      let query = client
        .from('recharge_orders')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

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
        this.logger.error(`获取充值订单总数失败: ${countError.message}`)
        return { code: 500, msg: '查询失败', data: { list: [], total: 0, page, pageSize } }
      }

      // 获取数据（分页）
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { data: orders, error: dataError } = await query.range(from, to)

      if (dataError) {
        this.logger.error(`获取充值订单列表失败: ${dataError.message}`)
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

      // 组装数据
      const list = orders?.map(order => {
        const user = userInfoMap[order.openid] || {}
        return {
          id: order.id,
          orderNo: order.id,
          openid: order.openid,
          userName: user.nickname || '-',
          userPhone: user.phone || '-',
          amount: order.amount,
          status: order.status,
          paymentMethod: order.payment_method || 'wechat',
          transactionId: order.transaction_id || null,
          createdAt: order.created_at,
          paidAt: order.paid_at || null,
          balanceAfter: order.balance_after || null
        }
      }) || []

      // 搜索过滤（前端搜索）
      if (search) {
        const filtered = list.filter(item =>
          item.orderNo.includes(search) ||
          item.userName.includes(search) ||
          item.userPhone.includes(search)
        )
        return {
          code: 200,
          msg: 'success',
          data: {
            list: filtered,
            total: filtered.length,
            page,
            pageSize
          }
        }
      }

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
      this.logger.error(`查询充值订单异常: ${error.message}`)
      return { code: 500, msg: '查询失败', data: { list: [], total: 0, page, pageSize } }
    }
  }

  /**
   * 获取充值统计
   */
  async getRechargeStats(): Promise<{ code: number; msg: string; data: any }> {
    try {
      const client = getSupabaseClient()

      // 累计充值金额和订单数
      const { data: allOrders } = await client
        .from('recharge_orders')
        .select('amount')
        .eq('status', 'completed')

      const totalAmount = allOrders?.reduce((sum, o) => sum + (o.amount || 0), 0) || 0
      const totalCount = allOrders?.length || 0

      // 今日充值金额和订单数
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString()

      const { data: todayOrders } = await client
        .from('recharge_orders')
        .select('amount')
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
          todayAmount,
          todayCount
        }
      }
    } catch (error: any) {
      this.logger.error(`获取充值统计失败: ${error.message}`)
      return { code: 500, msg: '查询失败', data: { totalAmount: 0, totalCount: 0, todayAmount: 0, todayCount: 0 } }
    }
  }

  /**
   * 导出充值订单
   */
  async exportRechargeOrders(params: {
    startDate?: string
    endDate?: string
    status?: string
  }): Promise<Buffer> {
    const { startDate, endDate, status } = params

    try {
      const client = getSupabaseClient()

      let query = client
        .from('recharge_orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
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

      // 创建Excel工作簿
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('充值订单')

      // 设置列
      worksheet.columns = [
        { header: '订单号', key: 'orderNo', width: 30 },
        { header: '用户昵称', key: 'userName', width: 20 },
        { header: '手机号', key: 'userPhone', width: 15 },
        { header: '金额（元）', key: 'amount', width: 15 },
        { header: '支付方式', key: 'paymentMethod', width: 15 },
        { header: '状态', key: 'status', width: 15 },
        { header: '交易流水号', key: 'transactionId', width: 30 },
        { header: '创建时间', key: 'createdAt', width: 25 },
        { header: '支付时间', key: 'paidAt', width: 25 }
      ]

      // 添加数据
      const statusMap: Record<string, string> = {
        pending: '待支付',
        completed: '已完成',
        failed: '失败',
        cancelled: '已取消'
      }

      const paymentMethodMap: Record<string, string> = {
        wechat: '微信支付',
        alipay: '支付宝'
      }

      orders.forEach(order => {
        const user = userInfoMap[order.openid] || {}
        worksheet.addRow({
          orderNo: order.id,
          userName: user.nickname || '-',
          userPhone: user.phone || '-',
          amount: (order.amount / 100).toFixed(2),
          paymentMethod: paymentMethodMap[order.payment_method] || order.payment_method,
          status: statusMap[order.status] || order.status,
          transactionId: order.transaction_id || '-',
          createdAt: order.created_at,
          paidAt: order.paid_at || '-'
        })
      })

      // 生成Buffer
      return Buffer.from(await workbook.xlsx.writeBuffer())
    } catch (error: any) {
      this.logger.error(`导出充值订单失败: ${error.message}`)
      throw error
    }
  }
}
