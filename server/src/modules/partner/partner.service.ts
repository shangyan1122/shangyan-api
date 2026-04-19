import { Injectable, Logger } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export interface PartnerApplication {
  id: string;
  company_name: string;
  contact_name: string;
  phone: string;
  email?: string;
  business_type?: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at?: string;
  reviewer_note?: string;
}

@Injectable()
export class PartnerService {
  private readonly logger = new Logger(PartnerService.name);

  /**
   * 提交合作申请
   */
  async submitApplication(data: {
    companyName: string;
    contactName: string;
    phone: string;
    email?: string;
    businessType?: string;
    description?: string;
  }): Promise<PartnerApplication> {
    const client = getSupabaseClient();

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

  /**
   * 获取合作申请列表（管理后台用）
   */
  async getApplications(page: number = 1, pageSize: number = 20, status?: string) {
    const client = getSupabaseClient();

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

  /**
   * 获取申请详情
   */
  async getApplicationById(id: string): Promise<PartnerApplication | null> {
    const client = getSupabaseClient();

    const { data, error } = await client.from('channel_partners').select('*').eq('id', id).single();

    if (error) {
      this.logger.error('获取申请详情失败:', error);
      return null;
    }

    return data;
  }

  /**
   * 审核合作申请（管理后台用）
   */
  async reviewApplication(
    id: string,
    status: 'approved' | 'rejected',
    reviewerNote?: string
  ): Promise<PartnerApplication> {
    const client = getSupabaseClient();

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

  /**
   * 检查手机号是否已申请
   */
  async checkPhoneExists(phone: string): Promise<boolean> {
    const client = getSupabaseClient();

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
}
