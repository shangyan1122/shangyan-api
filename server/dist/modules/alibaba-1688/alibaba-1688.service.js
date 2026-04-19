"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var Alibaba1688Service_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Alibaba1688Service = void 0;
const common_1 = require("@nestjs/common");
const supabase_client_1 = require("../../storage/database/supabase-client");
const crypto_1 = __importDefault(require("crypto"));
const supabase = (0, supabase_client_1.getSupabaseClient)();
let Alibaba1688Service = Alibaba1688Service_1 = class Alibaba1688Service {
    constructor() {
        this.logger = new common_1.Logger(Alibaba1688Service_1.name);
        this.ALIBABA_API_BASE_URL = 'https://gw.open.1688.com/openapi';
        this.ALIBABA_API_VERSION = '1.0';
    }
    async getConfig() {
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
    async isDropshipEnabled() {
        const config = await this.getConfig();
        return config?.dropship_enabled === true && config?.status === 'active';
    }
    async saveConfig(configData) {
        this.logger.log('保存1688配置');
        await supabase
            .from('alibaba_1688_config')
            .update({ status: 'inactive', updated_at: new Date().toISOString() })
            .eq('status', 'active');
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
    async updateConfig(id, configData) {
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
    async toggleDropship(enabled) {
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
    calculateSalePrice(supplyCostPrice, markupRate) {
        const config = this.getConfig();
        const rate = markupRate || 1.2;
        return Math.round(supplyCostPrice * rate);
    }
    async createDropshipOrder(params) {
        this.logger.log(`创建代发订单: banquetId=${params.banquetId}, productId=${params.productId}`);
        const config = await this.getConfig();
        if (!config || !config.dropship_enabled) {
            throw new Error('1688代发未启用，请先在后台配置');
        }
        const profit = params.salePrice - params.supplyCostPrice;
        const orderData = {
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
        await this.logOperation({
            dropship_order_id: order.id,
            return_gift_id: params.returnGiftId,
            log_type: 'order_created',
            log_content: '代发订单创建成功，等待提交到1688',
        });
        try {
            await this.submitOrderTo1688(order);
        }
        catch (err) {
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
    async submitOrderTo1688(order) {
        this.logger.log(`提交订单到1688: orderId=${order.id}`);
        const config = await this.getConfig();
        if (!config || !config.access_token) {
            throw new Error('1688 API未授权，请先配置AccessToken');
        }
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
        const mockAlibabaOrderId = `1688_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await supabase
            .from('alibaba_1688_dropship_orders')
            .update({
            alibaba_order_id: mockAlibabaOrderId,
            alibaba_order_status: 'WAIT_SELLER_SEND_GOODS',
            status: 'ordered',
            updated_at: new Date().toISOString(),
        })
            .eq('id', order.id);
        await supabase
            .from('guest_return_gifts')
            .update({
            alibaba_1688_order_id: mockAlibabaOrderId,
            dropship_status: 'ordered',
            dropship_ordered_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
            .eq('id', order.return_gift_id);
        this.logger.log(`订单提交成功: alibabaOrderId=${mockAlibabaOrderId}`);
    }
    async syncLogistics(orderId) {
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
        await this.logOperation({
            dropship_order_id: orderId,
            log_type: 'logistics_sync',
            log_content: '同步物流信息（预留）',
        });
        this.logger.log('物流信息同步完成');
    }
    async syncAllPendingLogistics() {
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
            }
            catch (err) {
                this.logger.error(`同步订单${order.id}物流失败:`, err);
            }
        }
    }
    async getDropshipOrders(filters) {
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
    async getDropshipOrderById(orderId) {
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
    async logOperation(params) {
        try {
            await supabase.from('alibaba_1688_dropship_logs').insert({
                ...params,
                created_at: new Date().toISOString(),
            });
        }
        catch (error) {
            this.logger.error('记录日志失败:', error);
        }
    }
    generateSignature(params, appSecret) {
        const sortedKeys = Object.keys(params).sort();
        const signString = sortedKeys.map((key) => `${key}${params[key]}`).join('');
        return crypto_1.default.createHmac('sha256', appSecret).update(signString).digest('hex').toUpperCase();
    }
    async call1688Api(method, params) {
        const config = await this.getConfig();
        if (!config) {
            throw new Error('1688配置不存在');
        }
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
        const sign = this.generateSignature(requestParams, config.app_secret);
        const signedParams = { ...requestParams, sign };
        this.logger.log(`调用1688 API: method=${method}（预留）`);
        return { success: true, mock: true };
    }
    async getDropshipStats(banquetId) {
        let query = supabase.from('alibaba_1688_dropship_orders').select('status, profit');
        if (banquetId) {
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
        const { data: orders, error } = await supabase
            .from('alibaba_1688_dropship_orders')
            .select('status, profit');
        if (error) {
            throw new Error('获取统计失败');
        }
        return {
            totalOrders: orders?.length || 0,
            pendingOrders: orders?.filter((o) => o.status === 'pending' || o.status === 'ordered').length || 0,
            shippedOrders: orders?.filter((o) => o.status === 'shipped').length || 0,
            deliveredOrders: orders?.filter((o) => o.status === 'delivered').length || 0,
            failedOrders: orders?.filter((o) => o.status === 'failed').length || 0,
            totalProfit: orders?.reduce((sum, o) => sum + (o.profit || 0), 0) || 0,
        };
    }
};
exports.Alibaba1688Service = Alibaba1688Service;
exports.Alibaba1688Service = Alibaba1688Service = Alibaba1688Service_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], Alibaba1688Service);
//# sourceMappingURL=alibaba-1688.service.js.map