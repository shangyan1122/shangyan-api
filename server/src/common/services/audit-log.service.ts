import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 审计日志服务
 *
 * 【功能】
 * 1. 记录敏感操作日志
 * 2. 记录登录、支付、提现等关键操作
 * 3. 支持日志查询和导出
 * 4. 异常行为检测
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  /**
   * 记录审计日志
   */
  async log(params: {
    openid: string;
    action: string;
    resource: string;
    resourceId?: string;
    details?: any;
    request?: Request;
  }): Promise<void> {
    const { openid, action, resource, resourceId, details, request } = params;

    const logEntry = {
      openid,
      action,
      resource,
      resource_id: resourceId,
      details: details || {},
      ip_address: this.extractIpAddress(request),
      user_agent: request?.headers['user-agent'] || '',
      created_at: new Date().toISOString(),
    };

    try {
      const client = getSupabaseClient();

      const { error } = await client.from('audit_logs').insert(logEntry);

      if (error) {
        // 如果表不存在，记录到控制台
        this.logger.warn(`审计日志写入失败（表可能不存在）: ${error.message}`);
        this.logger.log(`[审计日志] ${action} - ${resource} - ${openid}`);
      }
    } catch (error: any) {
      this.logger.error(`记录审计日志失败: ${error.message}`);
    }
  }

  /**
   * 记录登录日志
   */
  async logLogin(openid: string, request?: Request, success: boolean = true): Promise<void> {
    await this.log({
      openid,
      action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
      resource: 'auth',
      details: { success },
      request,
    });
  }

  /**
   * 记录登出日志
   */
  async logLogout(openid: string, request?: Request): Promise<void> {
    await this.log({
      openid,
      action: 'LOGOUT',
      resource: 'auth',
      request,
    });
  }

  /**
   * 记录支付日志
   */
  async logPayment(params: {
    openid: string;
    banquetId: string;
    amount: number;
    status: 'created' | 'success' | 'failed';
    transactionId?: string;
    request?: Request;
  }): Promise<void> {
    await this.log({
      openid: params.openid,
      action: `PAYMENT_${params.status.toUpperCase()}`,
      resource: 'payment',
      resourceId: params.transactionId,
      details: {
        banquetId: params.banquetId,
        amount: params.amount,
        transactionId: params.transactionId,
      },
      request: params.request,
    });
  }

  /**
   * 记录提现日志
   */
  async logWithdraw(params: {
    openid: string;
    amount: number;
    status: 'applied' | 'success' | 'failed';
    withdrawId?: string;
    request?: Request;
  }): Promise<void> {
    await this.log({
      openid: params.openid,
      action: `WITHDRAW_${params.status.toUpperCase()}`,
      resource: 'withdraw',
      resourceId: params.withdrawId,
      details: {
        amount: params.amount,
        withdrawId: params.withdrawId,
      },
      request: params.request,
    });
  }

  /**
   * 记录敏感数据访问日志
   */
  async logDataAccess(params: {
    openid: string;
    dataType: string;
    dataId: string;
    action: 'read' | 'update' | 'delete' | 'export';
    request?: Request;
  }): Promise<void> {
    await this.log({
      openid: params.openid,
      action: `DATA_${params.action.toUpperCase()}`,
      resource: params.dataType,
      resourceId: params.dataId,
      request: params.request,
    });
  }

  /**
   * 记录权限验证失败日志
   */
  async logPermissionDenied(params: {
    openid: string;
    resource: string;
    action: string;
    reason?: string;
    request?: Request;
  }): Promise<void> {
    await this.log({
      openid: params.openid,
      action: 'PERMISSION_DENIED',
      resource: params.resource,
      details: {
        attemptedAction: params.action,
        reason: params.reason,
      },
      request: params.request,
    });
  }

  /**
   * 查询审计日志
   */
  async queryLogs(params: {
    openid?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  }): Promise<{ logs: any[]; total: number }> {
    try {
      const client = getSupabaseClient();

      let query = client.from('audit_logs').select('*', { count: 'exact' });

      if (params.openid) {
        query = query.eq('openid', params.openid);
      }
      if (params.action) {
        query = query.eq('action', params.action);
      }
      if (params.resource) {
        query = query.eq('resource', params.resource);
      }
      if (params.startDate) {
        query = query.gte('created_at', params.startDate.toISOString());
      }
      if (params.endDate) {
        query = query.lte('created_at', params.endDate.toISOString());
      }

      const page = params.page || 1;
      const pageSize = params.pageSize || 20;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      query = query.range(from, to).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return {
        logs: data || [],
        total: count || 0,
      };
    } catch (error: any) {
      this.logger.error(`查询审计日志失败: ${error.message}`);
      return { logs: [], total: 0 };
    }
  }

  /**
   * 检测异常行为
   */
  async detectAnomalousActivity(openid: string): Promise<{
    isAnomalous: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];

    try {
      const client = getSupabaseClient();

      // 检查最近1小时的登录失败次数
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: failedLogins } = await client
        .from('audit_logs')
        .select('*')
        .eq('openid', openid)
        .eq('action', 'LOGIN_FAILED')
        .gte('created_at', oneHourAgo);

      if (failedLogins && failedLogins.length >= 5) {
        reasons.push('最近1小时内登录失败次数过多');
      }

      // 检查最近1小时的提现申请次数
      const { data: withdrawRequests } = await client
        .from('audit_logs')
        .select('*')
        .eq('openid', openid)
        .eq('action', 'WITHDRAW_APPLIED')
        .gte('created_at', oneHourAgo);

      if (withdrawRequests && withdrawRequests.length >= 3) {
        reasons.push('最近1小时内提现申请次数过多');
      }

      // 检查最近1小时的权限验证失败次数
      const { data: permissionDenied } = await client
        .from('audit_logs')
        .select('*')
        .eq('openid', openid)
        .eq('action', 'PERMISSION_DENIED')
        .gte('created_at', oneHourAgo);

      if (permissionDenied && permissionDenied.length >= 3) {
        reasons.push('最近1小时内权限验证失败次数过多');
      }
    } catch (error: any) {
      this.logger.error(`检测异常行为失败: ${error.message}`);
    }

    return {
      isAnomalous: reasons.length > 0,
      reasons,
    };
  }

  /**
   * 提取IP地址
   */
  private extractIpAddress(request?: Request): string {
    if (!request) {
      return '';
    }

    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.ip ||
      ''
    );
  }
}
