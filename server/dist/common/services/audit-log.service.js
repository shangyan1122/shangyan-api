"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AuditLogService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogService = void 0;
const common_1 = require("@nestjs/common");
const supabase_client_1 = require("../../storage/database/supabase-client");
let AuditLogService = AuditLogService_1 = class AuditLogService {
    constructor() {
        this.logger = new common_1.Logger(AuditLogService_1.name);
    }
    async log(params) {
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
            const client = (0, supabase_client_1.getSupabaseClient)();
            const { error } = await client.from('audit_logs').insert(logEntry);
            if (error) {
                this.logger.warn(`审计日志写入失败（表可能不存在）: ${error.message}`);
                this.logger.log(`[审计日志] ${action} - ${resource} - ${openid}`);
            }
        }
        catch (error) {
            this.logger.error(`记录审计日志失败: ${error.message}`);
        }
    }
    async logLogin(openid, request, success = true) {
        await this.log({
            openid,
            action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
            resource: 'auth',
            details: { success },
            request,
        });
    }
    async logLogout(openid, request) {
        await this.log({
            openid,
            action: 'LOGOUT',
            resource: 'auth',
            request,
        });
    }
    async logPayment(params) {
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
    async logWithdraw(params) {
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
    async logDataAccess(params) {
        await this.log({
            openid: params.openid,
            action: `DATA_${params.action.toUpperCase()}`,
            resource: params.dataType,
            resourceId: params.dataId,
            request: params.request,
        });
    }
    async logPermissionDenied(params) {
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
    async queryLogs(params) {
        try {
            const client = (0, supabase_client_1.getSupabaseClient)();
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
        }
        catch (error) {
            this.logger.error(`查询审计日志失败: ${error.message}`);
            return { logs: [], total: 0 };
        }
    }
    async detectAnomalousActivity(openid) {
        const reasons = [];
        try {
            const client = (0, supabase_client_1.getSupabaseClient)();
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
            const { data: withdrawRequests } = await client
                .from('audit_logs')
                .select('*')
                .eq('openid', openid)
                .eq('action', 'WITHDRAW_APPLIED')
                .gte('created_at', oneHourAgo);
            if (withdrawRequests && withdrawRequests.length >= 3) {
                reasons.push('最近1小时内提现申请次数过多');
            }
            const { data: permissionDenied } = await client
                .from('audit_logs')
                .select('*')
                .eq('openid', openid)
                .eq('action', 'PERMISSION_DENIED')
                .gte('created_at', oneHourAgo);
            if (permissionDenied && permissionDenied.length >= 3) {
                reasons.push('最近1小时内权限验证失败次数过多');
            }
        }
        catch (error) {
            this.logger.error(`检测异常行为失败: ${error.message}`);
        }
        return {
            isAnomalous: reasons.length > 0,
            reasons,
        };
    }
    extractIpAddress(request) {
        if (!request) {
            return '';
        }
        return (request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            request.headers['x-real-ip'] ||
            request.ip ||
            '');
    }
};
exports.AuditLogService = AuditLogService;
exports.AuditLogService = AuditLogService = AuditLogService_1 = __decorate([
    (0, common_1.Injectable)()
], AuditLogService);
//# sourceMappingURL=audit-log.service.js.map