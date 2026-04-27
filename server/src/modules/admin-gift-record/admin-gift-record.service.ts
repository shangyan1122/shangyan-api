import { Injectable, Logger } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'

interface GiftRecordQuery {
  page: number
  pageSize: number
  banquetId?: string
  status?: string
  isSupplement?: boolean
  startDate?: string
  endDate?: string
  minAmount?: number
  maxAmount?: number
  keyword?: string
}

@Injectable()
export class AdminGiftRecordService {
  private readonly logger = new Logger(AdminGiftRecordService.name)

  /**
   * 获取礼账列表
   */
  async getGiftRecords(query: GiftRecordQuery) {
    const client = getSupabaseClient()
    let dbQuery = client
      .from('gift_records')
      .select(`
        *,
        banquets (
          id,
          name,
          type,
          host_name,
          event_time
        )
      `, { count: 'exact' })

    // 筛选条件
    if (query.banquetId) {
      dbQuery = dbQuery.eq('banquet_id', query.banquetId)
    }
    if (query.status) {
      dbQuery = dbQuery.eq('payment_status', query.status)
    }
    if (query.isSupplement !== undefined) {
      dbQuery = dbQuery.eq('is_supplement', query.isSupplement)
    }
    if (query.minAmount) {
      dbQuery = dbQuery.gte('amount', query.minAmount)
    }
    if (query.maxAmount) {
      dbQuery = dbQuery.lte('amount', query.maxAmount)
    }
    if (query.keyword) {
      dbQuery = dbQuery.or(`guest_name.ilike.%${query.keyword}%,guest_phone.ilike.%${query.keyword}%,remark.ilike.%${query.keyword}%`)
    }
    if (query.startDate) {
      dbQuery = dbQuery.gte('created_at', query.startDate)
    }
    if (query.endDate) {
      dbQuery = dbQuery.lte('created_at', query.endDate)
    }

    // 分页
    const from = (query.page - 1) * query.pageSize
    const to = from + query.pageSize - 1

    const { data, error, count } = await dbQuery
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      this.logger.error(`获取礼账列表失败: ${error.message}`)
      throw new Error(error.message)
    }

    return {
      code: 200,
      msg: 'success',
      data: data || [],
      total: count || 0,
      page: query.page,
      pageSize: query.pageSize
    }
  }

  /**
   * 获取礼账详情
   */
  async getGiftRecordDetail(id: string) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('gift_records')
      .select(`
        *,
        banquets (
          id,
          name,
          type,
          host_name,
          host_phone,
          event_time,
          location
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      this.logger.error(`获取礼账详情失败: ${error.message}`)
      throw new Error(error.message)
    }

    return {
      code: 200,
      msg: 'success',
      data
    }
  }

  /**
   * 审核补录礼账
   */
  async auditGiftRecord(id: string, approved: boolean, remark?: string) {
    const client = getSupabaseClient()

    // 先检查是否为补录记录
    const { data: record, error: fetchError } = await client
      .from('gift_records')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      this.logger.error(`查询礼账记录失败: ${fetchError.message}`)
      throw new Error('礼账记录不存在')
    }

    if (!record.is_supplement) {
      throw new Error('只能审核补录的礼账记录')
    }

    if (record.audit_status) {
      throw new Error('该记录已审核，不能重复审核')
    }

    // 更新审核状态
    const { error: updateError } = await client
      .from('gift_records')
      .update({
        audit_status: approved ? 'approved' : 'rejected',
        audit_remark: remark,
        audit_time: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      this.logger.error(`审核礼账失败: ${updateError.message}`)
      throw new Error(updateError.message)
    }

    this.logger.log(`礼账审核成功: id=${id}, approved=${approved}`)

    return {
      code: 200,
      msg: approved ? '审核通过' : '审核拒绝',
      data: { approved, remark }
    }
  }

  /**
   * 标记异常礼账
   */
  async markAsAbnormal(id: string, reason: string) {
    const client = getSupabaseClient()

    const { error } = await client
      .from('gift_records')
      .update({
        is_abnormal: true,
        abnormal_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      this.logger.error(`标记异常失败: ${error.message}`)
      throw new Error(error.message)
    }

    this.logger.log(`标记异常成功: id=${id}, reason=${reason}`)

    return {
      code: 200,
      msg: '标记异常成功',
      data: { reason }
    }
  }

  /**
   * 解除异常标记
   */
  async unmarkAsAbnormal(id: string) {
    const client = getSupabaseClient()

    const { error } = await client
      .from('gift_records')
      .update({
        is_abnormal: false,
        abnormal_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      this.logger.error(`解除异常标记失败: ${error.message}`)
      throw new Error(error.message)
    }

    this.logger.log(`解除异常标记成功: id=${id}`)

    return {
      code: 200,
      msg: '解除异常标记成功'
    }
  }

  /**
   * 获取礼账统计
   */
  async getGiftStats(params: { startDate?: string; endDate?: string }) {
    const client = getSupabaseClient()

    let query = client
      .from('gift_records')
      .select('*')

    if (params.startDate) {
      query = query.gte('created_at', params.startDate)
    }
    if (params.endDate) {
      query = query.lte('created_at', params.endDate)
    }

    const { data, error } = await query

    if (error) {
      this.logger.error(`获取礼账统计失败: ${error.message}`)
      throw new Error(error.message)
    }

    const records = data || []

    // 计算统计数据
    const stats = {
      totalRecords: records.length,
      totalAmount: records.reduce((sum, r) => sum + (r.amount || 0), 0),
      paidCount: records.filter(r => r.payment_status === 'paid').length,
      paidAmount: records.filter(r => r.payment_status === 'paid').reduce((sum, r) => sum + (r.amount || 0), 0),
      supplementCount: records.filter(r => r.is_supplement).length,
      supplementAmount: records.filter(r => r.is_supplement).reduce((sum, r) => sum + (r.amount || 0), 0),
      abnormalCount: records.filter(r => r.is_abnormal).length,
      auditPendingCount: records.filter(r => r.is_supplement && !r.audit_status).length,
      auditApprovedCount: records.filter(r => r.audit_status === 'approved').length,
      auditRejectedCount: records.filter(r => r.audit_status === 'rejected').length
    }

    return {
      code: 200,
      msg: 'success',
      data: stats
    }
  }

  /**
   * 批量删除礼账
   */
  async batchDeleteGiftRecords(ids: string[]) {
    const client = getSupabaseClient()

    const { error } = await client
      .from('gift_records')
      .delete()
      .in('id', ids)

    if (error) {
      this.logger.error(`批量删除礼账失败: ${error.message}`)
      throw new Error(error.message)
    }

    this.logger.log(`批量删除礼账成功: count=${ids.length}`)

    return {
      code: 200,
      msg: `成功删除 ${ids.length} 条礼账记录`,
      data: { deletedCount: ids.length }
    }
  }
}
