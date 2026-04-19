"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PartnerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartnerService = void 0;
const common_1 = require("@nestjs/common");
const supabase_client_1 = require("../../storage/database/supabase-client");
let PartnerService = PartnerService_1 = class PartnerService {
    constructor() {
        this.logger = new common_1.Logger(PartnerService_1.name);
    }
    async submitApplication(data) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data: application, error } = await client
            .from('channel_partners')
            .insert({
            company_name: data.companyName,
            contact_name: data.contactName,
            phone: data.phone,
            email: data.email,
            business_type: data.businessType,
            description: data.description,
            status: 'pending',
            created_at: new Date().toISOString(),
        })
            .select()
            .single();
        if (error) {
            this.logger.error('提交合作申请失败:', error);
            throw new Error(error.message);
        }
        this.logger.log(`新合作申请: ${application.id} - ${data.companyName}`);
        return application;
    }
    async getApplications(page = 1, pageSize = 20, status) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        let query = client
            .from('channel_partners')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);
        if (status) {
            query = query.eq('status', status);
        }
        const { data, count, error } = await query;
        if (error) {
            this.logger.error('获取合作申请列表失败:', error);
            return { records: [], total: 0 };
        }
        return {
            records: data || [],
            total: count || 0,
        };
    }
    async getApplicationById(id) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data, error } = await client.from('channel_partners').select('*').eq('id', id).single();
        if (error) {
            this.logger.error('获取申请详情失败:', error);
            return null;
        }
        return data;
    }
    async reviewApplication(id, status, reviewerNote) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data, error } = await client
            .from('channel_partners')
            .update({
            status,
            reviewer_note: reviewerNote,
            reviewed_at: new Date().toISOString(),
        })
            .eq('id', id)
            .select()
            .single();
        if (error) {
            this.logger.error('审核合作申请失败:', error);
            throw new Error(error.message);
        }
        this.logger.log(`合作申请审核: ${id} - ${status}`);
        return data;
    }
    async checkPhoneExists(phone) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data, error } = await client
            .from('channel_partners')
            .select('id')
            .eq('phone', phone)
            .limit(1);
        if (error) {
            return false;
        }
        return data && data.length > 0;
    }
};
exports.PartnerService = PartnerService;
exports.PartnerService = PartnerService = PartnerService_1 = __decorate([
    (0, common_1.Injectable)()
], PartnerService);
//# sourceMappingURL=partner.service.js.map