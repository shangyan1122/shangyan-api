import { Controller, Get, Post, Body, Query, UseGuards, Req, Logger, Param } from '@nestjs/common';
import { Request } from 'express';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { AuthGuard, Public } from '@/common/guards/auth.guard';

/**
 * 现场礼品控制器
 * 处理现场礼品领取码生成、查询和核销
 */
@Controller('onsite-gifts')
@UseGuards(AuthGuard)
export class OnsiteGiftController {
  private readonly logger = new Logger(OnsiteGiftController.name);

  /**
   * 生成领取码
   * 当嘉宾随礼成功后调用
   */
  @Post('generate-code')
  async generateClaimCode(
    @Body() body: { banquetId: string; guestOpenid: string; guestName?: string }
  ) {
    this.logger.log(`生成领取码: banquetId=${body.banquetId}, guest=${body.guestOpenid}`);

    try {
      const client = getSupabaseClient();

      // 获取宴会信息和回礼配置
      const { data: banquet, error: banquetError } = await client
        .from('banquets')
        .select('*')
        .eq('id', body.banquetId)
        .single();

      if (banquetError || !banquet) {
        return { code: 404, msg: '宴会不存在', data: null };
      }

      const returnGiftConfig = banquet.return_gift_config;
      if (!returnGiftConfig?.onsiteGifts?.enabled) {
        return { code: 400, msg: '该宴会未启用现场礼品', data: null };
      }

      // 获取现场礼品列表
      const { data: onsiteGifts, error: giftsError } = await client
        .from('onsite_gifts')
        .select('*')
        .eq('banquet_id', body.banquetId)
        .gt('remaining_count', 0);

      if (giftsError || !onsiteGifts || onsiteGifts.length === 0) {
        return { code: 400, msg: '暂无可领取的礼品', data: null };
      }

      // 为每个礼品生成领取码
      const codes: Array<{ code: string; giftId: string; giftName: string; giftImage: string }> =
        [];
      for (const gift of onsiteGifts) {
        const code = this.generateRandomCode();

        const { data: claimCode, error: insertError } = await client
          .from('gift_claim_codes')
          .insert({
            code,
            banquet_id: body.banquetId,
            gift_id: gift.id,
            gift_name: gift.name,
            gift_image: gift.image,
            guest_openid: body.guestOpenid,
            guest_name: body.guestName || null,
            status: 'claimed',
            claimed_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!insertError && claimCode) {
          codes.push({
            code: claimCode.code,
            giftId: gift.id,
            giftName: gift.name,
            giftImage: gift.image,
          });

          // 更新剩余数量
          await client
            .from('onsite_gifts')
            .update({ remaining_count: gift.remaining_count - 1 })
            .eq('id', gift.id);
        }
      }

      return {
        code: 200,
        msg: '领取码生成成功',
        data: { codes },
      };
    } catch (error: any) {
      this.logger.error(`生成领取码异常: ${error.message}`);
      return { code: 500, msg: '生成领取码失败', data: null };
    }
  }

  /**
   * 查询领取码信息
   * 嘉宾查看自己的领取码
   */
  @Get('my-codes')
  async getMyCodes(
    @Query('banquetId') banquetId: string,
    @Query('guestOpenid') guestOpenid: string
  ) {
    this.logger.log(`查询领取码: banquetId=${banquetId}, guest=${guestOpenid}`);

    try {
      const client = getSupabaseClient();

      const { data, error } = await client
        .from('gift_claim_codes')
        .select('*')
        .eq('banquet_id', banquetId)
        .eq('guest_openid', guestOpenid)
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error(`查询领取码失败: ${error.message}`);
        return { code: 500, msg: '查询失败', data: [] };
      }

      const codes = (data || []).map((item) => ({
        code: item.code,
        giftName: item.gift_name,
        giftImage: item.gift_image,
        status: item.status,
        claimedAt: item.claimed_at,
        usedAt: item.used_at,
      }));

      return { code: 200, msg: 'success', data: codes };
    } catch (error: any) {
      this.logger.error(`查询领取码异常: ${error.message}`);
      return { code: 500, msg: '查询失败', data: [] };
    }
  }

  /**
   * 扫码查询领取码
   * 主办方扫描嘉宾领取码查看详情
   */
  @Public()
  @Get('code/:code')
  async getCodeInfo(@Param('code') code: string) {
    this.logger.log(`扫码查询领取码: code=${code}`);

    try {
      const client = getSupabaseClient();

      const { data, error } = await client
        .from('gift_claim_codes')
        .select(
          `
          *,
          banquets(name, type, event_time, location)
        `
        )
        .eq('code', code)
        .single();

      if (error || !data) {
        return { code: 404, msg: '领取码不存在', data: null };
      }

      return {
        code: 200,
        msg: 'success',
        data: {
          code: data.code,
          giftName: data.gift_name,
          giftImage: data.gift_image,
          status: data.status,
          guestName: data.guest_name,
          banquet: data.banquets,
        },
      };
    } catch (error: any) {
      this.logger.error(`查询领取码异常: ${error.message}`);
      return { code: 500, msg: '查询失败', data: null };
    }
  }

  /**
   * 核销领取码
   * 主办方确认发放礼品
   */
  @Post('redeem')
  async redeemCode(@Body() body: { code: string; verifierOpenid?: string }, @Req() req: Request) {
    const verifierOpenid = req.user?.openid || body.verifierOpenid || 'host_test';
    this.logger.log(`核销领取码: code=${body.code}, verifier=${verifierOpenid}`);

    try {
      const client = getSupabaseClient();

      // 查询领取码
      const { data: claimCode, error: queryError } = await client
        .from('gift_claim_codes')
        .select('*')
        .eq('code', body.code)
        .single();

      if (queryError || !claimCode) {
        return { code: 404, msg: '领取码不存在', data: null };
      }

      if (claimCode.status === 'used') {
        return { code: 400, msg: '该领取码已核销', data: null };
      }

      // 更新领取码状态
      const { error: updateError } = await client
        .from('gift_claim_codes')
        .update({
          status: 'used',
          used_at: new Date().toISOString(),
        })
        .eq('code', body.code);

      if (updateError) {
        this.logger.error(`更新领取码状态失败: ${updateError.message}`);
        return { code: 500, msg: '核销失败', data: null };
      }

      // 记录核销历史
      await client.from('gift_redemption_records').insert({
        banquet_id: claimCode.banquet_id,
        claim_code_id: claimCode.id,
        gift_id: claimCode.gift_id,
        guest_openid: claimCode.guest_openid,
        verifier_openid: verifierOpenid,
      });

      this.logger.log(`领取码核销成功: code=${body.code}`);
      return {
        code: 200,
        msg: '核销成功',
        data: {
          giftName: claimCode.gift_name,
          guestName: claimCode.guest_name,
        },
      };
    } catch (error: any) {
      this.logger.error(`核销领取码异常: ${error.message}`);
      return { code: 500, msg: '核销失败', data: null };
    }
  }

  /**
   * 获取宴会现场礼品列表
   */
  @Get('banquet/:banquetId')
  async getBanquetGifts(@Param('banquetId') banquetId: string, @Req() req: Request) {
    this.logger.log(`获取宴会现场礼品: banquetId=${banquetId}`);

    try {
      const client = getSupabaseClient();

      const { data, error } = await client
        .from('onsite_gifts')
        .select('*')
        .eq('banquet_id', banquetId);

      if (error) {
        this.logger.error(`获取现场礼品失败: ${error.message}`);
        return { code: 500, msg: '获取失败', data: [] };
      }

      const gifts = (data || []).map((item) => ({
        id: item.id,
        name: item.name,
        image: item.image,
        price: item.price,
        displayPrice: (item.price / 100).toFixed(2),
        totalCount: item.total_count,
        remainingCount: item.remaining_count,
      }));

      return { code: 200, msg: 'success', data: gifts };
    } catch (error: any) {
      this.logger.error(`获取现场礼品异常: ${error.message}`);
      return { code: 500, msg: '获取失败', data: [] };
    }
  }

  /**
   * 获取现场礼品核销统计
   * 核销人员可以查看：总量、剩余量、核销明细
   */
  @Get('stats/:banquetId')
  async getGiftStats(
    @Param('banquetId') banquetId: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Req() req: Request
  ) {
    this.logger.log(`获取现场礼品核销统计: banquetId=${banquetId}`);

    try {
      const client = getSupabaseClient();
      const pageNum = parseInt(page) || 1;
      const pageSizeNum = parseInt(pageSize) || 20;
      const offset = (pageNum - 1) * pageSizeNum;

      // 1. 获取现场礼品统计（总量、剩余量）
      const { data: gifts, error: giftsError } = await client
        .from('onsite_gifts')
        .select('*')
        .eq('banquet_id', banquetId);

      if (giftsError) {
        this.logger.error(`获取现场礼品失败: ${giftsError.message}`);
        return { code: 500, msg: '获取失败', data: null };
      }

      // 计算汇总统计
      const giftStats = (gifts || []).map((item) => ({
        id: item.id,
        name: item.name,
        image: item.image,
        price: item.price,
        displayPrice: (item.price / 100).toFixed(2),
        totalCount: item.total_count,
        remainingCount: item.remaining_count,
        claimedCount: item.total_count - item.remaining_count,
        claimedPercentage:
          item.total_count > 0
            ? (((item.total_count - item.remaining_count) / item.total_count) * 100).toFixed(1)
            : '0',
      }));

      const totalStats = {
        totalGifts: (gifts || []).length,
        totalCount: (gifts || []).reduce((sum, g) => sum + g.total_count, 0),
        totalRemaining: (gifts || []).reduce((sum, g) => sum + g.remaining_count, 0),
        totalClaimed: (gifts || []).reduce(
          (sum, g) => sum + (g.total_count - g.remaining_count),
          0
        ),
      };

      // 2. 获取核销明细（分页）
      const {
        data: records,
        error: recordsError,
        count,
      } = await client
        .from('gift_redemption_records')
        .select(
          `
          id,
          created_at,
          gift_id,
          guest_openid,
          verifier_openid,
          claim_code_id,
          gift_claim_codes(code, guest_name, gift_name)
        `,
          { count: 'exact' }
        )
        .eq('banquet_id', banquetId)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSizeNum - 1);

      if (recordsError) {
        this.logger.error(`获取核销明细失败: ${recordsError.message}`);
        return { code: 500, msg: '获取核销明细失败', data: null };
      }

      // 格式化核销明细
      const redemptionRecords = (records || []).map((record) => {
        const claimCode = record.gift_claim_codes as any;
        return {
          id: record.id,
          code: claimCode?.code || '',
          guestName: claimCode?.guest_name || '未知',
          giftName: claimCode?.gift_name || '未知礼品',
          verifierOpenid: record.verifier_openid,
          redeemedAt: record.created_at,
        };
      });

      return {
        code: 200,
        msg: 'success',
        data: {
          // 礼品统计
          giftStats,
          totalStats,
          // 核销明细
          redemptionRecords,
          pagination: {
            page: pageNum,
            pageSize: pageSizeNum,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / pageSizeNum),
          },
        },
      };
    } catch (error: any) {
      this.logger.error(`获取核销统计异常: ${error.message}`);
      return { code: 500, msg: '获取失败', data: null };
    }
  }

  /**
   * 生成随机领取码
   */
  private generateRandomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
