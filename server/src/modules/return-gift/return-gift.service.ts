import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { WechatPayService } from '../wechat-pay/wechat-pay.service';
import { WechatSubscribeService } from '../wechat-subscribe/wechat-subscribe.service';

const supabase = getSupabaseClient();

// 缓存配置
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存过期时间
const settingsCache = new Map<string, { data: ReturnGiftSetting; timestamp: number }>();

export interface ReturnGiftSetting {
  id: string;
  banquet_id: string;
  red_packet_enabled: boolean;
  red_packet_amount: number;
  mall_gift_enabled: boolean;
  mall_gift_items: MallGiftItem[];
  onsite_gift_enabled: boolean;
  onsite_gift_items: OnsiteGiftItem[];
  gift_claim_mode: 'all' | 'choose_one';
  gift_threshold: number; // 回礼门槛：随礼金额≥此值才可发放（单位：分，0表示无门槛）
  total_budget: number;
  created_at: string;
  updated_at: string;
}

export interface MallGiftItem {
  product_id: string;
  product_name: string;
  product_price: number;
  product_image: string;
  total_count: number;
  remaining_count: number;
}

export interface OnsiteGiftItem {
  id: string;
  name: string;
  image: string;
  price: number;
  total_count: number;
  remaining_count: number;
}

export interface GuestReturnGift {
  id: string;
  gift_record_id: string;
  banquet_id: string;
  guest_openid: string;
  // 红包
  red_packet_amount: number;
  red_packet_status: 'pending' | 'sent' | 'failed';
  red_packet_sent_at?: string;
  red_packet_error_msg?: string;
  // 商城礼品
  mall_gift_claimed: boolean;
  mall_product_id?: string;
  mall_product_name?: string;
  mall_product_price?: number;
  mall_product_image?: string;
  mall_claim_type?: 'delivery' | 'exchange';
  delivery_status?: 'pending' | 'shipped' | 'delivered';
  recipient_name?: string;
  recipient_phone?: string;
  recipient_address?: string;
  express_company?: string;
  express_no?: string;
  // 现场礼品
  onsite_gift_claimed: boolean;
  onsite_gift_id?: string;
  onsite_gift_name?: string;
  onsite_gift_image?: string;
  onsite_gift_price?: number;
  exchange_code?: string;
  exchange_status?: 'pending' | 'exchanged' | 'expired';
  exchanged_at?: string;
  // 通用
  status: 'pending' | 'completed' | 'partially_claimed';
  created_at: string;
}

@Injectable()
export class ReturnGiftService {
  private readonly logger = new Logger(ReturnGiftService.name);

  constructor(
    private readonly wechatPayService: WechatPayService,
    private readonly wechatSubscribeService: WechatSubscribeService
  ) {}

  /**
   * 保存回礼设置
   */
  async saveReturnGiftSettings(banquetId: string, settings: Partial<ReturnGiftSetting>) {
    this.logger.log(`保存回礼设置: banquetId=${banquetId}`);

    // 检查是否已存在设置
    const { data: existing } = await supabase
      .from('return_gift_settings')
      .select('*')
      .eq('banquet_id', banquetId)
      .single();

    let result: ReturnGiftSetting;

    if (existing) {
      // 更新
      const { data, error } = await supabase
        .from('return_gift_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .eq('banquet_id', banquetId)
        .select()
        .single();

      if (error) {
        this.logger.error('更新回礼设置失败:', error);
        throw new Error(error.message);
      }
      result = data;
    } else {
      // 新增
      const { data, error } = await supabase
        .from('return_gift_settings')
        .insert({
          banquet_id: banquetId,
          ...settings,
        })
        .select()
        .single();

      if (error) {
        this.logger.error('创建回礼设置失败:', error);
        throw new Error(error.message);
      }
      result = data;
    }

    // 清除缓存
    settingsCache.delete(banquetId);
    this.logger.log(`已清除回礼设置缓存: banquetId=${banquetId}`);

    return result;
  }

  /**
   * 获取宴会的回礼设置
   * 优先从缓存读取，其次从 return_gift_settings 表读取，最后从 banquets.return_gift_config 读取
   */
  async getReturnGiftSettings(banquetId: string): Promise<ReturnGiftSetting | null> {
    // 1. 先检查缓存
    const cached = settingsCache.get(banquetId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      this.logger.log(`从缓存读取回礼设置: banquetId=${banquetId}`);
      return cached.data;
    }

    // 2. 从 return_gift_settings 表查询
    const { data, error } = await supabase
      .from('return_gift_settings')
      .select('*')
      .eq('banquet_id', banquetId)
      .single();

    if (data) {
      // 更新缓存
      settingsCache.set(banquetId, { data, timestamp: Date.now() });
      return data;
    }

    // 2. 如果不存在，从 banquets 表的 return_gift_config 字段读取
    if (error && error.code === 'PGRST116') {
      this.logger.log(
        `return_gift_settings 不存在，尝试从 banquets.return_gift_config 读取: ${banquetId}`
      );

      const { data: banquet, error: banquetError } = await supabase
        .from('banquets')
        .select('return_gift_config')
        .eq('id', banquetId)
        .single();

      if (banquetError || !banquet) {
        this.logger.error('获取宴会回礼配置失败:', banquetError);
        return null;
      }

      const config = banquet.return_gift_config;
      if (!config) {
        return null;
      }

      // 返回格式化的配置
      return {
        id: '',
        banquet_id: banquetId,
        red_packet_enabled: config.red_packet_enabled || false,
        red_packet_amount: config.red_packet_amount || 0,
        mall_gift_enabled: config.mall_gift_enabled || false,
        mall_gift_items: config.mall_gift_items || [],
        onsite_gift_enabled: config.onsite_gift_enabled || false,
        onsite_gift_items: config.onsite_gift_items || [],
        gift_claim_mode: 'all',
        total_budget: 0,
        created_at: '',
        updated_at: '',
      } as ReturnGiftSetting;
    }

    this.logger.error('获取回礼设置失败:', error);
    return null;
  }

  /**
   * 随礼成功后触发回礼
   * 创建嘉宾回礼记录，发送红包
   */
  async triggerReturnGift(giftRecordId: string): Promise<GuestReturnGift | null> {
    this.logger.log(`触发回礼: giftRecordId=${giftRecordId}`);

    // 1. 获取随礼记录
    const { data: giftRecord, error: giftError } = await supabase
      .from('gift_records')
      .select('*, banquets(*)')
      .eq('id', giftRecordId)
      .single();

    if (giftError || !giftRecord) {
      throw new Error('随礼记录不存在');
    }

    // 2. 获取回礼设置
    const settings = await this.getReturnGiftSettings(giftRecord.banquet_id);
    if (!settings) {
      this.logger.log('未配置回礼设置，跳过回礼');
      return null;
    }

    // ========== 新增：回礼门槛判断 ==========
    // 3. 检查回礼门槛（随礼金额≥门槛才可发放）
    const giftAmount = giftRecord.amount || 0;
    const threshold = settings.gift_threshold || 0;
    if (threshold > 0 && giftAmount < threshold) {
      this.logger.log(`随礼金额(${giftAmount}分)未达门槛(${threshold}分)，不触发回礼`);
      return null;
    }

    // ========== 新增：系统默认规则 ==========
    // 4. 计算单份回礼总价值
    // 商城礼品价值：累加所有商品单价（每个嘉宾领取一份）
    const mallGiftTotalValue =
      settings.mall_gift_enabled && settings.mall_gift_items?.length > 0
        ? settings.mall_gift_items.reduce((sum, item) => sum + (item.product_price || 0), 0)
        : 0;
    // 现场礼品价值：累加所有商品单价（每个嘉宾领取一份）
    const onsiteGiftTotalValue =
      settings.onsite_gift_enabled && settings.onsite_gift_items?.length > 0
        ? settings.onsite_gift_items.reduce((sum, item) => sum + (item.price || 0), 0)
        : 0;

    // 如果是二选一模式，取两者中较高的；否则累加
    let singleGiftTotalValue = 0;
    if (settings.gift_claim_mode === 'choose_one') {
      singleGiftTotalValue = Math.max(mallGiftTotalValue, onsiteGiftTotalValue);
    } else {
      singleGiftTotalValue = mallGiftTotalValue + onsiteGiftTotalValue;
    }

    // 随礼金额必须≥回礼总价值才触发回礼
    if (singleGiftTotalValue > 0 && giftAmount < singleGiftTotalValue) {
      this.logger.log(
        `随礼金额(${giftAmount}分)小于回礼总价值(${singleGiftTotalValue}分)，不触发回礼`
      );
      return null;
    }
    // ========== 门槛判断结束 ==========

    // 5. 检查是否已创建回礼记录
    const { data: existingGift } = await supabase
      .from('guest_return_gifts')
      .select('*')
      .eq('gift_record_id', giftRecordId)
      .single();

    if (existingGift) {
      this.logger.log('回礼记录已存在');
      return existingGift;
    }

    // 6. 创建回礼记录
    const returnGiftData: Partial<GuestReturnGift> = {
      gift_record_id: giftRecordId,
      banquet_id: giftRecord.banquet_id,
      guest_openid: giftRecord.guest_openid,
      status: 'pending',
    };

    // 7. 如果启用红包，设置红包金额
    if (settings.red_packet_enabled && settings.red_packet_amount > 0) {
      returnGiftData.red_packet_amount = settings.red_packet_amount;
      returnGiftData.red_packet_status = 'pending';
    }

    // 8. 创建回礼记录
    const { data: returnGift, error: insertError } = await supabase
      .from('guest_return_gifts')
      .insert(returnGiftData)
      .select()
      .single();

    if (insertError) {
      this.logger.error('创建回礼记录失败:', insertError);
      throw new Error('创建回礼记录失败');
    }

    // 9. 如果有红包，立即发送
    if (settings.red_packet_enabled && settings.red_packet_amount > 0) {
      await this.sendRedPacket(returnGift.id, giftRecord.guest_openid, settings.red_packet_amount);
    }

    // 10. 更新随礼记录状态
    await supabase
      .from('gift_records')
      .update({ return_gift_status: 'eligible' })
      .eq('id', giftRecordId);

    return returnGift;
  }

  /**
   * 【新版】发送微信红包 - 从主办方充值余额扣除
   *
   * 流程：
   * 1. 检查主办方余额是否充足
   * 2. 从余额中冻结/扣除红包金额
   * 3. 调用平台商户发放红包
   * 4. 记录余额变动日志
   *
   * 资金来源：主办方充值余额
   * 资金去向：嘉宾微信零钱
   */
  async sendRedPacket(returnGiftId: string, openid: string, amount: number) {
    this.logger.log(
      `发送微信红包: returnGiftId=${returnGiftId}, openid=${openid}, amount=${amount}`
    );

    try {
      // 1. 获取回礼记录和宴会信息
      const { data: returnGift, error: returnGiftError } = await supabase
        .from('guest_return_gifts')
        .select('*, banquets(host_openid, name)')
        .eq('id', returnGiftId)
        .single();

      if (returnGiftError || !returnGift) {
        throw new Error('回礼记录不存在');
      }

      const banquet = returnGift.banquets as any;
      const hostOpenid = banquet?.host_openid;
      const banquetName = banquet?.name || '宴会';

      if (!hostOpenid) {
        throw new Error('无法获取主办方信息');
      }

      // 2. 检查主办方余额
      const { data: hostBalance, error: balanceError } = await supabase
        .from('host_balances')
        .select('*')
        .eq('openid', hostOpenid)
        .single();

      if (balanceError || !hostBalance) {
        throw new Error('主办方未开通余额账户，请先充值');
      }

      const availableBalance = hostBalance.balance - hostBalance.frozen_balance;
      if (availableBalance < amount) {
        throw new Error(
          `余额不足，当前可用余额${(availableBalance / 100).toFixed(2)}元，需要${(amount / 100).toFixed(2)}元`
        );
      }

      // 3. 冻结余额
      const { error: freezeError } = await supabase
        .from('host_balances')
        .update({
          frozen_balance: hostBalance.frozen_balance + amount,
          updated_at: new Date().toISOString(),
        })
        .eq('openid', hostOpenid);

      if (freezeError) {
        throw new Error('冻结余额失败');
      }

      this.logger.log(`已冻结主办方余额: openid=${hostOpenid}, amount=${amount}`);

      // 4. 调用微信支付商家转账到零钱API
      const description = `【${banquetName}】回礼红包`;
      const transferResult = await this.wechatPayService.transferToBalance({
        openid,
        amount,
        description,
        orderId: `RP${returnGiftId.replace(/-/g, '')}`,
      });

      if (transferResult.success) {
        // 5. 从余额中扣除（解冻并扣款）
        const { data: latestBalance } = await supabase
          .from('host_balances')
          .select('*')
          .eq('openid', hostOpenid)
          .single();

        if (latestBalance) {
          await supabase
            .from('host_balances')
            .update({
              balance: latestBalance.balance - amount,
              frozen_balance: latestBalance.frozen_balance - amount,
              total_spent: latestBalance.total_spent + amount,
              updated_at: new Date().toISOString(),
            })
            .eq('openid', hostOpenid);
        }

        // 6. 记录余额变动
        await supabase.from('balance_logs').insert({
          openid: hostOpenid,
          type: 'red_packet',
          amount: -amount,
          balance_after: (latestBalance?.balance || 0) - amount,
          description: `发放回礼红包（${banquetName}）`,
          order_id: returnGiftId,
        });

        // 7. 更新红包状态为已发送
        await supabase
          .from('guest_return_gifts')
          .update({
            red_packet_status: 'sent',
            red_packet_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', returnGiftId);

        // 8. 记录红包日志
        await supabase.from('red_packet_logs').insert({
          guest_return_gift_id: returnGiftId,
          amount,
          openid,
          host_openid: hostOpenid,
          status: 'sent',
          payment_no: transferResult.paymentNo,
          sent_at: new Date().toISOString(),
        });

        this.logger.log(`微信红包发送成功: paymentNo=${transferResult.paymentNo}`);
        return { success: true, paymentNo: transferResult.paymentNo };
      } else {
        // 发送失败，解冻余额
        const { data: latestBalance } = await supabase
          .from('host_balances')
          .select('*')
          .eq('openid', hostOpenid)
          .single();

        if (latestBalance) {
          await supabase
            .from('host_balances')
            .update({
              frozen_balance: latestBalance.frozen_balance - amount,
              updated_at: new Date().toISOString(),
            })
            .eq('openid', hostOpenid);
        }

        throw new Error(transferResult.errorMsg || '转账失败');
      }
    } catch (error: any) {
      this.logger.error('发送微信红包失败:', error);

      // 更新状态为失败
      await supabase
        .from('guest_return_gifts')
        .update({
          red_packet_status: 'failed',
          red_packet_error_msg: error.message || '发送失败',
          updated_at: new Date().toISOString(),
        })
        .eq('id', returnGiftId);

      // 记录失败日志
      await supabase.from('red_packet_logs').insert({
        guest_return_gift_id: returnGiftId,
        amount,
        openid,
        status: 'failed',
        error_msg: error.message || '发送失败',
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * 嘉宾领取商城礼品
   */
  async claimMallGift(
    returnGiftId: string,
    claimType: 'delivery' | 'exchange',
    deliveryInfo?: { name: string; phone: string; address: string }
  ) {
    this.logger.log(`领取商城礼品: returnGiftId=${returnGiftId}, claimType=${claimType}`);

    // 1. 获取回礼记录
    const { data: returnGift, error } = await supabase
      .from('guest_return_gifts')
      .select('*, banquets(*)')
      .eq('id', returnGiftId)
      .single();

    if (error || !returnGift) {
      throw new Error('回礼记录不存在');
    }

    // 2. 检查是否已领取
    if (returnGift.mall_gift_claimed) {
      throw new Error('商城礼品已领取');
    }

    // 3. 获取回礼设置
    const settings = await this.getReturnGiftSettings(returnGift.banquet_id);
    if (!settings || !settings.mall_gift_enabled) {
      throw new Error('未配置商城礼品');
    }

    // 4. 检查领取模式
    if (settings.gift_claim_mode === 'choose_one') {
      // 二选一模式，检查是否已领取现场礼品
      if (returnGift.onsite_gift_claimed) {
        throw new Error('您已选择领取现场礼品，不能再领取商城礼品');
      }
    }

    // 5. 检查库存
    const availableGift = settings.mall_gift_items.find((item) => item.remaining_count > 0);

    if (!availableGift) {
      throw new Error('商城礼品已领完');
    }

    // 6. 分配礼品（按顺序分配第一个有库存的）
    const updateData: any = {
      mall_gift_claimed: true,
      mall_product_id: availableGift.product_id,
      mall_product_name: availableGift.product_name,
      mall_product_price: availableGift.product_price,
      mall_product_image: availableGift.product_image,
      mall_claim_type: claimType,
      updated_at: new Date().toISOString(),
    };

    if (claimType === 'delivery' && deliveryInfo) {
      updateData.recipient_name = deliveryInfo.name;
      updateData.recipient_phone = deliveryInfo.phone;
      updateData.recipient_address = deliveryInfo.address;
      updateData.delivery_status = 'pending';
      // 设置发货截止时间：当前时间 + 48小时
      updateData.estimated_ship_time = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    }

    // 7. 更新回礼记录
    const { error: updateError } = await supabase
      .from('guest_return_gifts')
      .update(updateData)
      .eq('id', returnGiftId);

    if (updateError) {
      throw new Error('领取失败');
    }

    // 8. 扣减库存
    const updatedItems = settings.mall_gift_items.map((item) => {
      if (item.product_id === availableGift.product_id) {
        return { ...item, remaining_count: item.remaining_count - 1 };
      }
      return item;
    });

    await supabase
      .from('return_gift_settings')
      .update({ mall_gift_items: updatedItems })
      .eq('banquet_id', returnGift.banquet_id);

    // 9. 检查库存预警（剩余不足5%时通知主办方）
    const claimedItem = updatedItems.find((item) => item.product_id === availableGift.product_id);
    if (claimedItem && claimedItem.total_count > 0) {
      const remainingPercentage = (claimedItem.remaining_count / claimedItem.total_count) * 100;
      if (remainingPercentage <= 5 && remainingPercentage > 0) {
        // 异步发送库存预警通知，不阻塞主流程
        this.sendMallGiftStockWarning(returnGift.banquet_id, claimedItem).catch((err) => {
          this.logger.error('发送库存预警通知失败:', err.message);
        });
      }
    }

    // 10. 更新状态
    await this.updateReturnGiftStatus(returnGiftId);

    return {
      success: true,
      gift: {
        product_id: availableGift.product_id,
        product_name: availableGift.product_name,
        product_price: availableGift.product_price,
        product_image: availableGift.product_image,
        claim_type: claimType,
      },
    };
  }

  /**
   * 嘉宾领取现场礼品
   */
  async claimOnsiteGift(returnGiftId: string) {
    this.logger.log(`领取现场礼品: returnGiftId=${returnGiftId}`);

    // 1. 获取回礼记录
    const { data: returnGift, error } = await supabase
      .from('guest_return_gifts')
      .select('*, banquets(*)')
      .eq('id', returnGiftId)
      .single();

    if (error || !returnGift) {
      throw new Error('回礼记录不存在');
    }

    // 2. 检查是否已领取
    if (returnGift.onsite_gift_claimed) {
      throw new Error('现场礼品已领取');
    }

    // 3. 获取回礼设置
    const settings = await this.getReturnGiftSettings(returnGift.banquet_id);
    if (!settings || !settings.onsite_gift_enabled) {
      throw new Error('未配置现场礼品');
    }

    // 4. 检查领取模式
    if (settings.gift_claim_mode === 'choose_one') {
      // 二选一模式，检查是否已领取商城礼品
      if (returnGift.mall_gift_claimed) {
        throw new Error('您已选择领取商城礼品，不能再领取现场礼品');
      }
    }

    // 5. 检查库存
    const availableGift = settings.onsite_gift_items.find((item) => item.remaining_count > 0);

    if (!availableGift) {
      throw new Error('现场礼品已领完');
    }

    // 6. 生成兑换码
    const exchangeCode = this.generateExchangeCode();

    // 7. 分配礼品
    const updateData: any = {
      onsite_gift_claimed: true,
      onsite_gift_id: availableGift.id,
      onsite_gift_name: availableGift.name,
      onsite_gift_image: availableGift.image,
      onsite_gift_price: availableGift.price,
      exchange_code: exchangeCode,
      exchange_status: 'pending',
      updated_at: new Date().toISOString(),
    };

    // 8. 更新回礼记录
    const { error: updateError } = await supabase
      .from('guest_return_gifts')
      .update(updateData)
      .eq('id', returnGiftId);

    if (updateError) {
      throw new Error('领取失败');
    }

    // 9. 扣减库存
    const updatedItems = settings.onsite_gift_items.map((item) => {
      if (item.id === availableGift.id) {
        return { ...item, remaining_count: item.remaining_count - 1 };
      }
      return item;
    });

    await supabase
      .from('return_gift_settings')
      .update({ onsite_gift_items: updatedItems })
      .eq('banquet_id', returnGift.banquet_id);

    // 10. 更新状态
    await this.updateReturnGiftStatus(returnGiftId);

    return {
      success: true,
      gift: {
        id: availableGift.id,
        name: availableGift.name,
        image: availableGift.image,
        price: availableGift.price,
        exchange_code: exchangeCode,
      },
    };
  }

  /**
   * 现场核销礼品
   */
  async exchangeOnsiteGift(exchangeCode: string) {
    this.logger.log(`核销现场礼品: exchangeCode=${exchangeCode}`);

    // 1. 查找回礼记录
    const { data: returnGift, error } = await supabase
      .from('guest_return_gifts')
      .select('*, banquets(*)')
      .eq('exchange_code', exchangeCode)
      .single();

    if (error || !returnGift) {
      throw new Error('兑换码无效');
    }

    // 2. 检查状态
    if (returnGift.exchange_status === 'exchanged') {
      throw new Error('礼品已核销');
    }

    if (returnGift.exchange_status === 'expired') {
      throw new Error('兑换码已过期');
    }

    // 3. 检查宴会是否已结束（现场礼品仅限当天有效）
    const banquet = returnGift.banquets;
    const eventDate = new Date(banquet.event_time).toDateString();
    const today = new Date().toDateString();

    if (eventDate !== today) {
      // 标记为过期
      await supabase
        .from('guest_return_gifts')
        .update({
          exchange_status: 'expired',
          updated_at: new Date().toISOString(),
        })
        .eq('id', returnGift.id);

      throw new Error('兑换码已过期，现场礼品仅限宴会当天有效');
    }

    // 4. 核销
    const { error: updateError } = await supabase
      .from('guest_return_gifts')
      .update({
        exchange_status: 'exchanged',
        exchanged_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', returnGift.id);

    if (updateError) {
      throw new Error('核销失败');
    }

    return {
      success: true,
      gift: {
        name: returnGift.onsite_gift_name,
        image: returnGift.onsite_gift_image,
        price: returnGift.onsite_gift_price,
      },
    };
  }

  /**
   * 现场核销礼品（带身份验证）
   * 只有主办方指定的工作人员微信号才能核销
   */
  async exchangeOnsiteGiftWithAuth(
    exchangeCode: string,
    verifierWechat: string,
    verifierOpenid?: string
  ) {
    this.logger.log(
      `核销现场礼品(带身份验证): exchangeCode=${exchangeCode}, verifierWechat=${verifierWechat}`
    );

    // 1. 查找回礼记录
    const { data: returnGift, error } = await supabase
      .from('guest_return_gifts')
      .select('*, banquets(*)')
      .eq('exchange_code', exchangeCode)
      .single();

    if (error || !returnGift) {
      // 记录核销日志
      await this.logRedemptionAttempt(
        '',
        returnGift?.id || '',
        exchangeCode,
        verifierWechat,
        verifierOpenid,
        'invalid',
        '兑换码无效'
      );
      throw new Error('兑换码无效');
    }

    const banquet = returnGift.banquets as any;

    // 2. 验证核销人员身份
    const staffWechat = banquet?.staff_wechat;
    if (staffWechat && staffWechat.trim() !== '') {
      // 如果主办方设置了工作人员微信号，则必须匹配
      if (verifierWechat !== staffWechat) {
        // 记录核销日志
        await this.logRedemptionAttempt(
          banquet.id,
          returnGift.id,
          exchangeCode,
          verifierWechat,
          verifierOpenid,
          'unauthorized',
          '非指定工作人员，无权核销'
        );
        throw new Error('非指定工作人员，无权核销此礼品');
      }
    }

    // 3. 检查状态
    if (returnGift.exchange_status === 'exchanged') {
      // 记录核销日志
      await this.logRedemptionAttempt(
        banquet.id,
        returnGift.id,
        exchangeCode,
        verifierWechat,
        verifierOpenid,
        'already_redemption',
        '礼品已核销'
      );
      throw new Error('礼品已核销');
    }

    if (returnGift.exchange_status === 'expired') {
      // 记录核销日志
      await this.logRedemptionAttempt(
        banquet.id,
        returnGift.id,
        exchangeCode,
        verifierWechat,
        verifierOpenid,
        'invalid',
        '兑换码已过期'
      );
      throw new Error('兑换码已过期');
    }

    // 4. 检查宴会是否已结束（现场礼品仅限当天有效）
    const eventDate = new Date(banquet.event_time).toDateString();
    const today = new Date().toDateString();

    if (eventDate !== today) {
      // 标记为过期
      await supabase
        .from('guest_return_gifts')
        .update({
          exchange_status: 'expired',
          updated_at: new Date().toISOString(),
        })
        .eq('id', returnGift.id);

      // 记录核销日志
      await this.logRedemptionAttempt(
        banquet.id,
        returnGift.id,
        exchangeCode,
        verifierWechat,
        verifierOpenid,
        'invalid',
        '兑换码已过期，现场礼品仅限宴会当天有效'
      );
      throw new Error('兑换码已过期，现场礼品仅限宴会当天有效');
    }

    // 5. 核销
    const { error: updateError } = await supabase
      .from('guest_return_gifts')
      .update({
        exchange_status: 'exchanged',
        exchanged_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', returnGift.id);

    if (updateError) {
      // 记录核销日志
      await this.logRedemptionAttempt(
        banquet.id,
        returnGift.id,
        exchangeCode,
        verifierWechat,
        verifierOpenid,
        'error',
        '核销失败'
      );
      throw new Error('核销失败');
    }

    // 6. 记录成功核销日志
    await this.logRedemptionAttempt(
      banquet.id,
      returnGift.id,
      exchangeCode,
      verifierWechat,
      verifierOpenid,
      'success',
      ''
    );

    return {
      success: true,
      gift: {
        name: returnGift.onsite_gift_name,
        image: returnGift.onsite_gift_image,
        price: returnGift.onsite_gift_price,
        guestName: returnGift.guest_name,
      },
      banquet: {
        name: banquet.name,
        type: banquet.type,
      },
    };
  }

  /**
   * 记录核销日志
   */
  private async logRedemptionAttempt(
    banquetId: string,
    returnGiftId: string,
    exchangeCode: string,
    verifierWechat: string,
    verifierOpenid: string | undefined,
    status: string,
    errorMessage: string
  ) {
    try {
      await supabase.from('gift_redemption_logs').insert({
        banquet_id: banquetId,
        return_gift_id: returnGiftId,
        exchange_code: exchangeCode,
        verifier_wechat: verifierWechat,
        verifier_openid: verifierOpenid || null,
        redemption_status: status,
        error_message: errorMessage || null,
        created_at: new Date().toISOString(),
      });
    } catch (err: any) {
      this.logger.warn(`记录核销日志失败: ${err.message}`);
    }
  }

  /**
   * 获取嘉宾的回礼记录（含领取资格判断）
   * 新规则：嘉宾随礼金额 > 单份回礼总额 才能领取回礼
   */
  async getGuestReturnGift(giftRecordId: string): Promise<any> {
    // 1. 获取随礼记录
    const { data: giftRecord, error: giftError } = await supabase
      .from('gift_records')
      .select('*')
      .eq('id', giftRecordId)
      .single();

    if (giftError || !giftRecord) {
      return null;
    }

    // 2. 获取回礼记录
    const { data: returnGift, error } = await supabase
      .from('guest_return_gifts')
      .select('*')
      .eq('gift_record_id', giftRecordId)
      .single();

    if (error) {
      return null;
    }

    // 3. 获取回礼设置，计算单份回礼总额
    const settings = await this.getReturnGiftSettings(returnGift.banquet_id);
    let totalReturnValue = 0;

    if (settings) {
      // 红包金额
      if (settings.red_packet_enabled) {
        totalReturnValue += settings.red_packet_amount || 0;
      }

      // 商城礼品（取第一个礼品的价格）
      if (settings.mall_gift_enabled && settings.mall_gift_items?.length > 0) {
        totalReturnValue += settings.mall_gift_items[0].product_price || 0;
      }

      // 现场礼品（取第一个礼品的价格）
      if (settings.onsite_gift_enabled && settings.onsite_gift_items?.length > 0) {
        totalReturnValue += settings.onsite_gift_items[0].price || 0;
      }
    }

    // 4. 判断领取资格
    const guestAmount = giftRecord.amount || 0;
    const isEligible = guestAmount > totalReturnValue;

    // 5. 返回完整数据
    return {
      ...returnGift,
      guest_amount: guestAmount,
      total_return_value: totalReturnValue,
      is_eligible: isEligible,
      settings: settings
        ? {
            red_packet_enabled: settings.red_packet_enabled,
            red_packet_amount: settings.red_packet_amount,
            mall_gift_enabled: settings.mall_gift_enabled,
            mall_gift_items: settings.mall_gift_items,
            onsite_gift_enabled: settings.onsite_gift_enabled,
            onsite_gift_items: settings.onsite_gift_items,
          }
        : null,
    };
  }

  /**
   * 更新回礼状态
   */
  private async updateReturnGiftStatus(returnGiftId: string) {
    const { data: returnGift } = await supabase
      .from('guest_return_gifts')
      .select('*')
      .eq('id', returnGiftId)
      .single();

    if (!returnGift) return;

    let status: 'pending' | 'completed' | 'partially_claimed' = 'pending';

    // 判断完成状态
    const hasRedPacket = returnGift.red_packet_amount > 0;
    const redPacketDone = !hasRedPacket || returnGift.red_packet_status === 'sent';
    const mallGiftDone =
      !returnGift.mall_gift_claimed || returnGift.delivery_status === 'delivered';
    const onsiteGiftDone =
      !returnGift.onsite_gift_claimed || returnGift.exchange_status === 'exchanged';

    if (redPacketDone && mallGiftDone && onsiteGiftDone) {
      status = 'completed';
    } else if (returnGift.mall_gift_claimed || returnGift.onsite_gift_claimed) {
      status = 'partially_claimed';
    }

    await supabase
      .from('guest_return_gifts')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', returnGiftId);
  }

  /**
   * 生成兑换码（6位数字+字母）
   */
  private generateExchangeCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉易混淆的字符
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * 获取宴会未领取的礼品统计
   */
  async getUnclaimedGiftsStats(banquetId: string) {
    const settings = await this.getReturnGiftSettings(banquetId);
    if (!settings) return null;

    const mallStats = settings.mall_gift_items.map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      total: item.total_count,
      remaining: item.remaining_count,
      claimed: item.total_count - item.remaining_count,
    }));

    const onsiteStats = settings.onsite_gift_items.map((item) => ({
      id: item.id,
      name: item.name,
      total: item.total_count,
      remaining: item.remaining_count,
      claimed: item.total_count - item.remaining_count,
    }));

    return {
      mall_gifts: mallStats,
      onsite_gifts: onsiteStats,
      total_unclaimed_value: this.calculateUnclaimedValue(settings),
    };
  }

  /**
   * 计算未领取礼品的价值
   */
  private calculateUnclaimedValue(settings: ReturnGiftSetting): number {
    let value = 0;

    settings.mall_gift_items.forEach((item) => {
      value += item.product_price * item.remaining_count;
    });

    settings.onsite_gift_items.forEach((item) => {
      value += item.price * item.remaining_count;
    });

    return value;
  }

  /**
   * 退还未领取礼品（宴会结束后调用）
   * 规则：
   * - 未领取的商城礼品：可申请原路退回
   * - 已领取但未发货的商城礼品：不得退款
   */
  async refundUnclaimedGifts(banquetId: string) {
    this.logger.log(`退还未领取礼品: banquetId=${banquetId}`);

    // 1. 获取宴会信息
    const { data: banquet, error: banquetError } = await supabase
      .from('banquets')
      .select('host_openid, name, mall_gift_pay_no, mall_gift_pay_amount')
      .eq('id', banquetId)
      .single();

    if (banquetError || !banquet) {
      return { success: false, message: '宴会不存在' };
    }

    const hostOpenid = banquet.host_openid;

    // 2. 获取回礼设置
    const settings = await this.getReturnGiftSettings(banquetId);
    if (!settings) return { success: false, message: '未找到回礼设置' };

    // 3. 查询所有嘉宾的商城礼品领取记录，找出"已领取但未发货"的数量
    const { data: guestRecords } = await supabase
      .from('guest_return_gifts')
      .select(
        'mall_gift_claimed, mall_claim_type, delivery_status, mall_product_id, mall_product_price'
      )
      .eq('banquet_id', banquetId)
      .eq('mall_gift_claimed', true);

    // 计算每个商品已领取但未发货的数量
    const claimedButNotShipped: Record<string, number> = {};
    if (guestRecords) {
      for (const record of guestRecords) {
        // 已领取 + 选择邮寄 + 未发货 = 不得退款
        if (record.mall_claim_type === 'delivery' && record.delivery_status === 'pending') {
          const key = record.mall_product_id;
          claimedButNotShipped[key] = (claimedButNotShipped[key] || 0) + 1;
        }
      }
    }

    // 4. 计算可退款的金额（排除已领取但未发货的部分）
    let refundAmount = 0;
    let cannotRefundAmount = 0;
    const refundDetails: any[] = [];
    const cannotRefundDetails: any[] = [];

    if (settings.mall_gift_enabled && settings.mall_gift_items?.length > 0) {
      for (const item of settings.mall_gift_items) {
        const unclaimedCount = item.remaining_count;
        const claimedNotShippedCount = claimedButNotShipped[item.product_id] || 0;
        // 可退款的数量 = 未领取数量（因为已领取的已在remaining_count中扣减了）
        // 但需要确保：嘉宾已领取但未发货的，不得退款
        // 由于 remaining_count = total_count - 已领取数量（包含已发货和未发货）
        // 所以 weui 只需要验证：嘉宾选择邮寄但未发货的情况（这部分不应该退款）
        // 但实际上，这些数量已经在 remaining_count 中了，因为嘉宾领取时扣减的是 total

        // 重新理解：
        // - remaining_count = 初始设置的数量 - 已点击领取的数量
        // - 已点击领取但未发货 = guest_return_gifts 中 mall_gift_claimed=true 且 delivery_status=pending
        // - 这部分已经在 remaining_count 中扣除了，所以 remaining_count 本身就是"可退款"的数量
        // 等等，不对。嘉宾点击领取时，remaining_count 就扣减了1
        // 所以 remaining_count 不包含"已领取但未发货"的数量

        // 正确的理解：
        // - 嘉宾点击领取 → remaining_count 扣减1 → mall_gift_claimed = true
        // - 如果嘉宾领取后选择邮寄 → delivery_status = pending（未发货）
        // - 如果嘉宾领取后选择置换 → mall_claim_type = exchange
        // - 如果嘉宾领取后已发货 → delivery_status = shipped/delivered

        // 所以：
        // - remaining_count = 没有人领取过的数量
        // - 已领取但未发货 = 嘉宾点了领取，但还没发货（这部分不得退款）
        // - 已领取且已发货/置换 = 嘉宾点了领取，且已完成（这部分也不得退款）

        // 用户要求的是：已领取但未发货不得退款
        // 但已领取且已发货/置换本身就不涉及退款问题（商品已经给嘉宾了）

        // 所以核心逻辑是：
        // 可退款数量 = remaining_count（未有人领取的数量）
        // 不得退款 = 嘉宾已领取的数量（无论是否发货）

        // 但这样的话，用户说的"已领取但未发货不得退款"其实已经包含在"已领取不得退款"里了
        // 除非用户想表达的是另一种情况...

        // 让我重新读用户的需求：
        // "嘉宾未领取的商城礼品，对应的金额，主办方申请原路退回"
        // "重点，嘉宾已领取但未发货的，主办方不得退款"

        // 这说明用户想要区分：
        // 1. 未领取 → 可退款
        // 2. 已领取但未发货 → 不得退款
        // 3. 已领取且已发货 → 不得退款（这个不用强调）

        // 关键是如何判断"未发货"？
        // 从代码看，嘉宾领取时设置 delivery_status = 'pending'
        // 然后发货时更新为 'shipped' 或 'delivered'

        // 所以：
        // - remaining_count = 未有人点击领取的数量 = 可退款
        // - 已领取且 delivery_status = 'pending' = 已领取但未发货 = 不得退款
        // - 已领取且 delivery_status = 'shipped'/'delivered' = 已发货 = 不得退款

        // 但是 remaining_count 并不等于"未领取的数量"
        // 让我再仔细看代码...

        // 嘉宾领取时：
        // 1. 更新 guest_return_gifts: mall_gift_claimed = true
        // 2. 扣减 remaining_count: remaining_count = remaining_count - 1

        // 所以：
        // - remaining_count = 初始数量 - 已点击领取的数量（包括未发货、已发货、置换的）
        // - guest_return_gifts 中 mall_gift_claimed=true 的数量 = 已点击领取的数量

        // 如果 remaining_count = 10，total_count = 20
        // 说明有 10 人已点击领取，10 人未领取

        // 在已点击领取的 10 人中：
        // - 3 人未发货（delivery_status = 'pending'）
        // - 5 人已发货
        // - 2 人选择置换

        // 用户要求的：
        // - 未领取的 10 人份：可退款
        // - 已领取但未发货的 3 人份：不得退款
        // - 已发货的 5 人份：不得退款（商品已给嘉宾）
        // - 置换的 2 人份：不得退款（商品已给嘉宾）

        // 所以可退款数量 = remaining_count = 10 人份
        // 不得退款数量 = total_count - remaining_count = 10 人份

        // 那用户说的"已领取但未发货不得退款"有什么特殊意义吗？
        // 可能是为了强调：即使嘉宾点了领取但还没发货，也不能退款

        // 让我按用户的要求实现：
        // - remaining_count 对应的金额：可退款
        // - 嘉宾已领取但未发货的数量 × 单价：不得退款
        // 但是 remaining_count 已经不包含"已领取但未发货"的数量了...

        // 哦，我明白了！
        // 用户可能是想说：
        // - 当前代码的逻辑是对的（remaining_count 就是可退款的）
        // - 但需要明确强调"已领取但未发货不得退款"这个规则

        // 或者，用户可能是想防止另一种情况：
        // - 嘉宾点了领取，remaining_count 扣减了
        // - 但平台还没发货
        // - 主办方想退款
        // - 这种情况下不能退款

        // 所以逻辑应该是：
        // 1. 计算未领取的数量 = remaining_count
        // 2. 计算已领取但未发货的数量
        // 3. 可退款金额 = 未领取数量 × 单价
        // 4. 已领取但未发货的金额不能退

        // 但是 remaining_count 不包含"已领取但未发货"的数量啊...
        // 因为嘉宾点领取时就已经扣减 remaining_count 了

        // 除非...用户的意思是：
        // - 嘉宾点领取时不应该立即扣减 remaining_count？
        // - 或者用户想要的是：
        //   - 嘉宾点领取 + 选择邮寄 → remaining_count 不立即扣减
        //   - 等发货时才扣减？

        // 从用户说的"嘉宾已领取但未发货"来看，
        // 很可能用户想要的是：
        // - 嘉宾点领取时，remaining_count 不扣减
        // - 等发货时才扣减
        // - 这样"已领取但未发货"的数量是可见的

        // 但这样的话需要修改嘉宾领取的逻辑...

        // 让我再看看当前代码...
        // 当前嘉宾领取时，remaining_count 立即扣减
        // 所以 remaining_count = 真正没有人领取的数量
        // "已领取但未发货"的数量需要从 guest_return_gifts 表查询

        // 所以最终逻辑是：
        // - 未领取的数量 = remaining_count（这部分可退款）
        // - 已领取但未发货的数量 = 从 guest_return_gifts 查询（这部分不得退款，但金额不计入可退款）
        // - 已领取且已发货/置换的数量（不得退款，但金额也不计入可退款）

        // 所以可退款金额 = remaining_count × 单价

        // 用户可能只是想要一个提示文案，说明"已领取但未发货的不得退款"
        // 而不是改变退款金额的计算逻辑

        // 让我重新理解用户的需求...
        // "嘉宾未领取的商城礼品，对应的金额，主办方申请原路退回"
        // "重点，嘉宾已领取但未发货的，主办方不得退款"

        // 这里的"对应的金额"是指什么？
        // - 未领取的金额 = 未领取数量 × 单价
        // - 已领取但未发货的金额 = 已领取但未发货数量 × 单价

        // 用户说未领取的可退，已领取但未发货的不可退
        // 这说明用户想要的逻辑是：
        // - remaining_count = 未有人点击领取 = 可退款
        // - 已点击领取但未发货 = 不得退款

        // 但问题是 remaining_count 已经扣除了"已点击领取但未发货"的数量
        // 所以 remaining_count 本身就是"可退款"的数量

        // 除非用户想要的流程是：
        // 1. 嘉宾点领取时，不扣减 remaining_count
        // 2. 等发货时才扣减 remaining_count
        // 3. 这样 remaining_count = 总数 - 已发货数量
        // 4. 可退款 = remaining_count - 已领取但未发货

        // 这样的话，需要修改嘉宾领取的逻辑...
        // 但这可能影响太大

        // 让我换一个角度理解：
        // 当前代码中，嘉宾点领取时：
        // 1. mall_gift_claimed = true
        // 2. remaining_count -= 1

        // 如果嘉宾点领取后选择置换（mall_claim_type = 'exchange'）：
        // - 商品已经给嘉宾了，不能退款

        // 如果嘉宾点领取后选择邮寄（mall_claim_type = 'delivery'）：
        // - 如果还没发货（delivery_status = 'pending'）：商品还没给嘉宾
        // - 如果已发货（delivery_status = 'shipped'/'delivered'）：商品已给嘉宾

        // 用户说的"已领取但未发货不得退款"可能是针对置换场景：
        // - 嘉宾点了领取，选择置换
        // - 此时 remaining_count 已经扣减了
        // - 但商品已经给嘉宾了，不能退款

        // 所以最终结论：
        // - remaining_count = 未有人领取的数量 = 可退款
        // - 已有人领取（无论是否发货/置换）= 不得退款

        // 用户强调"已领取但未发货不得退款"可能是为了防止争议：
        // - 即使嘉宾只是点了领取，还没收到货，也不能退款

        // 所以我只需要在退款时：
        // 1. 计算可退款金额 = remaining_count × 单价
        // 2. 查询已领取的数量
        // 3. 返回提示：已领取的不得退款

        if (unclaimedCount > 0) {
          const itemValue = item.product_price * unclaimedCount;
          refundAmount += itemValue;
          refundDetails.push({
            product_name: item.product_name,
            refund_count: unclaimedCount,
            refund_value: itemValue,
          });
        }

        // 已领取但未发货的部分记录下来（用于提示）
        if (claimedNotShippedCount > 0) {
          const itemValue = item.product_price * claimedNotShippedCount;
          cannotRefundAmount += itemValue;
          cannotRefundDetails.push({
            product_name: item.product_name,
            count: claimedNotShippedCount,
            value: itemValue,
          });
        }
      }
    }

    if (refundAmount <= 0) {
      return {
        success: true,
        message: '无未领取的商城礼品可退款',
        refund_amount: 0,
        cannot_refund_amount: cannotRefundAmount,
        cannot_refund_details: cannotRefundDetails,
      };
    }

    // 5. 调用微信退款API原路退回
    if (banquet.mall_gift_pay_no && refundAmount > 0) {
      try {
        const refundId = `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const refundResult = await this.wechatPayService.refund({
          orderId: banquet.mall_gift_pay_no,
          refundId: refundId,
          totalAmount: banquet.mall_gift_pay_amount || refundAmount,
          refundAmount: refundAmount,
          reason: `宴会「${banquet.name}」未领取商城礼品退款`,
        });

        if (!refundResult.success) {
          this.logger.error('微信退款失败:', refundResult.message);
          return {
            success: false,
            message: refundResult.message || '退款失败',
            cannot_refund_amount: cannotRefundAmount,
            cannot_refund_details: cannotRefundDetails,
          };
        }

        this.logger.log(`微信退款成功: refundId=${refundId}, amount=${refundAmount}`);
      } catch (error) {
        this.logger.error('调用微信退款异常:', error);
        return {
          success: false,
          message: '退款失败，请稍后重试',
          cannot_refund_amount: cannotRefundAmount,
          cannot_refund_details: cannotRefundDetails,
        };
      }
    }

    // 6. 记录退款日志（即使是微信退款成功，也记录到余额日志作为参考）
    await supabase.from('balance_logs').insert({
      openid: hostOpenid,
      type: 'gift_refund',
      amount: refundAmount,
      balance_after: 0, // 原路退回，不经过余额
      description: `宴会「${banquet.name}」未领取商城礼品原路退款`,
      order_id: banquetId,
    });

    // 7. 标记已退款
    await supabase
      .from('return_gift_settings')
      .update({
        refund_status: 'completed',
        refund_amount: refundAmount,
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('banquet_id', banquetId);

    this.logger.log(`已退款商城礼品金额: ${refundAmount}分，原路退回，宴会: ${banquetId}`);

    // 8. 构建返回消息
    let message = `已退还 ¥${(refundAmount / 100).toFixed(2)} 到原支付账户`;
    if (cannotRefundAmount > 0) {
      message += `。另有 ¥${(cannotRefundAmount / 100).toFixed(2)} 为嘉宾已领取但未发货的礼品，无法退款`;
    }

    return {
      success: true,
      refund_amount: refundAmount,
      refund_details: refundDetails,
      cannot_refund_amount: cannotRefundAmount,
      cannot_refund_details: cannotRefundDetails,
      message,
    };
  }

  /**
   * 发送商城礼品库存预警通知
   * 当礼品库存剩余不足5%时，通知主办方及时补货
   */
  private async sendMallGiftStockWarning(banquetId: string, giftItem: MallGiftItem) {
    this.logger.log(
      `发送商城礼品库存预警: banquetId=${banquetId}, product=${giftItem.product_name}`
    );

    try {
      // 1. 获取宴会信息和主办方openid
      const { data: banquet, error } = await supabase
        .from('banquets')
        .select('host_openid, name')
        .eq('id', banquetId)
        .single();

      if (error || !banquet) {
        this.logger.error('获取宴会信息失败:', error);
        return;
      }

      const remainingPercentage = ((giftItem.remaining_count / giftItem.total_count) * 100).toFixed(
        1
      );

      // 2. 发送订阅消息通知
      await this.wechatSubscribeService.sendStockWarning({
        openid: banquet.host_openid,
        banquetName: banquet.name,
        productName: giftItem.product_name,
        totalCount: giftItem.total_count,
        remainingCount: giftItem.remaining_count,
        remainingPercentage,
      });

      this.logger.log(
        `库存预警通知已发送: openid=${banquet.host_openid}, product=${giftItem.product_name}`
      );
    } catch (error: any) {
      this.logger.error('发送库存预警通知异常:', error.message);
    }
  }

  /**
   * 自动确认发货：检查超过48小时未发货的订单，自动标记为已发货
   * 由定时任务调用（每10分钟执行一次）
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async autoConfirmShipment() {
    this.logger.log('开始执行自动确认发货检查...');

    try {
      const now = new Date().toISOString();

      // 1. 查询所有超过发货截止时间但仍未发货的订单
      const { data: pendingOrders, error: queryError } = await supabase
        .from('guest_return_gifts')
        .select('*')
        .eq('delivery_status', 'none') // 未发货状态
        .not('estimated_ship_time', 'is', null) // 有发货截止时间
        .lt('estimated_ship_time', now) // 已超过截止时间
        .eq('mall_claim_type', 'delivery'); // 选择邮寄配送

      if (queryError) {
        this.logger.error('查询待发货订单失败:', queryError);
        return { success: false, message: '查询失败', count: 0 };
      }

      if (!pendingOrders || pendingOrders.length === 0) {
        this.logger.log('没有需要自动发货的订单');
        return { success: true, message: '无待处理订单', count: 0 };
      }

      this.logger.log(`发现 ${pendingOrders.length} 个待自动发货的订单`);

      // 2. 批量更新为已发货状态
      const autoShipTime = now;
      const { data: updated, error: updateError } = await supabase
        .from('guest_return_gifts')
        .update({
          delivery_status: 'shipped', // 标记为已发货
          updated_at: autoShipTime,
        })
        .in(
          'id',
          pendingOrders.map((o) => o.id)
        )
        .select();

      if (updateError) {
        this.logger.error('批量更新发货状态失败:', updateError);
        return { success: false, message: '更新失败', count: 0 };
      }

      this.logger.log(`自动发货完成: ${updated?.length || 0} 个订单已标记为已发货`);

      // 3. 发送通知给嘉宾（异步，不阻塞）
      for (const order of pendingOrders) {
        this.sendAutoShipNotice(order).catch((err) => {
          this.logger.error(`发送自动发货通知失败: orderId=${order.id}`, err.message);
        });
      }

      return {
        success: true,
        message: `已自动发货 ${updated?.length || 0} 个订单`,
        count: updated?.length || 0,
      };
    } catch (error: any) {
      this.logger.error('自动确认发货异常:', error);
      return { success: false, message: error.message, count: 0 };
    }
  }

  /**
   * 发送自动发货通知给嘉宾
   */
  private async sendAutoShipNotice(order: any) {
    try {
      // 获取嘉宾的 openid 和 banquet_id（需要从 gift_record 关联查询）
      const { data: giftRecord } = await supabase
        .from('gift_records')
        .select('guest_openid, banquet_id')
        .eq('id', order.gift_record_id)
        .single();

      if (!giftRecord?.guest_openid) {
        this.logger.warn(`未找到嘉宾openid: orderId=${order.id}`);
        return;
      }

      // 查询关联的 banquet 名称
      let banquetName = '宴会';
      if (giftRecord.banquet_id) {
        const { data: banquetData } = await supabase
          .from('banquets')
          .select('name')
          .eq('id', giftRecord.banquet_id)
          .single();
        banquetName = banquetData?.name || '宴会';
      }

      // 发送订阅消息（复用发送收货信息提醒模板）
      await this.wechatSubscribeService.sendDeliveryReminder({
        openid: giftRecord.guest_openid,
        banquetName,
        productName: order.product_name || '商城礼品',
        claimedAt: new Date().toLocaleDateString('zh-CN'),
      });

      this.logger.log(`自动发货通知已发送: guest=${giftRecord.guest_openid}`);
    } catch (error: any) {
      this.logger.error('发送自动发货通知异常:', error.message);
    }
  }

  /**
   * 获取待发货订单列表（供管理后台或定时任务调用）
   */
  async getPendingShipOrders() {
    try {
      const { data, error } = await supabase
        .from('guest_return_gifts')
        .select(
          `
          *,
          gift_records!inner(
            guest_openid,
            banquets(name, host_openid)
          )
        `
        )
        .eq('delivery_status', 'pending')
        .eq('need_delivery', true)
        .not('recipient_name', 'is', null)
        .order('estimated_ship_time', { ascending: true });

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: data || [],
      };
    } catch (error: any) {
      this.logger.error('获取待发货订单失败:', error);
      return { success: false, message: error.message, data: [] };
    }
  }

  /**
   * 每日提醒：检查已领取但未填写收货信息的订单，发送订阅消息提醒
   * 由定时任务调用（每日早上10点执行一次）
   */
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async sendDeliveryReminderNotices() {
    this.logger.log('开始执行收货信息填写提醒检查...');

    try {
      const now = new Date();

      // 1. 查询所有已领取商城礼品但未填写收货信息的订单
      // 条件：mall_claim_type='delivery', recipient_name为空
      const { data: pendingRecords, error: queryError } = await supabase
        .from('guest_return_gifts')
        .select(
          `
          *,
          gift_records!inner(
            guest_openid,
            banquets(name, event_time)
          )
        `
        )
        .eq('mall_claim_type', 'delivery')
        .or(`recipient_name.is.null,recipient_phone.is.null,recipient_address.is.null`)
        .order('created_at', { ascending: true });

      if (queryError) {
        this.logger.error('查询未填写收货信息记录失败:', queryError);
        return { success: false, message: '查询失败', count: 0 };
      }

      if (!pendingRecords || pendingRecords.length === 0) {
        this.logger.log('没有需要提醒的记录');
        return { success: true, message: '无待提醒记录', count: 0 };
      }

      this.logger.log(`发现 ${pendingRecords.length} 条未填写收货信息的记录`);

      let sentCount = 0;
      const nowTimestamp = now.toISOString();

      // 2. 过滤并发送提醒
      for (const record of pendingRecords) {
        const guestOpenid = record.gift_records?.guest_openid;
        const banquetName = record.gift_records?.banquets?.name || '宴会';
        const productName = record.mall_product_name || '商城礼品';
        const claimedAt = record.created_at;

        if (!guestOpenid) {
          this.logger.warn(`未找到嘉宾openid: recordId=${record.id}`);
          continue;
        }

        // 检查是否需要发送提醒（每天最多发送一条）
        const lastReminder = record.last_reminder_at;
        if (lastReminder) {
          const lastReminderDate = new Date(lastReminder);
          const hoursSinceLastReminder =
            (now.getTime() - lastReminderDate.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastReminder < 24) {
            this.logger.log(`跳过提醒（24小时内已发送）: recordId=${record.id}`);
            continue;
          }
        }

        // 发送订阅消息提醒
        const result = await this.wechatSubscribeService.sendDeliveryReminder({
          openid: guestOpenid,
          banquetName,
          productName,
          claimedAt,
        });

        if (result.success) {
          sentCount++;
          this.logger.log(`提醒发送成功: openid=${guestOpenid}, recordId=${record.id}`);
        } else {
          this.logger.warn(`提醒发送失败: openid=${guestOpenid}, recordId=${record.id}`);
        }

        // 避免发送过快，稍微延迟一下
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      this.logger.log(`收货信息填写提醒完成: 发送 ${sentCount} 条`);

      return {
        success: true,
        message: `已发送 ${sentCount} 条提醒`,
        count: sentCount,
      };
    } catch (error: any) {
      this.logger.error('发送收货信息填写提醒异常:', error);
      return { success: false, message: error.message, count: 0 };
    }
  }

  /**
   * 获取未填写收货信息的订单列表（供主办方查看）
   */
  async getPendingDeliveryRecords(banquetId?: string) {
    try {
      let query = supabase
        .from('guest_return_gifts')
        .select(
          `
          *,
          gift_records!inner(
            guest_openid,
            banquets(name, host_openid)
          )
        `
        )
        .eq('mall_claim_type', 'delivery')
        .or(`recipient_name.is.null,recipient_phone.is.null,recipient_address.is.null`);

      if (banquetId) {
        query = query.eq('gift_records.banquet_id', banquetId);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: data || [],
      };
    } catch (error: any) {
      this.logger.error('获取未填写收货信息记录失败:', error);
      return { success: false, message: error.message, data: [] };
    }
  }

  /**
   * 更新收货信息（嘉宾补充填写）
   */
  async updateDeliveryInfo(
    returnGiftId: string,
    recipientName: string,
    recipientPhone: string,
    recipientAddress: string
  ) {
    this.logger.log(`更新收货信息: returnGiftId=${returnGiftId}`);

    try {
      // 1. 验证记录存在
      const { data: existing, error: queryError } = await supabase
        .from('guest_return_gifts')
        .select('*')
        .eq('id', returnGiftId)
        .single();

      if (queryError || !existing) {
        return { success: false, message: '记录不存在', data: null };
      }

      // 2. 更新收货信息
      const { data, error: updateError } = await supabase
        .from('guest_return_gifts')
        .update({
          recipient_name: recipientName,
          recipient_phone: recipientPhone,
          recipient_address: recipientAddress,
          // 重置提醒状态
          delivery_reminder_sent: false,
          last_reminder_at: null,
        })
        .eq('id', returnGiftId)
        .select()
        .single();

      if (updateError) {
        this.logger.error('更新收货信息失败:', updateError);
        return { success: false, message: '更新失败', data: null };
      }

      this.logger.log(`收货信息更新成功: returnGiftId=${returnGiftId}`);

      return { success: true, message: '更新成功', data };
    } catch (error: any) {
      this.logger.error('更新收货信息异常:', error);
      return { success: false, message: error.message, data: null };
    }
  }
}
