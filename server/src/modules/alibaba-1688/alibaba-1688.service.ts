import { Injectable, Logger } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import crypto from 'crypto';

const supabase = getSupabaseClient();

/**
 * 1688配置接口
 */
export interface Alibaba1688Config {
  id: string;
  app_key: string;
  app_secret: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  dropship_enabled: boolean;
  default_markup_rate: number;
  status: 'active' | 'inactive' | 'expired';
  created_at: string;
  updated_at: string;
}

/**
 * 代发订单接口
 */
export interface DropshipOrder {
  id: string;
  banquet_id: string;
  return_gift_id: string;
  guest_openid: string;
  alibaba_order_id?: string;
  alibaba_order_status?: string;
  product_id: string;
  sku_id?: string;
  product_name?: string;
  product_image?: string;
  quantity: number;
  supply_cost_price: number;
  sale_price: number;
  profit?: number;
  recipient_name?: string;
  recipient_phone?: string;
  recipient_province?: string;
  recipient_city?: string;
  recipient_district?: string;
  recipient_address?: string;
  express_company?: string;
  express_no?: string;
  shipped_at?: string;
  delivered_at?: string;
  status: 'pending' | 'ordered' | 'shipped' | 'delivered' | 'cancelled' | 'failed';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 代发请求参数
 */
export interface CreateDropshipOrderParams {
  banquetId: string;
  returnGiftId: string;
  guestOpenid: string;
  productId: string;
  skuId?: string;
  productName: string;
  productImage?: string;
  supplyCostPrice: number;
  salePrice: number;
  quantity?: number;
  recipientName: string;
  recipientPhone: string;
  recipientProvince: string;
  recipientCity: string;
  recipientDistrict: string;
  recipientAddress: string;
}

/**
 * 1688一件代发服务
 *
 * 功能说明：
 * 1. 管理1688 API配置
 * 2. 代发订单创建和管理
 * 3. 物流信息同步
 * 4. 价格计算和利润统计
 *
 * 使用场景：
 * - 嘉宾选择"商城邮寄"类礼品时自动调用
 * - 系统自动将收货信息传给1688
 * - 1688商家直接发货给嘉宾
 * - 物流单号自动回写
 */
@Injectable()
export class Alibaba1688Service {
  private readonly logger = new Logger(Alibaba1688Service.name);

  // 1688 API 基础URL（预留，后期对接时使用）
  private readonly ALIBABA_API_BASE_URL = 'https://gw.open.1688.com/openapi';
  private readonly ALIBABA_API_VERSION = '1.0';

  constructor() {}

  /**
   * 获取1688配置
   */
  async getConfig(): Promise<Alibaba1688Config | null> {
    const { data, error } = await supabase
      .from('alibaba_1688_config')
      .select('*')
      .eq('status', 'active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      this.logger.error('获取1688配置失败:', error);
      throw new Error('获取配置失败');
    }

    return data;
  }

  /**
   * 检查代发是否启用
   */
  async isDropshipEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config?.dropship_enabled === true && config?.status === 'active';
  }

  /**
   * 保存1688配置
   */
  async saveConfig(configData: Partial<Alibaba1688Config>): Promise<Alibaba1688Config> {
    this.logger.log('保存1688配置');

    // 先将所有现有配置设为inactive
    await supabase
      .from('alibaba_1688_config')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('status', 'active');

    // 创建新配置
    const { data, error } = await supabase
      .from('alibaba_1688_config')
      .insert({
        ...configData,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      this.logger.error('保存1688配置失败:', error);
      throw new Error('保存配置失败');
    }

    return data;
  }

  /**
   * 更新配置
   */
  async updateConfig(
    id: string,
    configData: Partial<Alibaba1688Config>
  ): Promise<Alibaba1688Config> {
    const { data, error } = await supabase
      .from('alibaba_1688_config')
      .update({
        ...configData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error('更新1688配置失败:', error);
      throw new Error('更新配置失败');
    }

    return data;
  }

  /**
   * 切换代发开关
   */
  async toggleDropship(enabled: boolean): Promise<void> {
    const config = await this.getConfig();
    if (!config) {
      throw new Error('请先配置1688 API密钥');
    }

    await supabase
      .from('alibaba_1688_config')
      .update({
        dropship_enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', config.id);

    this.logger.log(`代发开关已${enabled ? '开启' : '关闭'}`);
  }

  /**
   * 计算售价
   * 根据供货成本价和加价倍率计算售价
   */
  calculateSalePrice(supplyCostPrice: number, markupRate?: number): number {
    const config = this.getConfig();
    const rate = markupRate || 1.2; // 默认加价20%
    return Math.round(supplyCostPrice * rate);
  }

  /**
   * 创建代发订单（预留接口）
   *
   * 实际对接1688 API时需要实现：
   * 1. 调用1688代发下单API
   * 2. 传入收货人信息
   * 3. 获取1688订单ID
   * 4. 保存订单记录
   */
  async createDropshipOrder(params: CreateDropshipOrderParams): Promise<DropshipOrder> {
    this.logger.log(`创建代发订单: banquetId=${params.banquetId}, productId=${params.productId}`);

    // 检查代发是否启用
    const config = await this.getConfig();
    if (!config || !config.dropship_enabled) {
      throw new Error('1688代发未启用，请先在后台配置');
    }

    // 计算利润
    const profit = params.salePrice - params.supplyCostPrice;

    // 创建订单记录
    const orderData: Partial<DropshipOrder> = {
      banquet_id: params.banquetId,
      return_gift_id: params.returnGiftId,
      guest_openid: params.guestOpenid,
      product_id: params.productId,
      sku_id: params.skuId,
      product_name: params.productName,
      product_image: params.productImage,
      quantity: params.quantity || 1,
      supply_cost_price: params.supplyCostPrice,
      sale_price: params.salePrice,
      profit,
      recipient_name: params.recipientName,
      recipient_phone: params.recipientPhone,
      recipient_province: params.recipientProvince,
      recipient_city: params.recipientCity,
      recipient_district: params.recipientDistrict,
      recipient_address: params.recipientAddress,
      status: 'pending',
    };

    const { data: order, error } = await supabase
      .from('alibaba_1688_dropship_orders')
      .insert(orderData)
      .select()
      .single();

    if (error) {
      this.logger.error('创建代发订单失败:', error);
      throw new Error('创建订单失败');
    }

    // 记录日志
    await this.logOperation({
      dropship_order_id: order.id,
      return_gift_id: params.returnGiftId,
      log_type: 'order_created',
      log_content: '代发订单创建成功，等待提交到1688',
    });

    // 调用1688 API下单（预留）
    try {
      await this.submitOrderTo1688(order);
    } catch (err: any) {
      // 如果1688下单失败，更新订单状态
      await supabase
        .from('alibaba_1688_dropship_orders')
        .update({
          status: 'failed',
          error_message: err.message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      throw err;
    }

    return order;
  }

  /**
   * 提交订单到1688（预留实现）
   *
   * 实际对接时需要：
   * 1. 构建API签名
   * 2. 调用1688代发下单API
   * 3. 解析返回结果
   * 4. 更新订单状态
   */
  private async submitOrderTo1688(order: DropshipOrder): Promise<void> {
    this.logger.log(`提交订单到1688: orderId=${order.id}`);

    const config = await this.getConfig();
    if (!config || !config.access_token) {
      throw new Error('1688 API未授权，请先配置AccessToken');
    }

    // 记录API调用日志（预留）
    await this.logOperation({
      dropship_order_id: order.id,
      log_type: 'api_call',
      log_content: '调用1688代发下单API（预留）',
      api_endpoint: `${this.ALIBABA_API_BASE_URL}/param2/1.0/order/dropship/submit`,
      api_request: JSON.stringify({
        productId: order.product_id,
        skuId: order.sku_id,
        quantity: order.quantity,
        recipient: {
          name: order.recipient_name,
          phone: order.recipient_phone,
          province: order.recipient_province,
          city: order.recipient_city,
          district: order.recipient_district,
          address: order.recipient_address,
        },
      }),
    });

    // TODO: 实际调用1688 API
    // 目前为预留模式，后期填写密钥后启用
    // const response = await this.call1688Api('order.dropship.submit', params)

    // 模拟成功响应
    const mockAlibabaOrderId = `1688_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 更新订单状态
    await supabase
      .from('alibaba_1688_dropship_orders')
      .update({
        alibaba_order_id: mockAlibabaOrderId,
        alibaba_order_status: 'WAIT_SELLER_SEND_GOODS',
        status: 'ordered',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    // 更新回礼记录
    await supabase
      .from('guest_return_gifts')
      .update({
        alibaba_1688_order_id: mockAlibabaOrderId,
        delivery_status: 'shipped',
        shipped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.return_gift_id);

    this.logger.log(`订单提交成功: alibabaOrderId=${mockAlibabaOrderId}`);
  }

  /**
   * 同步物流信息（预留实现）
   */
  async syncLogistics(orderId: string): Promise<void> {
    this.logger.log(`同步物流信息: orderId=${orderId}`);

    const { data: order, error } = await supabase
      .from('alibaba_1688_dropship_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      throw new Error('订单不存在');
    }

    if (!order.alibaba_order_id) {
      throw new Error('1688订单ID不存在');
    }

    // TODO: 实际调用1688 API获取物流信息
    // const response = await this.call1688Api('logistics.info.get', { orderId: order.alibaba_order_id })

    // 记录同步日志
    await this.logOperation({
      dropship_order_id: orderId,
      log_type: 'logistics_sync',
      log_content: '同步物流信息（预留）',
    });

    this.logger.log('物流信息同步完成');
  }

  /**
   * 批量同步所有待发货订单的物流信息
   */
  async syncAllPendingLogistics(): Promise<void> {
    this.logger.log('批量同步物流信息');

    const { data: orders, error } = await supabase
      .from('alibaba_1688_dropship_orders')
      .select('id')
      .in('status', ['ordered', 'shipped']);

    if (error) {
      this.logger.error('查询订单失败:', error);
      return;
    }

    for (const order of orders || []) {
      try {
        await this.syncLogistics(order.id);
      } catch (err: any) {
        this.logger.error(`同步订单${order.id}物流失败:`, err);
      }
    }
  }

  /**
   * 获取代发订单列表
   */
  async getDropshipOrders(filters?: {
    banquetId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: DropshipOrder[]; total: number }> {
    let query = supabase.from('alibaba_1688_dropship_orders').select('*', { count: 'exact' });

    if (filters?.banquetId) {
      query = query.eq('banquet_id', filters.banquetId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;

    query = query.order('created_at', { ascending: false });
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      this.logger.error('获取代发订单列表失败:', error);
      throw new Error('获取订单列表失败');
    }

    return {
      orders: data || [],
      total: count || 0,
    };
  }

  /**
   * 获取代发订单详情
   */
  async getDropshipOrderById(orderId: string): Promise<DropshipOrder | null> {
    const { data, error } = await supabase
      .from('alibaba_1688_dropship_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      this.logger.error('获取代发订单详情失败:', error);
      throw new Error('获取订单详情失败');
    }

    return data;
  }

  /**
   * 记录操作日志
   */
  private async logOperation(params: {
    dropship_order_id?: string;
    return_gift_id?: string;
    log_type: string;
    log_content?: string;
    api_endpoint?: string;
    api_request?: string;
    api_response?: string;
    api_status_code?: number;
  }): Promise<void> {
    try {
      await supabase.from('alibaba_1688_dropship_logs').insert({
        ...params,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('记录日志失败:', error);
    }
  }

  /**
   * 生成API签名（预留）
   */
  private generateSignature(params: Record<string, any>, appSecret: string): string {
    const sortedKeys = Object.keys(params).sort();
    const signString = sortedKeys.map((key) => `${key}${params[key]}`).join('');
    return crypto.createHmac('sha256', appSecret).update(signString).digest('hex').toUpperCase();
  }

  /**
   * 调用1688 API（预留）
   */
  private async call1688Api(method: string, params: Record<string, any>): Promise<any> {
    const config = await this.getConfig();
    if (!config) {
      throw new Error('1688配置不存在');
    }

    // 构建请求参数
    const requestParams = {
      method,
      app_key: config.app_key,
      timestamp: new Date().toISOString(),
      format: 'json',
      v: this.ALIBABA_API_VERSION,
      sign_method: 'hmac_sha256',
      access_token: config.access_token,
      ...params,
    };

    // 生成签名
    const sign = this.generateSignature(requestParams, config.app_secret);
    const signedParams = { ...requestParams, sign };

    // TODO: 实际HTTP请求
    // const response = await fetch(this.ALIBABA_API_BASE_URL, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    //   body: new URLSearchParams(signedParams).toString()
    // })
    // return response.json()

    this.logger.log(`调用1688 API: method=${method}（预留）`);
    return { success: true, mock: true };
  }

  /**
   * 获取代发统计
   */
  async getDropshipStats(banquetId?: string): Promise<{
    totalOrders: number;
    pendingOrders: number;
    shippedOrders: number;
    deliveredOrders: number;
    failedOrders: number;
    totalProfit: number;
  }> {
    let query = supabase.from('alibaba_1688_dropship_orders').select('status, profit');

    if (banquetId) {
      // Supabase 不支持直接在 select 中过滤，需要用 RPC 或分开查询
      const { data: orders, error } = await supabase
        .from('alibaba_1688_dropship_orders')
        .select('status, profit')
        .eq('banquet_id', banquetId);

      if (error) {
        throw new Error('获取统计失败');
      }

      const stats = {
        totalOrders: orders?.length || 0,
        pendingOrders: orders?.filter((o) => o.status === 'pending').length || 0,
        shippedOrders: orders?.filter((o) => o.status === 'shipped').length || 0,
        deliveredOrders: orders?.filter((o) => o.status === 'delivered').length || 0,
        failedOrders: orders?.filter((o) => o.status === 'failed').length || 0,
        totalProfit: orders?.reduce((sum, o) => sum + (o.profit || 0), 0) || 0,
      };
      stats.pendingOrders += orders?.filter((o) => o.status === 'ordered').length || 0;

      return stats;
    }

    // 全局统计
    const { data: orders, error } = await supabase
      .from('alibaba_1688_dropship_orders')
      .select('status, profit');

    if (error) {
      throw new Error('获取统计失败');
    }

    return {
      totalOrders: orders?.length || 0,
      pendingOrders:
        orders?.filter((o) => o.status === 'pending' || o.status === 'ordered').length || 0,
      shippedOrders: orders?.filter((o) => o.status === 'shipped').length || 0,
      deliveredOrders: orders?.filter((o) => o.status === 'delivered').length || 0,
      failedOrders: orders?.filter((o) => o.status === 'failed').length || 0,
      totalProfit: orders?.reduce((sum, o) => sum + (o.profit || 0), 0) || 0,
    };
  }
}
