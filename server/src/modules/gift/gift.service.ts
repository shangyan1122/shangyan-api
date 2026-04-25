import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

@Injectable()
export class GiftService {
  // 获取宴会信息
  async getBanquetInfo(banquetId: string) {
    const client = getSupabaseClient();
    const { data, error } = await client.from('banquets').select('*').eq('id', banquetId).single();

    if (error) {
      console.error('获取宴会信息失败:', error);
      return null;
    }

    return data;
  }

  // 检查嘉宾是否已经在该宴会随礼
  async checkGuestExists(banquetId: string, guestOpenid: string): Promise<boolean> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('gift_records')
      .select('id')
      .eq('banquet_id', banquetId)
      .eq('guest_openid', guestOpenid)
      .limit(1);

    if (error) {
      console.error('检查嘉宾是否存在失败:', error);
      return false;
    }

    return data && data.length > 0;
  }

  // 创建随礼记录
  async createGiftRecord(recordData: any) {
    const client = getSupabaseClient();
    const { data, error } = await client.from('gift_records').insert(recordData).select().single();

    if (error) {
      console.error('创建随礼记录失败:', error);
      throw new Error(error.message);
    }

    return data;
  }

  // 更新支付状态
  async updatePaymentStatus(recordId: string, status: string) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('gift_records')
      .update({ payment_status: status })
      .eq('id', recordId)
      .select()
      .single();

    if (error) {
      console.error('更新支付状态失败:', error);
      throw new Error(error.message);
    }

    return data;
  }

  // 根据订单ID获取随礼记录
  async getGiftRecordByOrderId(orderId: string) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('gift_records')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) {
      console.error('获取随礼记录失败:', error);
      return null;
    }

    return data;
  }

  // 更新转账状态（随礼直达主办方）
  async updateTransferStatus(
    recordId: string,
    status: 'pending' | 'transferred' | 'transfer_failed',
    paymentNo?: string | null,
    errorMsg?: string | null
  ) {
    const client = getSupabaseClient();
    const updateData: any = {
      transfer_status: status,
      updated_at: new Date().toISOString(),
    };

    if (paymentNo) {
      updateData.transfer_payment_no = paymentNo;
    }
    if (errorMsg) {
      updateData.transfer_error_msg = errorMsg;
    }

    const { data, error } = await client
      .from('gift_records')
      .update(updateData)
      .eq('id', recordId)
      .select()
      .single();

    if (error) {
      console.error('更新转账状态失败:', error);
      throw new Error(error.message);
    }

    return data;
  }

  // 检查是否触发回礼
  async checkReturnGift(giftRecordId: string) {
    const client = getSupabaseClient();

    // 获取随礼记录
    const { data: giftRecord, error: queryError } = await client
      .from('gift_records')
      .select('*')
      .eq('id', giftRecordId)
      .single();

    if (queryError) {
      console.error('查询随礼记录失败:', queryError);
      return null;
    }

    if (!giftRecord) {
      console.error('未找到随礼记录:', giftRecordId);
      return null;
    }

    // 获取宴会信息
    const { data: banquet, error: banquetError } = await client
      .from('banquets')
      .select('*')
      .eq('id', giftRecord.banquet_id)
      .single();

    if (banquetError || !banquet) {
      console.error('未找到宴会信息:', banquetError);
      return null;
    }

    const giftAmount = giftRecord.amount;
    const returnRedPacket = banquet.return_red_packet || 0;

    console.log(`回礼检查: 随礼金额=${giftAmount}, 回礼红包=${returnRedPacket}`);

    // 计算回礼总价值
    let returnGiftTotalValue = returnRedPacket;

    // TODO: 计算礼品总价值
    // if (banquet.return_gift_ids) { ... }

    // 判断是否触发回礼
    if (giftAmount > returnGiftTotalValue) {
      // 更新回礼状态为可领取
      await client
        .from('gift_records')
        .update({ return_gift_status: 'eligible' })
        .eq('id', giftRecordId);

      return {
        eligible: true,
        returnRedPacket,
        returnGiftIds: banquet.return_gift_ids,
      };
    }

    return { eligible: false };
  }

  // 验证主办方权限
  async verifyHostPermission(banquetId: string, hostOpenid: string): Promise<boolean> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('banquets')
      .select('host_openid')
      .eq('id', banquetId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.host_openid === hostOpenid;
  }

  // 补录单条随礼记录
  async supplementGiftRecord(recordData: any) {
    const client = getSupabaseClient();

    const insertData = {
      banquet_id: recordData.banquet_id,
      guest_openid: recordData.guest_openid,
      guest_name: recordData.guest_name,
      guest_phone: recordData.guest_phone,
      amount: recordData.amount,
      blessing: recordData.blessing,
      payment_status: recordData.payment_status || 'completed',
      is_supplement: true,
      supplement_time: new Date().toISOString(),
      gift_time: recordData.gift_time || new Date().toISOString(),
    };

    const { data, error } = await client.from('gift_records').insert(insertData).select().single();

    if (error) {
      console.error('补录随礼记录失败:', error);
      throw new Error(error.message);
    }

    return data;
  }

  // 批量补录随礼记录
  async batchSupplementGiftRecords(
    banquetId: string,
    records: Array<{
      guestName: string;
      guestPhone?: string;
      amount: number;
      blessing?: string;
      giftTime?: string;
    }>
  ) {
    const client = getSupabaseClient();
    const insertRecords = records.map((record, index) => ({
      banquet_id: banquetId,
      guest_openid: `supplement_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      guest_name: record.guestName,
      guest_phone: record.guestPhone,
      amount: record.amount,
      blessing: record.blessing,
      payment_status: 'completed',
      is_supplement: true,
      supplement_time: new Date().toISOString(),
      gift_time: record.giftTime || new Date().toISOString(),
    }));

    const { data, error } = await client.from('gift_records').insert(insertRecords).select();

    if (error) {
      console.error('批量补录失败:', error);
      throw new Error(error.message);
    }

    return {
      success: data?.length || 0,
      failed: records.length - (data?.length || 0),
      records: data,
    };
  }

  // 获取补录记录列表
  async getSupplementRecords(banquetId: string) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('gift_records')
      .select('*')
      .eq('banquet_id', banquetId)
      .eq('is_supplement', true)
      .order('supplement_time', { ascending: false });

    if (error) {
      console.error('获取补录记录失败:', error);
      return [];
    }

    return data || [];
  }

  // 获取宴会的礼金记录
  async getGiftRecords(banquetId: string) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('gift_records')
      .select('*')
      .eq('banquet_id', banquetId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取礼金记录失败:', error);
      return [];
    }

    return data || [];
  }

  // 删除补录记录
  async deleteSupplementRecord(recordId: string, hostOpenid: string) {
    const client = getSupabaseClient();

    // 先获取记录
    const { data: record, error: queryError } = await client
      .from('gift_records')
      .select('*')
      .eq('id', recordId)
      .single();

    if (queryError || !record) {
      throw new Error('记录不存在');
    }

    // 验证是否为补录记录
    if (!record.is_supplement) {
      throw new Error('只能删除补录记录');
    }

    // 验证权限 - 查询宴会信息
    const { data: banquet, error: banquetError } = await client
      .from('banquets')
      .select('host_openid')
      .eq('id', record.banquet_id)
      .single();

    if (banquetError || !banquet) {
      throw new Error('宴会不存在');
    }

    if (banquet.host_openid !== hostOpenid) {
      throw new Error('无权限删除');
    }

    // 删除记录
    const { error: deleteError } = await client.from('gift_records').delete().eq('id', recordId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return { success: true };
  }
}
