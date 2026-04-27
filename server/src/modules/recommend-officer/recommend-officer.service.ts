import { Injectable, Logger } from '@nestjs/common'
import { query, getClient } from '@/storage/database/pg-client'

// 推荐官佣金规则常量
const DEFAULT_VIP_COMMISSION_RATE = 18   // 默认VIP开通佣金：18%（宴客官等级）
const DEFAULT_MALL_COMMISSION_RATE = 7   // 默认商城消费佣金：7%（宴客官等级）
const COMMISSION_BIND_YEARS = 3          // 绑定有效期：3年
const PLATFORM_ACCOUNT_ID = 'platform'   // 平台账户ID
const MIN_WITHDRAW_AMOUNT = 1000         // 最低提现金额：10元（1000分）

export interface RecommendOfficerInfo {
  id: string
  openid: string
  real_name: string
  id_card?: string
  phone?: string
  status: string
  vip_commission_rate: number
  mall_commission_rate: number
  total_commission: number
  available_commission: number
  total_invitees: number
  created_at: string
}

export interface OfficerStats {
  totalInvitees: number
  activeInvitees: number
  totalCommission: number
  availableCommission: number
  pendingCommission: number
  vipCommissionRate: number
  mallCommissionRate: number
  isOfficer: boolean
  officerInfo?: RecommendOfficerInfo
}

@Injectable()
export class RecommendOfficerService {
  private readonly logger = new Logger(RecommendOfficerService.name)

  /**
   * 申请成为推荐官
   */
  async apply(
    openid: string,
    realName: string,
    idCard?: string,
    phone?: string
  ): Promise<{ code: number; msg: string; data?: RecommendOfficerInfo }> {
    try {
      // 检查是否已经是推荐官
      const { rows: existing } = await query(
        'SELECT * FROM recommend_officers WHERE openid = $1',
        [openid]
      )

      if (existing.length > 0) {
        const officer = existing[0]
        if (officer.status === 'approved') {
          return { code: 400, msg: '您已是推荐官', data: officer }
        }
        if (officer.status === 'banned') {
          return { code: 400, msg: '您的推荐官资格已被禁用，请联系客服' }
        }
        // 更新待审核的申请
        const { rows: updated } = await query(
          `UPDATE recommend_officers 
           SET real_name = $1, id_card = $2, phone = $3, updated_at = NOW() 
           WHERE id = $4 
           RETURNING *`,
          [realName, idCard, phone, officer.id]
        )
        return { code: 200, msg: '申请已更新，请等待审核', data: updated[0] }
      }

      // 创建新推荐官申请
      const { rows: newOfficer } = await query(
        `INSERT INTO recommend_officers (openid, real_name, id_card, phone, status, vip_commission_rate, mall_commission_rate)
         VALUES ($1, $2, $3, $4, 'pending', $5, $6)
         RETURNING *`,
        [openid, realName, idCard, phone, DEFAULT_VIP_COMMISSION_RATE, DEFAULT_MALL_COMMISSION_RATE]
      )

      this.logger.log(`新推荐官申请: ${openid}, 姓名: ${realName}`)
      return { code: 200, msg: '申请成功，请等待审核', data: newOfficer[0] }
    } catch (error) {
      this.logger.error('申请推荐官失败:', error)
      return { code: 500, msg: '申请失败，请稍后重试' }
    }
  }

  /**
   * 获取推荐官状态
   */
  async getStatus(openid: string): Promise<{ code: number; msg: string; data?: OfficerStats }> {
    try {
      const { rows: officers } = await query(
        'SELECT * FROM recommend_officers WHERE openid = $1',
        [openid]
      )

      if (officers.length === 0 || officers[0].status !== 'approved') {
        return {
          code: 200,
          msg: 'success',
          data: {
            isOfficer: false,
            totalInvitees: 0,
            activeInvitees: 0,
            totalCommission: 0,
            availableCommission: 0,
            pendingCommission: 0,
            vipCommissionRate: DEFAULT_VIP_COMMISSION_RATE,
            mallCommissionRate: DEFAULT_MALL_COMMISSION_RATE
          }
        }
      }

      const officer = officers[0]

      // 获取邀请统计
      const now = new Date()
      const { rows: referrals } = await query(
        'SELECT id, commission_expire_date FROM officer_referrals WHERE officer_id = $1',
        [officer.id]
      )

      const activeReferrals = referrals.filter(r => new Date(r.commission_expire_date) >= now)

      return {
        code: 200,
        msg: 'success',
        data: {
          isOfficer: true,
          officerInfo: officer,
          totalInvitees: officer.total_invitees || 0,
          activeInvitees: activeReferrals.length,
          totalCommission: officer.total_commission || 0,
          availableCommission: officer.available_commission || 0,
          pendingCommission: 0,
          vipCommissionRate: officer.vip_commission_rate,
          mallCommissionRate: officer.mall_commission_rate
        }
      }
    } catch (error) {
      this.logger.error('获取推荐官状态失败:', error)
      return { code: 500, msg: '获取状态失败' }
    }
  }

  /**
   * 根据 openid 获取推荐官ID
   */
  async getOfficerIdByOpenid(openid: string): Promise<string | null> {
    const { rows } = await query(
      'SELECT id FROM recommend_officers WHERE openid = $1 AND status = $2',
      [openid, 'approved']
    )
    return rows.length > 0 ? rows[0].id : null
  }

  /**
   * 根据 openid 获取推荐官信息（含未审核）
   */
  async getOfficerByOpenid(openid: string): Promise<any | null> {
    const { rows } = await query(
      'SELECT * FROM recommend_officers WHERE openid = $1',
      [openid]
    )
    return rows.length > 0 ? rows[0] : null
  }

  /**
   * 生成邀请码
   */
  async generateInviteCode(officerId: string): Promise<{ code: number; msg: string; data?: { code: string } }> {
    try {
      // 检查是否有有效的邀请码
      const { rows: existing } = await query(
        `SELECT * FROM officer_invite_codes 
         WHERE officer_id = $1 AND status = 'active' 
         AND (expire_date IS NULL OR expire_date > NOW())
         AND total_uses < max_uses 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [officerId]
      )

      if (existing.length > 0) {
        return { code: 200, msg: 'success', data: { code: existing[0].code } }
      }

      // 生成新邀请码
      const inviteCode = this.generateRandomCode()

      const { rows } = await query(
        `INSERT INTO officer_invite_codes (officer_id, code, expire_date)
         VALUES ($1, $2, NOW() + INTERVAL '30 days')
         RETURNING *`,
        [officerId, inviteCode]
      )

      this.logger.log(`生成邀请码: ${inviteCode}, officer_id: ${officerId}`)
      return { code: 200, msg: 'success', data: { code: rows[0].code } }
    } catch (error) {
      this.logger.error('生成邀请码失败:', error)
      return { code: 500, msg: '生成邀请码失败' }
    }
  }

  /**
   * 验证邀请码
   */
  async validateInviteCode(code: string): Promise<{ code: number; msg: string; data?: { officerId: string; isValid: boolean } }> {
    try {
      const { rows: inviteCodes } = await query(
        `SELECT * FROM officer_invite_codes 
         WHERE code = $1 AND status = 'active' 
         AND (expire_date IS NULL OR expire_date > NOW())
         AND total_uses < max_uses`,
        [code]
      )

      if (inviteCodes.length === 0) {
        return { code: 400, msg: '邀请码无效或已过期' }
      }

      const inviteCode = inviteCodes[0]
      return {
        code: 200,
        msg: 'success',
        data: {
          officerId: inviteCode.officer_id,
          isValid: true
        }
      }
    } catch (error) {
      this.logger.error('验证邀请码失败:', error)
      return { code: 500, msg: '验证邀请码失败' }
    }
  }

  /**
   * 使用邀请码
   */
  async useInviteCode(code: string, userId: string, userOpenid: string): Promise<{ code: number; msg: string; data?: any }> {
    try {
      // 验证邀请码
      const validateResult = await this.validateInviteCode(code)
      if (validateResult.code !== 200) {
        return validateResult
      }

      const officerId = validateResult.data?.officerId!

      // 检查是否已经被邀请
      const { rows: existing } = await query(
        'SELECT * FROM officer_referrals WHERE user_id = $1',
        [userId]
      )

      if (existing.length > 0) {
        return { code: 400, msg: '您已通过其他邀请码加入' }
      }

      // 创建邀请关系
      const expireDate = new Date()
      expireDate.setFullYear(expireDate.getFullYear() + COMMISSION_BIND_YEARS)

      const { rows } = await query(
        `INSERT INTO officer_referrals (officer_id, user_id, commission_expire_date)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [officerId, userId, expireDate]
      )

      // 更新邀请码使用次数
      await query(
        'UPDATE officer_invite_codes SET total_uses = total_uses + 1 WHERE code = $1',
        [code]
      )

      // 更新推荐官邀请人数
      await query(
        'UPDATE recommend_officers SET total_invitees = total_invitees + 1 WHERE id = $1',
        [officerId]
      )

      this.logger.log(`使用邀请码: ${code}, user: ${userOpenid}`)
      return { code: 200, msg: 'success', data: rows[0] }
    } catch (error) {
      this.logger.error('使用邀请码失败:', error)
      return { code: 500, msg: '使用邀请码失败' }
    }
  }

  /**
   * 记录佣金
   */
  async recordCommission(
    officerId: string,
    userId: string,
    type: 'vip' | 'mall',
    amount: number,
    orderId?: string
  ): Promise<{ code: number; msg: string }> {
    try {
      // 获取推荐官信息
      const { rows: officers } = await query(
        'SELECT * FROM recommend_officers WHERE id = $1 AND status = $2',
        [officerId, 'approved']
      )

      if (officers.length === 0) {
        return { code: 400, msg: '推荐官不存在或未通过审核' }
      }

      const officer = officers[0]
      const rate = type === 'vip' ? officer.vip_commission_rate : officer.mall_commission_rate
      const commissionAmount = Math.floor(amount * rate / 100)

      if (commissionAmount <= 0) {
        return { code: 200, msg: '佣金为0，无需记录' }
      }

      // 记录佣金流水
      await query(
        `INSERT INTO commission_records (officer_id, user_id, type, amount, rate, order_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [officerId, userId, type, commissionAmount, rate, orderId || null]
      )

      // 更新推荐官佣金
      await query(
        `UPDATE recommend_officers 
         SET total_commission = total_commission + $1, 
             available_commission = available_commission + $1 
         WHERE id = $2`,
        [commissionAmount, officerId]
      )

      this.logger.log(`记录佣金: officer=${officerId}, type=${type}, amount=${commissionAmount}`)
      return { code: 200, msg: 'success' }
    } catch (error) {
      this.logger.error('记录佣金失败:', error)
      return { code: 500, msg: '记录佣金失败' }
    }
  }

  /**
   * 获取佣金记录
   */
  async getCommissionRecords(
    officerId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ code: number; msg: string; data?: any }> {
    try {
      const offset = (page - 1) * pageSize

      const { rows } = await query(
        `SELECT * FROM commission_records 
         WHERE officer_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [officerId, pageSize, offset]
      )

      const { rows: countResult } = await query(
        'SELECT COUNT(*) as total FROM commission_records WHERE officer_id = $1',
        [officerId]
      )

      return {
        code: 200,
        msg: 'success',
        data: {
          records: rows,
          total: parseInt(countResult[0].total),
          page,
          pageSize
        }
      }
    } catch (error) {
      this.logger.error('获取佣金记录失败:', error)
      return { code: 500, msg: '获取佣金记录失败' }
    }
  }

  /**
   * 申请提现
   * 佣金通过微信商家转账到零钱直接到账，无手续费
   */
  async applyWithdraw(
    officerId: string,
    officerOpenid: string,
    amount: number,
    accountType: string = 'wechat',
    accountInfo: string = ''
  ): Promise<{ code: number; msg: string; data?: any }> {
    try {
      // 获取推荐官信息
      const { rows: officers } = await query(
        'SELECT * FROM recommend_officers WHERE id = $1 AND openid = $2',
        [officerId, officerOpenid]
      )

      if (officers.length === 0) {
        return { code: 400, msg: '推荐官不存在' }
      }

      const officer = officers[0]

      if (officer.available_commission < amount) {
        return { code: 400, msg: '可提现余额不足' }
      }

      // 检查最低提现金额
      if (amount < MIN_WITHDRAW_AMOUNT) {
        return { code: 400, msg: `最低提现金额为${(MIN_WITHDRAW_AMOUNT / 100).toFixed(0)}元` }
      }

      // 微信商家转账到零钱无手续费，实际到账=申请金额
      const fee = 0
      const actualAmount = amount

      // 创建提现记录（待审核）
      const { rows } = await query(
        `INSERT INTO officer_withdraw_records (officer_id, officer_openid, amount, fee, actual_amount, account_type, account_info)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [officerId, officerOpenid, amount, fee, actualAmount, 'wechat', officerOpenid]
      )

      // 扣减可提现佣金（先冻结）
      await query(
        'UPDATE recommend_officers SET available_commission = available_commission - $1 WHERE id = $2',
        [amount, officerId]
      )

      this.logger.log(`申请提现: officer=${officerId}, amount=${amount}, 审核通过后将通过微信商家转账到零钱`)
      return { code: 200, msg: '提现申请已提交，审核通过后将直接到账微信零钱', data: rows[0] }
    } catch (error) {
      this.logger.error('申请提现失败:', error)
      return { code: 500, msg: '申请提现失败' }
    }
  }

  /**
   * 获取提现记录
   */
  async getWithdrawRecords(
    officerId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ code: number; msg: string; data?: any }> {
    try {
      const offset = (page - 1) * pageSize

      const { rows } = await query(
        `SELECT * FROM officer_withdraw_records 
         WHERE officer_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [officerId, pageSize, offset]
      )

      const { rows: countResult } = await query(
        'SELECT COUNT(*) as total FROM officer_withdraw_records WHERE officer_id = $1',
        [officerId]
      )

      return {
        code: 200,
        msg: 'success',
        data: {
          records: rows,
          total: parseInt(countResult[0].total),
          page,
          pageSize
        }
      }
    } catch (error) {
      this.logger.error('获取提现记录失败:', error)
      return { code: 500, msg: '获取提现记录失败' }
    }
  }

  /**
   * 生成随机邀请码
   */
  private generateRandomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  /**
   * 获取邀请列表
   */
  async getInvitees(
    officerId: string,
    params: { page: number; pageSize: number }
  ): Promise<{ code: number; msg: string; data?: any }> {
    try {
      const offset = (params.page - 1) * params.pageSize

      const { rows } = await query(
        `SELECT r.*, u.nickname, u.avatar_url 
         FROM officer_referrals r 
         LEFT JOIN users u ON r.user_id = u.id 
         WHERE r.officer_id = $1 
         ORDER BY r.created_at DESC 
         LIMIT $2 OFFSET $3`,
        [officerId, params.pageSize, offset]
      )

      const { rows: countResult } = await query(
        'SELECT COUNT(*) as total FROM officer_referrals WHERE officer_id = $1',
        [officerId]
      )

      return {
        code: 200,
        msg: 'success',
        data: {
          list: rows,
          total: parseInt(countResult[0].total),
          page: params.page,
          pageSize: params.pageSize
        }
      }
    } catch (error) {
      this.logger.error('获取邀请列表失败:', error)
      return { code: 500, msg: '获取邀请列表失败' }
    }
  }

  /**
   * 获取推荐官列表（管理后台）
   */
  async getList(params: {
    page: number;
    pageSize: number;
    status?: string
  }): Promise<{ code: number; msg: string; data?: any }> {
    try {
      let sql = 'SELECT * FROM recommend_officers'
      let countSql = 'SELECT COUNT(*) as total FROM recommend_officers'
      const queryParams: any[] = []

      if (params.status) {
        sql += ' WHERE status = $1'
        countSql += ' WHERE status = $1'
        queryParams.push(params.status)
      }

      sql += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3'
      queryParams.push(params.pageSize, (params.page - 1) * params.pageSize)

      const { rows } = await query(sql, queryParams)

      const countParams = params.status ? [params.status] : []
      const { rows: countResult } = await query(countSql, countParams)

      return {
        code: 200,
        msg: 'success',
        data: {
          list: rows,
          total: parseInt(countResult[0].total),
          page: params.page,
          pageSize: params.pageSize
        }
      }
    } catch (error) {
      this.logger.error('获取推荐官列表失败:', error)
      return { code: 500, msg: '获取推荐官列表失败' }
    }
  }

  /**
   * 获取推荐官详情（管理后台）
   */
  async getDetail(id: string): Promise<{ code: number; msg: string; data?: any }> {
    try {
      const { rows } = await query(
        'SELECT * FROM recommend_officers WHERE id = $1',
        [id]
      )

      if (rows.length === 0) {
        return { code: 404, msg: '推荐官不存在' }
      }

      return { code: 200, msg: 'success', data: rows[0] }
    } catch (error) {
      this.logger.error('获取推荐官详情失败:', error)
      return { code: 500, msg: '获取推荐官详情失败' }
    }
  }

  /**
   * 审核推荐官（管理后台）
   */
  async auditOfficer(
    id: string,
    status: 'approved' | 'rejected',
    remark?: string
  ): Promise<{ code: number; msg: string }> {
    try {
      await query(
        `UPDATE recommend_officers 
         SET status = $1, audit_remark = $2, audited_at = NOW(), updated_at = NOW()
         WHERE id = $3`,
        [status, remark || null, id]
      )

      this.logger.log(`审核推荐官: ${id}, status=${status}`)
      return { code: 200, msg: status === 'approved' ? '审核通过' : '已拒绝' }
    } catch (error) {
      this.logger.error('审核推荐官失败:', error)
      return { code: 500, msg: '审核推荐官失败' }
    }
  }

  /**
   * 更新推荐官信息（管理后台）
   */
  async updateOfficer(
    id: string,
    updateData: {
      vip_commission_rate?: number
      mall_commission_rate?: number
      status?: string
      remark?: string
    }
  ): Promise<{ code: number; msg: string }> {
    try {
      const updates: string[] = []
      const values: any[] = []
      let paramIndex = 1

      if (updateData.vip_commission_rate !== undefined) {
        updates.push(`vip_commission_rate = $${paramIndex}`)
        values.push(updateData.vip_commission_rate)
        paramIndex++
      }

      if (updateData.mall_commission_rate !== undefined) {
        updates.push(`mall_commission_rate = $${paramIndex}`)
        values.push(updateData.mall_commission_rate)
        paramIndex++
      }

      if (updateData.status !== undefined) {
        updates.push(`status = $${paramIndex}`)
        values.push(updateData.status)
        paramIndex++
      }

      if (updateData.remark !== undefined) {
        updates.push(`remark = $${paramIndex}`)
        values.push(updateData.remark)
        paramIndex++
      }

      if (updates.length === 0) {
        return { code: 400, msg: '没有要更新的字段' }
      }

      updates.push('updated_at = NOW()')
      values.push(id)

      await query(
        `UPDATE recommend_officers SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        values
      )

      this.logger.log(`更新推荐官: ${id}`)
      return { code: 200, msg: '更新成功' }
    } catch (error) {
      this.logger.error('更新推荐官失败:', error)
      return { code: 500, msg: '更新推荐官失败' }
    }
  }

  /**
   * 获取统计数据（管理后台）
   */
  async getStats(): Promise<{ code: number; msg: string; data?: any }> {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'approved') as approved,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected
        FROM recommend_officers
      `

      const { rows } = await query(sql)

      return {
        code: 200,
        msg: 'success',
        data: {
          total: parseInt(rows[0].total) || 0,
          approved: parseInt(rows[0].approved) || 0,
          pending: parseInt(rows[0].pending) || 0,
          rejected: parseInt(rows[0].rejected) || 0
        }
      }
    } catch (error) {
      this.logger.error('获取统计数据失败:', error)
      return { code: 500, msg: '获取统计数据失败' }
    }
  }

  /**
   * 获取推荐官排行榜（管理后台）
   */
  async getRanking(params: {
    limit: number
    period: 'week' | 'month' | 'all'
  }): Promise<{ code: number; msg: string; data?: any }> {
    try {
      let dateFilter = ''
      if (params.period === 'week') {
        dateFilter = "AND created_at >= NOW() - INTERVAL '7 days'"
      } else if (params.period === 'month') {
        dateFilter = "AND created_at >= NOW() - INTERVAL '30 days'"
      }

      const { rows } = await query(
        `SELECT 
          o.id,
          o.real_name,
          o.total_commission,
          o.available_commission,
          o.total_invitees,
          COUNT(c.id) as commission_count,
          COALESCE(SUM(c.amount), 0) as period_commission
        FROM recommend_officers o
        LEFT JOIN commission_records c ON o.id = c.officer_id ${dateFilter}
        WHERE o.status = 'approved'
        GROUP BY o.id, o.real_name, o.total_commission, o.available_commission, o.total_invitees
        ORDER BY period_commission DESC
        LIMIT $1`,
        [params.limit]
      )

      return {
        code: 200,
        msg: 'success',
        data: rows
      }
    } catch (error) {
      this.logger.error('获取排行榜失败:', error)
      return { code: 500, msg: '获取排行榜失败' }
    }
  }

  /**
   * 获取所有佣金流水（管理后台）
   */
  async getAllCommissionRecords(params: {
    page: number
    pageSize: number
    officerId?: string
  }): Promise<{ code: number; msg: string; data?: any }> {
    try {
      const offset = (params.page - 1) * params.pageSize

      let sql = `
        SELECT c.*, o.real_name, o.phone
        FROM commission_records c
        LEFT JOIN recommend_officers o ON c.officer_id = o.id
      `
      let countSql = 'SELECT COUNT(*) as total FROM commission_records c'

      const queryParams: any[] = []

      if (params.officerId) {
        sql += ' WHERE c.officer_id = $1'
        countSql += ' WHERE officer_id = $1'
        queryParams.push(params.officerId)
      }

      sql += ' ORDER BY c.created_at DESC LIMIT $2 OFFSET $3'
      queryParams.push(params.pageSize, offset)

      const { rows } = await query(sql, queryParams)

      const countParams = params.officerId ? [params.officerId] : []
      const { rows: countResult } = await query(countSql, countParams)

      return {
        code: 200,
        msg: 'success',
        data: {
          list: rows,
          total: parseInt(countResult[0].total),
          page: params.page,
          pageSize: params.pageSize
        }
      }
    } catch (error) {
      this.logger.error('获取佣金流水失败:', error)
      return { code: 500, msg: '获取佣金流水失败' }
    }
  }

  /**
   * 审核提现申请（管理后台）
   * 审核通过后自动调用微信商家转账到零钱
   */
  async approveWithdraw(id: string, remark?: string): Promise<{ code: number; msg: string }> {
    try {
      // 获取提现记录
      const { rows: withdraws } = await query(
        'SELECT * FROM officer_withdraw_records WHERE id = $1',
        [id]
      )

      if (withdraws.length === 0) {
        return { code: 404, msg: '提现记录不存在' }
      }

      const withdraw = withdraws[0]

      if (withdraw.status !== 'pending') {
        return { code: 400, msg: '该提现申请已处理' }
      }

      // 调用微信商家转账到零钱
      try {
        const { WechatPayService } = await import('../wechat-pay/wechat-pay.service')
        const wechatPayService = new WechatPayService()

        const transferResult = await wechatPayService.transferToBalance({
          openid: withdraw.officer_openid,
          amount: withdraw.actual_amount,
          description: '尚宴礼记-推荐官佣金提现',
          orderId: `WD${id}`
        })

        if (transferResult.success) {
          // 转账成功，更新提现状态
          await query(
            `UPDATE officer_withdraw_records 
             SET status = 'completed', payment_no = $1, processed_at = NOW(), updated_at = NOW() 
             WHERE id = $2`,
            [transferResult.paymentNo || '', id]
          )

          this.logger.log(`审核通过提现并转账成功: ${id}, amount=${withdraw.actual_amount}, paymentNo=${transferResult.paymentNo}`)
          return { code: 200, msg: '提现已完成，资金已到账微信零钱' }
        } else {
          // 转账失败，更新状态为失败
          await query(
            `UPDATE officer_withdraw_records 
             SET status = 'failed', reject_reason = $1, processed_at = NOW(), updated_at = NOW() 
             WHERE id = $2`,
            [transferResult.errorMsg || '转账失败', id]
          )

          // 退回可提现佣金
          await query(
            'UPDATE recommend_officers SET available_commission = available_commission + $1 WHERE id = $2',
            [withdraw.amount, withdraw.officer_id]
          )

          this.logger.error(`提现转账失败: ${id}, error=${transferResult.errorMsg}`)
          return { code: 500, msg: `转账失败: ${transferResult.errorMsg}` }
        }
      } catch (transferError: any) {
        // 转账异常
        await query(
          `UPDATE officer_withdraw_records 
           SET status = 'failed', reject_reason = $1, processed_at = NOW(), updated_at = NOW() 
           WHERE id = $2`,
          [transferError.message || '转账异常', id]
        )

        // 退回可提现佣金
        await query(
          'UPDATE recommend_officers SET available_commission = available_commission + $1 WHERE id = $2',
          [withdraw.amount, withdraw.officer_id]
        )

        this.logger.error(`提现转账异常: ${id}, error=${transferError.message}`)
        return { code: 500, msg: `转账异常: ${transferError.message}` }
      }
    } catch (error) {
      this.logger.error('审核提现失败:', error)
      return { code: 500, msg: '审核提现失败' }
    }
  }

  /**
   * 拒绝提现申请（管理后台）
   */
  async rejectWithdraw(id: string, reason?: string): Promise<{ code: number; msg: string }> {
    try {
      // 获取提现记录
      const { rows: withdraws } = await query(
        'SELECT * FROM officer_withdraw_records WHERE id = $1',
        [id]
      )

      if (withdraws.length === 0) {
        return { code: 404, msg: '提现记录不存在' }
      }

      const withdraw = withdraws[0]

      if (withdraw.status !== 'pending') {
        return { code: 400, msg: '该提现申请已处理' }
      }

      // 更新提现状态
      await query(
        `UPDATE officer_withdraw_records 
         SET status = 'rejected', reject_reason = $1, processed_at = NOW(), updated_at = NOW() 
         WHERE id = $2`,
        [reason || '审核未通过', id]
      )

      // 退回可提现佣金
      await query(
        'UPDATE recommend_officers SET available_commission = available_commission + $1 WHERE id = $2',
        [withdraw.amount, withdraw.officer_id]
      )

      this.logger.log(`拒绝提现: ${id}, reason=${reason}`)
      return { code: 200, msg: '已拒绝提现申请' }
    } catch (error) {
      this.logger.error('拒绝提现失败:', error)
      return { code: 500, msg: '拒绝提现失败' }
    }
  }

  /**
   * 导出佣金流水到 Excel
   */
  async exportCommissionsToExcel(params: {
    type?: 'vip' | 'mall'
    startDate?: string
    endDate?: string
  }): Promise<Buffer> {
    const { type, startDate, endDate } = params

    // 构建查询条件
    const conditions: string[] = []
    const queryParams: any[] = []
    let paramIndex = 1

    if (type) {
      conditions.push(`type = $${paramIndex}`)
      queryParams.push(type)
      paramIndex++
    }

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex}`)
      queryParams.push(new Date(startDate))
      paramIndex++
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramIndex}`)
      queryParams.push(new Date(endDate + ' 23:59:59'))
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // 查询数据
    const { rows } = await query(
      `SELECT 
         cr.*,
         ro.real_name as officer_name,
         ro.phone as officer_phone,
         u.nickname as invitee_name,
         u.phone as invitee_phone
       FROM commission_records cr
       LEFT JOIN recommend_officers ro ON cr.officer_id = ro.id
       LEFT JOIN users u ON cr.user_id = u.id
       ${whereClause}
       ORDER BY cr.created_at DESC`,
      queryParams
    )

    // 创建 Excel 文件
    const ExcelJS = (await import('exceljs')).default
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('佣金流水')

    // 设置表头
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 20 },
      { header: '推荐官姓名', key: 'officer_name', width: 15 },
      { header: '推荐官手机', key: 'officer_phone', width: 15 },
      { header: '佣金类型', key: 'type', width: 12 },
      { header: '被邀请人', key: 'invitee_name', width: 15 },
      { header: '被邀请人手机', key: 'invitee_phone', width: 15 },
      { header: '佣金金额(元)', key: 'amount', width: 15 },
      { header: '佣金比例(%)', key: 'rate', width: 12 },
      { header: '订单ID', key: 'order_id', width: 20 },
      { header: '创建时间', key: 'created_at', width: 25 }
    ]

    // 填充数据
    rows.forEach((row: any) => {
      worksheet.addRow({
        id: row.id,
        officer_name: row.officer_name || '-',
        officer_phone: row.officer_phone || '-',
        type: row.type === 'vip' ? 'VIP佣金' : '商城佣金',
        invitee_name: row.invitee_name || '-',
        invitee_phone: row.invitee_phone || '-',
        amount: (row.amount / 100).toFixed(2),
        rate: row.rate,
        order_id: row.order_id || '-',
        created_at: new Date(row.created_at).toLocaleString('zh-CN')
      })
    })

    // 设置表头样式
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    }

    // 生成 Buffer
    const buffer = await workbook.xlsx.writeBuffer()

    return Buffer.from(buffer)
  }
}
