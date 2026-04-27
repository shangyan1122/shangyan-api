import { Injectable, Logger } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'
import dayjs from 'dayjs'
import ExcelJS from 'exceljs'

@Injectable()
export class AdminFinanceService {
  private readonly logger = new Logger(AdminFinanceService.name)

  /**
   * 获取财务统计
   */
  async getStats(): Promise<{ code: number; msg: string; data: any }> {
    const client = getSupabaseClient()

    // 获取总收入（礼金总额）
    const { data: gifts } = await client
      .from('gift_records')
      .select('amount')

    const totalGift = gifts?.reduce((sum, g) => sum + (g.amount || 0), 0) || 0

    // 获取订单收入
    const { data: orders } = await client
      .from('mall_orders')
      .select('total_amount')
      .eq('status', 'completed')

    const totalOrder = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0

    // 获取VIP收入
    const { data: members } = await client
      .from('member_orders')
      .select('amount')
      .eq('status', 'completed')

    const totalVip = members?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0

    // 获取商户充值收入
    const { data: recharges } = await client
      .from('recharge_orders')
      .select('amount')
      .eq('status', 'completed')

    const totalRecharge = recharges?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0

    // 获取付费功能收入
    const { data: paidFeatures } = await client
      .from('payment_orders')
      .select('amount')
      .eq('status', 'completed')
      .eq('order_type', 'paid_feature')

    const totalPaidFeatures = paidFeatures?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    // 获取已提现总额
    const { data: withdraws } = await client
      .from('withdraw_records')
      .select('amount')
      .eq('status', 'completed')

    const totalWithdraw = withdraws?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0

    // 获取待处理提现
    const { data: pendingWithdraws } = await client
      .from('withdraw_records')
      .select('amount')
      .eq('status', 'pending')

    const pendingWithdraw = pendingWithdraws?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0

    // 今日收入
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString()

    const { data: todayGifts } = await client
      .from('gift_records')
      .select('amount')
      .gte('created_at', todayStr)

    const todayGift = todayGifts?.reduce((sum, g) => sum + (g.amount || 0), 0) || 0

    const { data: todayOrders } = await client
      .from('mall_orders')
      .select('total_amount')
      .eq('status', 'completed')
      .gte('paid_at', todayStr)

    const todayOrder = todayOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0

    const { data: todayRecharges } = await client
      .from('recharge_orders')
      .select('amount')
      .eq('status', 'completed')
      .gte('paid_at', todayStr)

    const todayRecharge = todayRecharges?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0

    const { data: todayPaidFeatures } = await client
      .from('payment_orders')
      .select('amount')
      .eq('status', 'completed')
      .eq('order_type', 'paid_feature')
      .gte('paid_at', todayStr)

    const todayPaidFeature = todayPaidFeatures?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    return {
      code: 200,
      msg: 'success',
      data: {
        totalIncome: totalGift + totalOrder + totalVip + totalRecharge + totalPaidFeatures,
        totalExpense: totalWithdraw,
        totalGift,
        totalOrder,
        totalVip,
        totalRecharge,
        totalPaidFeatures,
        totalWithdraw,
        pendingWithdraw,
        todayIncome: todayGift + todayOrder + todayRecharge + todayPaidFeature
      }
    }
  }

  /**
   * 获取交易流水
   */
  async getTransactions(params: {
    page?: number
    pageSize?: number
    type?: string
    category?: string
    startDate?: string
    endDate?: string
  }): Promise<{ code: number; msg: string; data: { list: any[]; total: number; page: number; pageSize: number } }> {
    const { page = 1, pageSize = 10, type, category, startDate, endDate } = params

    const client = getSupabaseClient()
    const transactions: any[] = []

    // 收入：礼金记录
    if (!type || type === 'income') {
      let giftQuery = client
        .from('gift_records')
        .select('*', { count: 'exact' })

      if (category === 'gift' || !category) {
        if (startDate) giftQuery = giftQuery.gte('created_at', startDate)
        if (endDate) giftQuery = giftQuery.lte('created_at', endDate + 'T23:59:59')

        const from = (page - 1) * pageSize
        const to = from + pageSize - 1
        giftQuery = giftQuery.range(from, to).order('created_at', { ascending: false })

        const { data: gifts } = await giftQuery
        gifts?.forEach(g => {
          transactions.push({
            id: g.id,
            orderNo: g.id,
            type: 'income',
            category: 'gift',
            amount: g.amount,
            status: 'completed',
            description: `${g.guest_name || '嘉宾'}随礼`,
            userName: g.guest_name,
            banquetName: g.banquet_id,
            createdAt: g.created_at,
            completedAt: g.created_at
          })
        })
      }
    }

    // 收入：订单
    if (!type || type === 'income') {
      let orderQuery = client
        .from('mall_orders')
        .select('*', { count: 'exact' })

      if (category === 'gift_goods' || !category) {
        if (startDate) orderQuery = orderQuery.gte('created_at', startDate)
        if (endDate) orderQuery = orderQuery.lte('created_at', endDate + 'T23:59:59')

        const from = (page - 1) * pageSize
        const to = from + pageSize - 1
        orderQuery = orderQuery.range(from, to).order('created_at', { ascending: false })

        const { data: orders } = await orderQuery
        orders?.forEach(o => {
          if (o.status === 'completed') {
            transactions.push({
              id: o.id,
              orderNo: o.order_no,
              type: 'income',
              category: 'gift_goods',
              amount: o.total_amount,
              status: 'completed',
              description: '购买礼品',
              userName: o.user_name,
              banquetName: o.banquet_id,
              createdAt: o.created_at,
              completedAt: o.paid_at
            })
          }
        })
      }
    }

    // 收入：VIP
    if (!type || type === 'income') {
      let memberQuery = client
        .from('member_orders')
        .select('*', { count: 'exact' })

      if (category === 'vip' || !category) {
        if (startDate) memberQuery = memberQuery.gte('created_at', startDate)
        if (endDate) memberQuery = memberQuery.lte('created_at', endDate + 'T23:59:59')

        const from = (page - 1) * pageSize
        const to = from + pageSize - 1
        memberQuery = memberQuery.range(from, to).order('created_at', { ascending: false })

        const { data: members } = await memberQuery
        members?.forEach(m => {
          if (m.status === 'completed') {
            transactions.push({
              id: m.id,
              orderNo: m.order_no,
              type: 'income',
              category: 'vip',
              amount: m.amount,
              status: 'completed',
              description: 'VIP开通',
              userName: m.user_name,
              banquetName: '-',
              createdAt: m.created_at,
              completedAt: m.paid_at
            })
          }
        })
      }
    }

    // 支出：提现
    if (!type || type === 'expense') {
      let withdrawQuery = client
        .from('withdraw_records')
        .select('*', { count: 'exact' })

      if (category === 'withdraw' || !category) {
        if (startDate) withdrawQuery = withdrawQuery.gte('created_at', startDate)
        if (endDate) withdrawQuery = withdrawQuery.lte('created_at', endDate + 'T23:59:59')

        const from = (page - 1) * pageSize
        const to = from + pageSize - 1
        withdrawQuery = withdrawQuery.range(from, to).order('created_at', { ascending: false })

        const { data: withdraws } = await withdrawQuery
        withdraws?.forEach(w => {
          transactions.push({
            id: w.id,
            orderNo: w.id,
            type: 'expense',
            category: 'withdraw',
            amount: w.amount,
            status: w.status,
            description: '提现到微信',
            userName: w.user_name,
            banquetName: '-',
            createdAt: w.created_at,
            completedAt: w.completed_at
          })
        })
      }
    }

    // 收入：商户充值
    if (!type || type === 'income') {
      let rechargeQuery = client
        .from('recharge_orders')
        .select('*', { count: 'exact' })

      if (category === 'recharge' || !category) {
        if (startDate) rechargeQuery = rechargeQuery.gte('created_at', startDate)
        if (endDate) rechargeQuery = rechargeQuery.lte('created_at', endDate + 'T23:59:59')

        const from = (page - 1) * pageSize
        const to = from + pageSize - 1
        rechargeQuery = rechargeQuery.range(from, to).order('created_at', { ascending: false })

        const { data: recharges } = await rechargeQuery
        recharges?.forEach(r => {
          if (r.status === 'completed') {
            transactions.push({
              id: r.id,
              orderNo: r.order_no,
              type: 'income',
              category: 'recharge',
              amount: r.amount,
              status: 'completed',
              description: '商户余额充值',
              userName: r.user_name,
              banquetName: '-',
              createdAt: r.created_at,
              completedAt: r.paid_at
            })
          }
        })
      }
    }

    // 收入：付费功能
    if (!type || type === 'income') {
      let paidFeaturesQuery = client
        .from('payment_orders')
        .select('*', { count: 'exact' })

      if (category === 'paid_features' || !category) {
        if (startDate) paidFeaturesQuery = paidFeaturesQuery.gte('created_at', startDate)
        if (endDate) paidFeaturesQuery = paidFeaturesQuery.lte('created_at', endDate + 'T23:59:59')

        const from = (page - 1) * pageSize
        const to = from + pageSize - 1
        paidFeaturesQuery = paidFeaturesQuery.range(from, to).order('created_at', { ascending: false })

        const { data: paidOrders } = await paidFeaturesQuery
        paidOrders?.forEach(p => {
          if (p.status === 'completed' && p.order_type === 'paid_feature') {
            const featureNameMap: Record<string, string> = {
              'ai_page': 'AI页面生成',
              'gift_export': '礼账导出',
              'gift_reminder': '人情提醒'
            }
            transactions.push({
              id: p.id,
              orderNo: p.order_no,
              type: 'income',
              category: 'paid_features',
              amount: p.amount,
              status: 'completed',
              description: featureNameMap[p.feature_type] || '付费功能',
              userName: p.user_name,
              banquetName: '-',
              createdAt: p.created_at,
              completedAt: p.paid_at
            })
          }
        })
      }
    }

    // 按时间排序
    transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return {
      code: 200,
      msg: 'success',
      data: {
        list: transactions.slice(0, pageSize),
        total: transactions.length,
        page,
        pageSize
      }
    }
  }

  /**
   * 审核提现
   */
  async approveWithdraw(recordId: string): Promise<{ code: number; msg: string; data: null }> {
    const client = getSupabaseClient()

    // TODO: 调用微信支付打款接口

    const { error } = await client
      .from('withdraw_records')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', recordId)
      .eq('status', 'pending')

    if (error) {
      this.logger.error(`审核提现失败: ${error.message}`)
      return { code: 500, msg: '操作失败', data: null }
    }

    this.logger.log(`审核提现成功: recordId=${recordId}`)
    return { code: 200, msg: '审核通过', data: null }
  }

  /**
   * 拒绝提现
   */
  async rejectWithdraw(recordId: string): Promise<{ code: number; msg: string; data: null }> {
    const client = getSupabaseClient()

    const { error } = await client
      .from('withdraw_records')
      .update({
        status: 'rejected',
        completed_at: new Date().toISOString()
      })
      .eq('id', recordId)
      .eq('status', 'pending')

    if (error) {
      this.logger.error(`拒绝提现失败: ${error.message}`)
      return { code: 500, msg: '操作失败', data: null }
    }

    this.logger.log(`拒绝提现: recordId=${recordId}`)
    return { code: 200, msg: '已拒绝', data: null }
  }

  /**
   * 获取财务趋势数据
   */
  async getFinanceTrends(params: {
    startDate: string
    endDate: string
  }): Promise<{ code: number; msg: string; data: any }> {
    const { startDate, endDate } = params

    try {
      const client = getSupabaseClient()

      // 生成日期序列
      const dates: string[] = []
      let current = new Date(startDate)
      const end = new Date(endDate)

      while (current <= end) {
        dates.push(current.toISOString().split('T')[0])
        current.setDate(current.getDate() + 1)
      }

      // 查询充值订单
      const { data: rechargeOrders } = await client
        .from('recharge_orders')
        .select('amount, status, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59')

      // 查询付费功能订单
      const { data: paidFeatureOrders } = await client
        .from('payment_orders')
        .select('amount, status, created_at')
        .eq('order_type', 'paid_feature')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59')

      // 按日期聚合数据
      const trendData = dates.map(date => {
        const dayRechargeOrders = rechargeOrders?.filter(o => o.created_at.startsWith(date)) || []
        const dayPaidFeatureOrders = paidFeatureOrders?.filter(o => o.created_at.startsWith(date)) || []

        const rechargeAmount = dayRechargeOrders
          .filter(o => o.status === 'completed')
          .reduce((sum, o) => sum + (o.amount || 0), 0)

        const rechargeCount = dayRechargeOrders
          .filter(o => o.status === 'completed')
          .length

        const paidFeatureAmount = dayPaidFeatureOrders
          .filter(o => o.status === 'completed')
          .reduce((sum, o) => sum + (o.amount || 0), 0)

        const paidFeatureCount = dayPaidFeatureOrders
          .filter(o => o.status === 'completed')
          .length

        return {
          date,
          rechargeAmount,
          rechargeCount,
          paidFeatureAmount,
          paidFeatureCount,
          totalIncome: rechargeAmount + paidFeatureAmount
        }
      })

      // 计算当前期汇总
      const totalRecharge = trendData.reduce((sum, d) => sum + d.rechargeAmount, 0)
      const totalRechargeCount = trendData.reduce((sum, d) => sum + d.rechargeCount, 0)
      const totalPaidFeatures = trendData.reduce((sum, d) => sum + d.paidFeatureAmount, 0)
      const totalPaidFeaturesCount = trendData.reduce((sum, d) => sum + d.paidFeatureCount, 0)
      const totalIncome = totalRecharge + totalPaidFeatures
      const avgRechargeAmount = totalRechargeCount > 0 ? totalRecharge / totalRechargeCount : 0

      // 计算同比增长（去年同期数据）
      const lastYearStart = new Date(startDate)
      lastYearStart.setFullYear(lastYearStart.getFullYear() - 1)
      const lastYearEnd = new Date(endDate)
      lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1)

      const { data: lastYearRecharges } = await client
        .from('recharge_orders')
        .select('amount, status, created_at')
        .gte('created_at', lastYearStart.toISOString().split('T')[0])
        .lte('created_at', lastYearEnd.toISOString().split('T')[0] + 'T23:59:59')

      const lastYearTotalRecharge = lastYearRecharges
        ?.filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + (o.amount || 0), 0) || 0

      const yearOnYearGrowth = lastYearTotalRecharge > 0
        ? ((totalRecharge - lastYearTotalRecharge) / lastYearTotalRecharge * 100)
        : 0

      // 计算环比增长（上一期数据，假设为上一个相同时间段）
      const periodStart = new Date(startDate)
      const daysDiff = Math.floor((end.getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
      periodStart.setDate(periodStart.getDate() - daysDiff - 1)
      const periodEnd = new Date(periodStart)
      periodEnd.setDate(periodEnd.getDate() + daysDiff)

      const { data: lastPeriodRecharges } = await client
        .from('recharge_orders')
        .select('amount, status, created_at')
        .gte('created_at', periodStart.toISOString().split('T')[0])
        .lte('created_at', periodEnd.toISOString().split('T')[0] + 'T23:59:59')

      const lastPeriodTotalRecharge = lastPeriodRecharges
        ?.filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + (o.amount || 0), 0) || 0

      const monthOnMonthGrowth = lastPeriodTotalRecharge > 0
        ? ((totalRecharge - lastPeriodTotalRecharge) / lastPeriodTotalRecharge * 100)
        : 0

      const summary = {
        totalRecharge,
        totalRechargeCount,
        totalPaidFeatures,
        totalPaidFeaturesCount,
        totalIncome,
        avgRechargeAmount,
        growthRate: yearOnYearGrowth,
        yearOnYearGrowth,
        monthOnMonthGrowth,
        lastYearTotalRecharge,
        lastPeriodTotalRecharge
      }

      return {
        code: 200,
        msg: 'success',
        data: {
          trend: trendData,
          summary
        }
      }
    } catch (error: any) {
      this.logger.error(`获取财务趋势失败: ${error.message}`)
      return {
        code: 500,
        msg: '查询失败',
        data: {
          trend: [],
          summary: {
            totalRecharge: 0,
            totalRechargeCount: 0,
            totalPaidFeatures: 0,
            totalPaidFeaturesCount: 0,
            totalIncome: 0,
            avgRechargeAmount: 0,
            growthRate: 0,
            yearOnYearGrowth: 0,
            monthOnMonthGrowth: 0,
            lastYearTotalRecharge: 0,
            lastPeriodTotalRecharge: 0
          }
        }
      }
    }
  }

  /**
   * 获取付费功能使用率
   */
  async getFeatureUsage(params: {
    startDate: string
    endDate: string
  }): Promise<{ code: number; msg: string; data: any[] }> {
    const { startDate, endDate } = params

    try {
      const client = getSupabaseClient()

      const { data: orders } = await client
        .from('payment_orders')
        .select('feature_type, amount, created_at')
        .eq('order_type', 'paid_feature')
        .eq('status', 'completed')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59')

      const featureNameMap: Record<string, string> = {
        ai_page: 'AI页面生成',
        gift_export: '礼账导出',
        gift_reminder: '人情提醒'
      }

      // 按功能类型统计
      const featureStats: Record<string, { count: number; amount: number }> = {}
      orders?.forEach(order => {
        const type = order.feature_type
        if (!featureStats[type]) {
          featureStats[type] = { count: 0, amount: 0 }
        }
        featureStats[type].count += 1
        featureStats[type].amount += order.amount || 0
      })

      // 组装结果
      const result = Object.entries(featureStats).map(([featureType, stats]) => ({
        featureType,
        featureName: featureNameMap[featureType] || featureType,
        count: stats.count,
        amount: stats.amount,
        growth: 0 // 可以对比上一期计算
      }))

      return {
        code: 200,
        msg: 'success',
        data: result
      }
    } catch (error: any) {
      this.logger.error(`获取付费功能使用率失败: ${error.message}`)
      return {
        code: 500,
        msg: '查询失败',
        data: []
      }
    }
  }

  /**
   * 导出财务报表
   */
  async exportFinance(params: {
    startDate?: string
    endDate?: string
    fields?: string[]
  }): Promise<Buffer> {
    const { startDate, endDate, fields } = params

    try {
      const client = getSupabaseClient()

      const defaultStartDate = startDate || dayjs().subtract(30, 'day').format('YYYY-MM-DD')
      const defaultEndDate = endDate || dayjs().format('YYYY-MM-DD')

      // 查询充值订单
      const { data: rechargeOrders } = await client
        .from('recharge_orders')
        .select('*')
        .gte('created_at', defaultStartDate)
        .lte('created_at', defaultEndDate + 'T23:59:59')

      // 查询付费功能订单
      const { data: paidFeatureOrders } = await client
        .from('payment_orders')
        .select('*')
        .eq('order_type', 'paid_feature')
        .gte('created_at', defaultStartDate)
        .lte('created_at', defaultEndDate + 'T23:59:59')

      // 创建Excel工作簿
      const workbook = new ExcelJS.Workbook()

      // 如果指定了字段，只导出汇总数据
      if (fields && fields.length > 0) {
        const worksheet = workbook.addWorksheet('财务汇总')

        // 计算汇总数据
        const totalRecharge = rechargeOrders
          ?.filter(o => o.status === 'completed')
          .reduce((sum, o) => sum + (o.amount || 0), 0) || 0

        const totalPaidFeatures = paidFeatureOrders
          ?.filter(o => o.status === 'completed')
          .reduce((sum, o) => sum + (o.amount || 0), 0) || 0

        const summaryData: any = {}

        if (fields.includes('date')) {
          summaryData['日期'] = `${defaultStartDate} ~ ${defaultEndDate}`
        }
        if (fields.includes('rechargeAmount')) {
          summaryData['充值金额'] = totalRecharge / 100
        }
        if (fields.includes('rechargeCount')) {
          summaryData['充值笔数'] = rechargeOrders?.filter(o => o.status === 'completed').length || 0
        }
        if (fields.includes('paidFeatureAmount')) {
          summaryData['付费功能收入'] = totalPaidFeatures / 100
        }
        if (fields.includes('paidFeatureCount')) {
          summaryData['付费功能笔数'] = paidFeatureOrders?.filter(o => o.status === 'completed').length || 0
        }
        if (fields.includes('totalIncome')) {
          summaryData['总收入'] = (totalRecharge + totalPaidFeatures) / 100
        }

        worksheet.columns = Object.keys(summaryData).map(key => ({
          header: key,
          key,
          width: 20
        }))

        worksheet.addRow(summaryData)
      } else {
        // 导出详细数据

        // 充值订单sheet
        const rechargeSheet = workbook.addWorksheet('充值订单')
        rechargeSheet.columns = [
          { header: '订单号', key: 'orderNo', width: 30 },
          { header: 'OpenID', key: 'openid', width: 30 },
          { header: '金额（元）', key: 'amount', width: 15 },
          { header: '状态', key: 'status', width: 15 },
          { header: '支付方式', key: 'paymentMethod', width: 15 },
          { header: '创建时间', key: 'createdAt', width: 25 },
          { header: '支付时间', key: 'paidAt', width: 25 }
        ]

        const statusMap: Record<string, string> = {
          pending: '待支付',
          completed: '已完成',
          failed: '失败',
          cancelled: '已取消'
        }

        rechargeOrders?.forEach(order => {
          rechargeSheet.addRow({
            orderNo: order.id,
            openid: order.openid,
            amount: (order.amount / 100).toFixed(2),
            status: statusMap[order.status] || order.status,
            paymentMethod: order.payment_method || 'wechat',
            createdAt: order.created_at,
            paidAt: order.paid_at || '-'
          })
        })

        // 付费功能订单sheet
        const paidFeatureSheet = workbook.addWorksheet('付费功能订单')
        paidFeatureSheet.columns = [
          { header: '订单号', key: 'orderNo', width: 30 },
          { header: 'OpenID', key: 'openid', width: 30 },
          { header: '宴会ID', key: 'banquetId', width: 30 },
          { header: '功能类型', key: 'featureType', width: 20 },
          { header: '金额（元）', key: 'amount', width: 15 },
          { header: '状态', key: 'status', width: 15 },
          { header: '创建时间', key: 'createdAt', width: 25 },
          { header: '支付时间', key: 'paidAt', width: 25 }
        ]

        const featureTypeMap: Record<string, string> = {
          ai_page: 'AI页面生成',
          gift_export: '礼账导出',
          gift_reminder: '人情提醒'
        }

        paidFeatureOrders?.forEach(order => {
          paidFeatureSheet.addRow({
            orderNo: order.order_no,
            openid: order.openid,
            banquetId: order.banquet_id,
            featureType: featureTypeMap[order.feature_type] || order.feature_type,
            amount: (order.amount / 100).toFixed(2),
            status: order.status,
            createdAt: order.created_at,
            paidAt: order.paid_at || '-'
          })
        })
      }

      // 生成Buffer
      return Buffer.from(await workbook.xlsx.writeBuffer())
    } catch (error: any) {
      this.logger.error(`导出财务报表失败: ${error.message}`)
      throw error
    }
  }

  /**
   * 获取数据预警配置
   */
  async getAlerts(): Promise<{ code: number; msg: string; data: any }> {
    // 模拟返回预警配置
    const alerts = [
      { id: 'recharge-low', name: '充值金额过低', threshold: 10000, enabled: true, message: '今日充值金额低于阈值' },
      { id: 'recharge-high', name: '充值金额异常高', threshold: 100000, enabled: true, message: '今日充值金额异常偏高' },
      { id: 'order-decline', name: '订单数下降', threshold: 0.8, enabled: true, message: '订单数较昨日下降' }
    ]

    return { code: 200, msg: '获取成功', data: alerts }
  }

  /**
   * 更新数据预警配置
   */
  async updateAlerts(body: any): Promise<{ code: number; msg: string; data: any }> {
    this.logger.log(`更新预警配置: ${JSON.stringify(body)}`)
    // 实际应该保存到数据库
    return { code: 200, msg: '更新成功', data: body }
  }

  /**
   * 获取字段配置
   */
  async getFieldConfig(): Promise<{ code: number; msg: string; data: any }> {
    const config = {
      recharge: [
        { key: 'date', label: '日期', default: true },
        { key: 'rechargeAmount', label: '充值金额', default: true },
        { key: 'rechargeCount', label: '充值笔数', default: true }
      ],
      paidFeatures: [
        { key: 'date', label: '日期', default: true },
        { key: 'paidFeatureAmount', label: '付费功能收入', default: true },
        { key: 'paidFeatureCount', label: '付费功能笔数', default: true }
      ],
      all: [
        { key: 'date', label: '日期', default: true },
        { key: 'rechargeAmount', label: '充值金额', default: true },
        { key: 'rechargeCount', label: '充值笔数', default: true },
        { key: 'paidFeatureAmount', label: '付费功能收入', default: true },
        { key: 'paidFeatureCount', label: '付费功能笔数', default: true },
        { key: 'totalIncome', label: '总收入', default: true }
      ]
    }

    return { code: 200, msg: '获取成功', data: config }
  }

  /**
   * 保存字段配置
   */
  async saveFieldConfig(body: any): Promise<{ code: number; msg: string; data: any }> {
    this.logger.log(`保存字段配置: ${JSON.stringify(body)}`)
    // 实际应该保存到数据库
    return { code: 200, msg: '保存成功', data: body }
  }

  /**
   * 按宴会统计收益
   * 聚合每场宴会的随礼收入、商城订单收入、付费功能收入等
   */
  async getBanquetRevenueStats(params: {
    page?: number
    pageSize?: number
    search?: string
    banquetType?: string
    startDate?: string
    endDate?: string
    sortField?: string
    sortOrder?: string
  }): Promise<{ code: number; msg: string; data: { list: any[]; total: number; summary: any } }> {
    const { page = 1, pageSize = 10, search, banquetType, startDate, endDate, sortField = 'totalRevenue', sortOrder = 'desc' } = params

    try {
      const client = getSupabaseClient()

      // 查询宴会基础信息
      let banquetQuery = client
        .from('banquets')
        .select('id, name, banquet_type, host_openid, host_name, event_time, location, guest_count, total_gift_amount, cover_image, created_at', { count: 'exact' })

      if (search) {
        banquetQuery = banquetQuery.or(`name.ilike.%${search}%,host_name.ilike.%${search}%`)
      }
      if (banquetType && banquetType !== 'all') {
        banquetQuery = banquetQuery.eq('banquet_type', banquetType)
      }
      if (startDate) {
        banquetQuery = banquetQuery.gte('event_time', startDate)
      }
      if (endDate) {
        banquetQuery = banquetQuery.lte('event_time', endDate + 'T23:59:59')
      }

      const { data: banquets, error: banquetError, count } = await banquetQuery

      if (banquetError) {
        this.logger.error(`查询宴会列表失败: ${banquetError.message}`)
        return { code: 500, msg: '查询失败', data: { list: [], total: 0, summary: null } }
      }

      if (!banquets || banquets.length === 0) {
        return { code: 200, msg: 'success', data: { list: [], total: 0, summary: this.emptySummary() } }
      }

      const banquetIds = banquets.map(b => b.id)

      // 查询随礼记录按宴会聚合
      const { data: giftAgg, error: giftError } = await client
        .from('gift_records')
        .select('banquet_id, amount')
        .in('banquet_id', banquetIds)

      if (giftError) {
        this.logger.error(`查询随礼记录失败: ${giftError.message}`)
      }

      // 查询商城订单按宴会聚合
      const { data: orderAgg, error: orderError } = await client
        .from('mall_orders')
        .select('banquet_id, total_amount, status')
        .in('banquet_id', banquetIds)

      if (orderError) {
        this.logger.error(`查询商城订单失败: ${orderError.message}`)
      }

      // 查询付费功能订单按宴会聚合
      const { data: paidFeatureAgg, error: paidError } = await client
        .from('payment_orders')
        .select('banquet_id, amount, status')
        .eq('order_type', 'paid_feature')
        .in('banquet_id', banquetIds)

      if (paidError) {
        this.logger.error(`查询付费功能订单失败: ${paidError.message}`)
      }

      // 查询回礼配置
      const { data: returnGiftSettings, error: rgError } = await client
        .from('return_gift_settings')
        .select('banquet_id, claim_mode, mall_product_id, onsite_gift_name')
        .in('banquet_id', banquetIds)

      if (rgError) {
        this.logger.error(`查询回礼配置失败: ${rgError.message}`)
      }

      // 查询随礼记录中嘉宾人数（按 banquet_id 去重 guest_openid）
      const { data: giftGuests, error: ggError } = await client
        .from('gift_records')
        .select('banquet_id, guest_openid')
        .in('banquet_id', banquetIds)

      if (ggError) {
        this.logger.error(`查询随礼嘉宾失败: ${ggError.message}`)
      }

      // 聚合数据
      const giftByBanquet: Record<string, { totalAmount: number; count: number; uniqueGuests: Set<string> }> = {}
      for (const g of giftAgg || []) {
        if (!giftByBanquet[g.banquet_id]) {
          giftByBanquet[g.banquet_id] = { totalAmount: 0, count: 0, uniqueGuests: new Set() }
        }
        giftByBanquet[g.banquet_id].totalAmount += g.amount || 0
        giftByBanquet[g.banquet_id].count += 1
      }
      for (const g of giftGuests || []) {
        if (giftByBanquet[g.banquet_id] && g.guest_openid) {
          giftByBanquet[g.banquet_id].uniqueGuests.add(g.guest_openid)
        }
      }

      const orderByBanquet: Record<string, { totalAmount: number; count: number }> = {}
      for (const o of orderAgg || []) {
        if (o.status !== 'completed') continue
        if (!orderByBanquet[o.banquet_id]) {
          orderByBanquet[o.banquet_id] = { totalAmount: 0, count: 0 }
        }
        orderByBanquet[o.banquet_id].totalAmount += o.total_amount || 0
        orderByBanquet[o.banquet_id].count += 1
      }

      const paidByBanquet: Record<string, { totalAmount: number; count: number }> = {}
      for (const p of paidFeatureAgg || []) {
        if (p.status !== 'completed') continue
        if (!paidByBanquet[p.banquet_id]) {
          paidByBanquet[p.banquet_id] = { totalAmount: 0, count: 0 }
        }
        paidByBanquet[p.banquet_id].totalAmount += p.amount || 0
        paidByBanquet[p.banquet_id].count += 1
      }

      const rgByBanquet: Record<string, any> = {}
      for (const r of returnGiftSettings || []) {
        rgByBanquet[r.banquet_id] = r
      }

      // 构建结果
      const list = banquets.map(b => {
        const gift = giftByBanquet[b.id] || { totalAmount: 0, count: 0, uniqueGuests: new Set() }
        const order = orderByBanquet[b.id] || { totalAmount: 0, count: 0 }
        const paid = paidByBanquet[b.id] || { totalAmount: 0, count: 0 }
        const rg = rgByBanquet[b.id] || null
        const totalRevenue = gift.totalAmount + order.totalAmount + paid.totalAmount

        return {
          banquetId: b.id,
          banquetName: b.name,
          banquetType: b.banquet_type,
          hostName: b.host_name,
          hostOpenid: b.host_openid,
          eventTime: b.event_time,
          location: b.location,
          coverImage: b.cover_image,
          guestCount: b.guest_count || 0,
          giftAmount: gift.totalAmount,
          giftCount: gift.count,
          uniqueGuestCount: gift.uniqueGuests.size,
          orderAmount: order.totalAmount,
          orderCount: order.count,
          paidFeatureAmount: paid.totalAmount,
          paidFeatureCount: paid.count,
          totalRevenue,
          returnGiftConfig: rg ? { claimMode: rg.claim_mode, mallProduct: rg.mall_product_id, onsiteGiftName: rg.onsite_gift_name } : null,
          createdAt: b.created_at
        }
      })

      // 排序
      list.sort((a, b) => {
        const aVal = (a as any)[sortField] || 0
        const bVal = (b as any)[sortField] || 0
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      })

      // 汇总
      const summary = {
        totalBanquets: count || 0,
        totalGiftAmount: list.reduce((sum, item) => sum + item.giftAmount, 0),
        totalGiftCount: list.reduce((sum, item) => sum + item.giftCount, 0),
        totalOrderAmount: list.reduce((sum, item) => sum + item.orderAmount, 0),
        totalOrderCount: list.reduce((sum, item) => sum + item.orderCount, 0),
        totalPaidFeatureAmount: list.reduce((sum, item) => sum + item.paidFeatureAmount, 0),
        totalPaidFeatureCount: list.reduce((sum, item) => sum + item.paidFeatureCount, 0),
        totalRevenue: list.reduce((sum, item) => sum + item.totalRevenue, 0),
        avgRevenuePerBanquet: list.length > 0 ? Math.round(list.reduce((sum, item) => sum + item.totalRevenue, 0) / list.length) : 0,
        avgGiftPerBanquet: list.length > 0 ? Math.round(list.reduce((sum, item) => sum + item.giftAmount, 0) / list.length) : 0,
        avgGuestPerBanquet: list.length > 0 ? Math.round(list.reduce((sum, item) => sum + item.guestCount, 0) / list.length) : 0
      }

      // 分页
      const pagedList = list.slice((page - 1) * pageSize, page * pageSize)

      return {
        code: 200,
        msg: 'success',
        data: {
          list: pagedList,
          total: list.length,
          summary
        }
      }
    } catch (error: any) {
      this.logger.error(`获取宴会收益统计失败: ${error.message}`)
      return { code: 500, msg: '查询失败', data: { list: [], total: 0, summary: this.emptySummary() } }
    }
  }

  private emptySummary() {
    return {
      totalBanquets: 0,
      totalGiftAmount: 0,
      totalGiftCount: 0,
      totalOrderAmount: 0,
      totalOrderCount: 0,
      totalPaidFeatureAmount: 0,
      totalPaidFeatureCount: 0,
      totalRevenue: 0,
      avgRevenuePerBanquet: 0,
      avgGiftPerBanquet: 0,
      avgGuestPerBanquet: 0
    }
  }

  /**
   * 获取导出历史
   */
  async getExportHistory(params: { page: number; pageSize: number }): Promise<{ code: number; msg: string; data: any }> {
    const { page, pageSize } = params

    // 模拟返回导出历史
    const mockData = Array.from({ length: 10 }, (_, i) => ({
      id: `export_${Date.now()}_${i}`,
      fileName: `finance_report_${Date.now() - i * 86400000}.xlsx`,
      type: i % 2 === 0 ? '充值订单' : '付费功能订单',
      fields: ['date', 'amount', 'count'],
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
      status: 'completed',
      fileSize: (Math.random() * 100 + 50).toFixed(2) + 'KB'
    }))

    const total = mockData.length
    const data = mockData.slice((page - 1) * pageSize, page * pageSize)

    return {
      code: 200,
      msg: '获取成功',
      data: {
        list: data,
        total,
        page,
        pageSize
      }
    }
  }
}
