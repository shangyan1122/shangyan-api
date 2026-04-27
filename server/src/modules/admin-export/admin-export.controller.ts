import { Controller, Get, Query, UseGuards, Req, Res, Logger } from '@nestjs/common'
import { Request, Response } from 'express'
import { AdminGuard } from '@/common/guards/admin.guard'
import { RequirePermissions } from '@/common/guards/permission.guard'
import { ExcelService } from '@/services/excel.service'
import { OperationLogService } from '@/services/operation-log.service'
import { getSupabaseClient } from '@/storage/database/supabase-client'

/**
 * 数据导出控制器
 */
@Controller('admin/export')
@UseGuards(AdminGuard)
export class AdminExportController {
  private readonly logger = new Logger(AdminExportController.name)

  constructor(
    private readonly excelService: ExcelService,
    private readonly operationLogService: OperationLogService
  ) {}

  /**
   * 导出订单数据
   */
  @Get('orders')
  @RequirePermissions('order:read')
  async exportOrders(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('status') status: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const client = getSupabaseClient()
      let query = client
        .from('mall_orders')
        .select('*')
        .order('created_at', { ascending: false })

      // 过滤条件
      if (startDate) {
        query = query.gte('created_at', startDate)
      }
      if (endDate) {
        query = query.lte('created_at', endDate)
      }
      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(error.message)
      }

      // 处理空数据情况
      if (!data || data.length === 0) {
        const emptyColumns = [
          { key: 'id', label: '订单ID', width: 30 },
          { key: 'order_no', label: '订单号', width: 20 },
          { key: 'user_phone', label: '用户手机', width: 15 },
          { key: 'banquet_name', label: '宴会名称', width: 20 },
          { key: 'banquet_type', label: '宴会类型', width: 12 },
          { key: 'total_amount', label: '订单金额', width: 12 },
          { key: 'status', label: '订单状态', width: 12 },
          { key: 'payment_method', label: '支付方式', width: 12 },
          { key: 'created_at', label: '创建时间', width: 20 }
        ]
        const buffer = await this.excelService.exportToExcel(
          [],
          emptyColumns,
          `订单数据_${new Date().getTime()}`
        )

        // 记录操作日志
        const admin = (req as any).admin
        await this.operationLogService.log({
          adminId: admin.id,
          adminName: admin.name,
          adminPhone: admin.phone,
          module: 'order',
          action: 'export',
          description: '导出订单数据，共0条',
          url: '/admin/export/orders'
        })

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        res.setHeader('Content-Disposition', `attachment; filename=orders_${new Date().getTime()}.xlsx`)
        res.send(buffer)
        return
      }

      // 定义导出列
      const columns = [
        { key: 'id', label: '订单ID', width: 30 },
        { key: 'order_no', label: '订单号', width: 20 },
        { key: 'user_phone', label: '用户手机', width: 15 },
        { key: 'banquet_name', label: '宴会名称', width: 20 },
        { key: 'banquet_type', label: '宴会类型', width: 12 },
        { key: 'total_amount', label: '订单金额', width: 12 },
        { key: 'status', label: '订单状态', width: 12 },
        { key: 'payment_method', label: '支付方式', width: 12 },
        { key: 'created_at', label: '创建时间', width: 20 }
      ]

      // 转换数据格式
      const exportData = data.map((order: any) => ({
        id: order.id,
        order_no: order.order_no || '-',
        user_phone: this.excelService.formatPhone(order.recipient_phone || ''),
        banquet_name: order.banquet_name || '-',
        banquet_type: order.banquet_type || '-',
        total_amount: this.excelService.formatAmount(order.pay_amount || 0),
        status: this.getStatusText(order.status),
        payment_method: '微信支付',
        created_at: this.excelService.formatDate(order.created_at)
      }))

      // 生成 Excel
      const buffer = await this.excelService.exportToExcel(
        exportData,
        columns,
        `订单数据_${new Date().getTime()}`
      )

      // 记录操作日志
      const admin = (req as any).admin
      await this.operationLogService.log({
        adminId: admin.id,
        adminName: admin.name,
        adminPhone: admin.phone,
        module: 'order',
        action: 'export',
        description: `导出订单数据，共${data.length}条`,
        url: '/admin/export/orders'
      })

      // 设置响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename=orders_${new Date().getTime()}.xlsx`)
      res.send(buffer)
    } catch (error: any) {
      this.logger.error(`导出订单失败: ${error.message}`)
      res.status(500).json({ code: 500, msg: '导出失败' })
    }
  }

  /**
   * 导出用户数据
   */
  @Get('users')
  @RequirePermissions('user:read')
  async exportUsers(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const client = getSupabaseClient()
      let query = client
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      // 过滤条件
      if (startDate) {
        query = query.gte('created_at', startDate)
      }
      if (endDate) {
        query = query.lte('created_at', endDate)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(error.message)
      }

      // 处理空数据情况
      if (!data || data.length === 0) {
        const emptyColumns = [
          { key: 'id', label: '用户ID', width: 30 },
          { key: 'phone', label: '手机号', width: 15 },
          { key: 'nickname', label: '昵称', width: 15 },
          { key: 'role', label: '角色', width: 12 },
          { key: 'balance', label: '余额（元）', width: 12 },
          { key: 'total_income', label: '累计收入（元）', width: 12 },
          { key: 'total_expense', label: '累计支出（元）', width: 12 },
          { key: 'created_at', label: '注册时间', width: 20 }
        ]
        const buffer = await this.excelService.exportToExcel(
          [],
          emptyColumns,
          `用户数据_${new Date().getTime()}`
        )

        const admin = (req as any).admin
        await this.operationLogService.log({
          adminId: admin.id,
          adminName: admin.name,
          adminPhone: admin.phone,
          module: 'user',
          action: 'export',
          description: '导出用户数据，共0条',
          url: '/admin/export/users'
        })

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        res.setHeader('Content-Disposition', `attachment; filename=users_${new Date().getTime()}.xlsx`)
        res.send(buffer)
        return
      }

      // 定义导出列
      const columns = [
        { key: 'id', label: '用户ID', width: 30 },
        { key: 'phone', label: '手机号', width: 15 },
        { key: 'nickname', label: '昵称', width: 15 },
        { key: 'role', label: '角色', width: 12 },
        { key: 'balance', label: '余额（元）', width: 12 },
        { key: 'total_income', label: '累计收入（元）', width: 12 },
        { key: 'total_expense', label: '累计支出（元）', width: 12 },
        { key: 'created_at', label: '注册时间', width: 20 }
      ]

      // 转换数据格式
      const exportData = data.map((user: any) => ({
        id: user.id,
        phone: this.excelService.formatPhone(user.phone || ''),
        nickname: user.nickname || '-',
        role: this.getUserRoleText(user.role),
        balance: (user.balance || 0) / 100,
        total_income: (user.total_income || 0) / 100,
        total_expense: (user.total_expense || 0) / 100,
        created_at: this.excelService.formatDate(user.created_at)
      }))

      // 生成 Excel
      const buffer = await this.excelService.exportToExcel(
        exportData,
        columns,
        `用户数据_${new Date().getTime()}`
      )

      // 记录操作日志
      const admin = (req as any).admin
      await this.operationLogService.log({
        adminId: admin.id,
        adminName: admin.name,
        adminPhone: admin.phone,
        module: 'user',
        action: 'export',
        description: `导出用户数据，共${data.length}条`,
        url: '/admin/export/users'
      })

      // 设置响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename=users_${new Date().getTime()}.xlsx`)
      res.send(buffer)
    } catch (error: any) {
      this.logger.error(`导出用户失败: ${error.message}`)
      res.status(500).json({ code: 500, msg: '导出失败' })
    }
  }

  /**
   * 导出宴会数据
   */
  @Get('banquets')
  @RequirePermissions('banquet:read')
  async exportBanquets(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('type') type: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const client = getSupabaseClient()
      let query = client
        .from('banquets')
        .select('*')
        .order('created_at', { ascending: false })

      // 过滤条件
      if (startDate) {
        query = query.gte('created_at', startDate)
      }
      if (endDate) {
        query = query.lte('created_at', endDate)
      }
      if (type) {
        query = query.eq('banquet_type', type)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(error.message)
      }

      // 处理空数据情况
      if (!data || data.length === 0) {
        const emptyColumns = [
          { key: 'id', label: '宴会ID', width: 30 },
          { key: 'name', label: '宴会名称', width: 20 },
          { key: 'type', label: '宴会类型', width: 12 },
          { key: 'host_name', label: '主办方姓名', width: 15 },
          { key: 'host_phone', label: '主办方电话', width: 15 },
          { key: 'venue_name', label: '举办地点', width: 20 },
          { key: 'banquet_date', label: '举办日期', width: 15 },
          { key: 'guest_count', label: '嘉宾数', width: 10 },
          { key: 'total_gift_amount', label: '礼金总额（元）', width: 12 },
          { key: 'created_at', label: '创建时间', width: 20 }
        ]
        const buffer = await this.excelService.exportToExcel(
          [],
          emptyColumns,
          `宴会数据_${new Date().getTime()}`
        )

        const admin = (req as any).admin
        await this.operationLogService.log({
          adminId: admin.id,
          adminName: admin.name,
          adminPhone: admin.phone,
          module: 'banquet',
          action: 'export',
          description: '导出宴会数据，共0条',
          url: '/admin/export/banquets'
        })

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        res.setHeader('Content-Disposition', `attachment; filename=banquets_${new Date().getTime()}.xlsx`)
        res.send(buffer)
        return
      }

      // 定义导出列
      const columns = [
        { key: 'id', label: '宴会ID', width: 30 },
        { key: 'name', label: '宴会名称', width: 20 },
        { key: 'type', label: '宴会类型', width: 12 },
        { key: 'host_name', label: '主办方姓名', width: 15 },
        { key: 'host_phone', label: '主办方电话', width: 15 },
        { key: 'venue_name', label: '举办地点', width: 20 },
        { key: 'banquet_date', label: '举办日期', width: 15 },
        { key: 'guest_count', label: '嘉宾数', width: 10 },
        { key: 'total_gift_amount', label: '礼金总额（元）', width: 12 },
        { key: 'created_at', label: '创建时间', width: 20 }
      ]

      // 转换数据格式
      const exportData = data.map((banquet: any) => ({
        id: banquet.id,
        name: banquet.banquet_name || banquet.name || '-',
        type: banquet.banquet_type || banquet.type || '-',
        host_name: banquet.host_name || '-',
        host_phone: this.excelService.formatPhone(banquet.host_phone || ''),
        venue_name: banquet.venue_name || '-',
        banquet_date: this.excelService.formatDate(banquet.banquet_date),
        guest_count: banquet.guest_count || 0,
        total_gift_amount: (banquet.total_gift_amount || 0) / 100,
        created_at: this.excelService.formatDate(banquet.created_at)
      }))

      // 生成 Excel
      const buffer = await this.excelService.exportToExcel(
        exportData,
        columns,
        `宴会数据_${new Date().getTime()}`
      )

      // 记录操作日志
      const admin = (req as any).admin
      await this.operationLogService.log({
        adminId: admin.id,
        adminName: admin.name,
        adminPhone: admin.phone,
        module: 'banquet',
        action: 'export',
        description: `导出宴会数据，共${data.length}条`,
        url: '/admin/export/banquets'
      })

      // 设置响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename=banquets_${new Date().getTime()}.xlsx`)
      res.send(buffer)
    } catch (error: any) {
      this.logger.error(`导出宴会失败: ${error.message}`)
      res.status(500).json({ code: 500, msg: '导出失败' })
    }
  }

  /**
   * 导出财务数据
   */
  @Get('finance')
  @RequirePermissions('finance:read')
  async exportFinance(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const client = getSupabaseClient()

      // 查询随礼记录作为财务数据
      let query = client
        .from('gift_records')
        .select('*')
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false })

      // 过滤条件
      if (startDate) {
        query = query.gte('created_at', startDate)
      }
      if (endDate) {
        query = query.lte('created_at', endDate)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(error.message)
      }

      // 处理空数据情况
      if (!data || data.length === 0) {
        const emptyColumns = [
          { key: 'id', label: '记录ID', width: 30 },
          { key: 'guest_name', label: '嘉宾姓名', width: 15 },
          { key: 'guest_phone', label: '嘉宾电话', width: 15 },
          { key: 'banquet_name', label: '宴会名称', width: 20 },
          { key: 'amount', label: '随礼金额（元）', width: 12 },
          { key: 'payment_method', label: '支付方式', width: 12 },
          { key: 'payment_status', label: '支付状态', width: 12 },
          { key: 'created_at', label: '支付时间', width: 20 }
        ]
        const buffer = await this.excelService.exportToExcel(
          [],
          emptyColumns,
          `财务数据_${new Date().getTime()}`
        )

        const admin = (req as any).admin
        await this.operationLogService.log({
          adminId: admin.id,
          adminName: admin.name,
          adminPhone: admin.phone,
          module: 'finance',
          action: 'export',
          description: '导出财务数据，共0条',
          url: '/admin/export/finance'
        })

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        res.setHeader('Content-Disposition', `attachment; filename=finance_${new Date().getTime()}.xlsx`)
        res.send(buffer)
        return
      }

      // 定义导出列
      const columns = [
        { key: 'id', label: '记录ID', width: 30 },
        { key: 'guest_name', label: '嘉宾姓名', width: 15 },
        { key: 'guest_phone', label: '嘉宾电话', width: 15 },
        { key: 'banquet_name', label: '宴会名称', width: 20 },
        { key: 'amount', label: '随礼金额（元）', width: 12 },
        { key: 'payment_method', label: '支付方式', width: 12 },
        { key: 'payment_status', label: '支付状态', width: 12 },
        { key: 'created_at', label: '支付时间', width: 20 }
      ]

      // 转换数据格式
      const exportData = data.map((record: any) => ({
        id: record.id,
        guest_name: record.guest_name || '-',
        guest_phone: this.excelService.formatPhone(record.guest_phone || ''),
        banquet_name: record.banquet_name || '-',
        amount: (record.amount || 0) / 100,
        payment_method: '微信支付',
        payment_status: this.getPaymentStatusText(record.payment_status),
        created_at: this.excelService.formatDate(record.created_at)
      }))

      // 生成 Excel
      const buffer = await this.excelService.exportToExcel(
        exportData,
        columns,
        `财务数据_${new Date().getTime()}`
      )

      // 记录操作日志
      const admin = (req as any).admin
      await this.operationLogService.log({
        adminId: admin.id,
        adminName: admin.name,
        adminPhone: admin.phone,
        module: 'finance',
        action: 'export',
        description: `导出财务数据，共${data.length}条`,
        url: '/admin/export/finance'
      })

      // 设置响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename=finance_${new Date().getTime()}.xlsx`)
      res.send(buffer)
    } catch (error: any) {
      this.logger.error(`导出财务失败: ${error.message}`)
      res.status(500).json({ code: 500, msg: '导出失败' })
    }
  }

  /**
   * 获取订单状态文本
   */
  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      pending: '待支付',
      paid: '已支付',
      shipped: '已发货',
      completed: '已完成',
      cancelled: '已取消',
      refunding: '退款中',
      refunded: '已退款'
    }
    return statusMap[status] || status
  }

  /**
   * 获取支付方式文本
   */
  private getPaymentMethodText(method: string): string {
    const methodMap: Record<string, string> = {
      wechat: '微信支付',
      alipay: '支付宝',
      balance: '余额支付'
    }
    return methodMap[method] || method
  }

  /**
   * 获取宴会状态文本
   */
  private getBanquetStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      draft: '草稿',
      published: '已发布',
      ongoing: '进行中',
      completed: '已结束',
      cancelled: '已取消'
    }
    return statusMap[status] || status
  }

  /**
   * 获取用户角色文本
   */
  private getUserRoleText(role: string): string {
    const roleMap: Record<string, string> = {
      user: '普通用户',
      host: '主办方',
      staff: '工作人员',
      admin: '管理员'
    }
    return roleMap[role] || role
  }

  /**
   * 获取支付状态文本
   */
  private getPaymentStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      pending: '待支付',
      paid: '已支付',
      failed: '支付失败',
      refunded: '已退款'
    }
    return statusMap[status] || status
  }
}
