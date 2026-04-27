import { Injectable, Logger } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'

export interface OperationLog {
  adminId: string
  adminName?: string
  adminPhone?: string
  module: string
  action: string
  description?: string
  method?: string
  url?: string
  ip?: string
  userAgent?: string
  requestData?: any
  responseData?: any
  status?: 'success' | 'failed'
  errorMessage?: string
}

/**
 * 操作日志服务
 * 记录管理员的操作日志，用于审计和追踪
 */
@Injectable()
export class OperationLogService {
  private readonly logger = new Logger(OperationLogService.name)
  private client = getSupabaseClient()

  /**
   * 记录操作日志
   */
  async log(logData: OperationLog): Promise<void> {
    try {
      const logRecord = {
        admin_id: logData.adminId,
        admin_name: logData.adminName,
        admin_phone: logData.adminPhone,
        module: logData.module,
        action: logData.action,
        description: logData.description,
        method: logData.method,
        url: logData.url,
        ip: logData.ip,
        user_agent: logData.userAgent,
        request_data: logData.requestData ? JSON.stringify(logData.requestData) : null,
        response_data: logData.responseData ? JSON.stringify(logData.responseData) : null,
        status: logData.status || 'success',
        error_message: logData.errorMessage
      }

      await this.client
        .from('admin_operation_logs')
        .insert(logRecord)

      this.logger.log(`操作日志已记录: ${logData.module}/${logData.action}`)
    } catch (error: any) {
      // 日志记录失败不应该影响业务流程，只打印错误
      this.logger.error(`记录操作日志失败: ${error.message}`)
    }
  }

  /**
   * 获取操作日志列表
   */
  async getLogs(params: {
    page?: number
    pageSize?: number
    adminId?: string
    module?: string
    action?: string
    startDate?: string
    endDate?: string
    keyword?: string
  }): Promise<{ data: any[]; total: number }> {
    let query = this.client
      .from('admin_operation_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // 管理员过滤
    if (params.adminId) {
      query = query.eq('admin_id', params.adminId)
    }

    // 模块过滤
    if (params.module) {
      query = query.eq('module', params.module)
    }

    // 动作过滤
    if (params.action) {
      query = query.eq('action', params.action)
    }

    // 时间范围过滤
    if (params.startDate) {
      query = query.gte('created_at', params.startDate)
    }
    if (params.endDate) {
      query = query.lte('created_at', params.endDate)
    }

    // 关键词搜索
    if (params.keyword) {
      query = query.or(`description.ilike.%${params.keyword}%,admin_name.ilike.%${params.keyword}%,admin_phone.ilike.%${params.keyword}%`)
    }

    // 分页
    if (params.page && params.pageSize) {
      const offset = (params.page - 1) * params.pageSize
      query = query.range(offset, offset + params.pageSize - 1)
    }

    const { data, count, error } = await query

    if (error) {
      this.logger.error(`获取操作日志失败: ${error.message}`)
      return { data: [], total: 0 }
    }

    return {
      data: data || [],
      total: count || 0
    }
  }

  /**
   * 获取日志统计
   */
  async getStats(params: {
    adminId?: string
    startDate?: string
    endDate?: string
  }): Promise<{
    totalLogs: number
    successLogs: number
    failedLogs: number
    moduleStats: Array<{ module: string; count: number }>
    actionStats: Array<{ action: string; count: number }>
  }> {
    let query = this.client
      .from('admin_operation_logs')
      .select('module, action, status')

    // 管理员过滤
    if (params.adminId) {
      query = query.eq('admin_id', params.adminId)
    }

    // 时间范围过滤
    if (params.startDate) {
      query = query.gte('created_at', params.startDate)
    }
    if (params.endDate) {
      query = query.lte('created_at', params.endDate)
    }

    const { data, error } = await query

    if (error || !data) {
      return {
        totalLogs: 0,
        successLogs: 0,
        failedLogs: 0,
        moduleStats: [],
        actionStats: []
      }
    }

    // 统计数据
    const totalLogs = data.length
    const successLogs = data.filter(log => log.status === 'success').length
    const failedLogs = data.filter(log => log.status === 'failed').length

    // 模块统计
    const moduleMap = new Map<string, number>()
    data.forEach(log => {
      moduleMap.set(log.module, (moduleMap.get(log.module) || 0) + 1)
    })
    const moduleStats = Array.from(moduleMap.entries()).map(([module, count]) => ({
      module,
      count
    }))

    // 动作统计
    const actionMap = new Map<string, number>()
    data.forEach(log => {
      actionMap.set(log.action, (actionMap.get(log.action) || 0) + 1)
    })
    const actionStats = Array.from(actionMap.entries()).map(([action, count]) => ({
      action,
      count
    }))

    return {
      totalLogs,
      successLogs,
      failedLogs,
      moduleStats,
      actionStats
    }
  }

  /**
   * 清理旧日志（定期任务调用）
   */
  async cleanOldLogs(days: number = 90): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const { data, error } = await this.client
      .from('admin_operation_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id')

    if (error) {
      this.logger.error(`清理旧日志失败: ${error.message}`)
      return 0
    }

    this.logger.log(`清理了 ${data?.length || 0} 条旧日志`)
    return data?.length || 0
  }
}
