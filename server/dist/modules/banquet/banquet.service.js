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
var BanquetService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BanquetService = void 0;
const common_1 = require("@nestjs/common");
const supabase_client_1 = require("../../storage/database/supabase-client");
const ai_service_1 = require("../ai/ai.service");
const wechat_config_service_1 = require("../../common/services/wechat-config.service");
let BanquetService = BanquetService_1 = class BanquetService {
    constructor(aiService, wechatConfig) {
        this.aiService = aiService;
        this.wechatConfig = wechatConfig;
        this.logger = new common_1.Logger(BanquetService_1.name);
    }
    async getBanquets(hostOpenid, status) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        let query = client.from('banquets').select('*').eq('host_openid', hostOpenid);
        if (status) {
            query = query.eq('status', status);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) {
            console.error('获取宴会列表失败:', error);
            throw new Error(error.message);
        }
        return data;
    }
    async getBanquetById(id) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data, error } = await client.from('banquets').select('*').eq('id', id).single();
        if (error) {
            console.error('获取宴会详情失败:', error);
            throw new Error(error.message);
        }
        return data;
    }
    async createBanquet(banquetData) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        let aiWelcomePage = '';
        let aiThankPage = '';
        this.logger.log(`开始创建宴会: ${banquetData.name}, 类型: ${banquetData.type}`);
        const photos = banquetData.photos || [];
        const coverImage = banquetData.coverImage || banquetData.cover_image || (photos.length > 0 ? photos[0] : null);
        this.logger.log(`照片数量: ${photos.length}, 封面图片: ${coverImage ? '已设置' : '未设置'}`);
        try {
            this.logger.log('正在生成欢迎词...');
            const welcomeResult = await this.aiService.generateWelcomeWithPhotos({
                banquetType: banquetData.type,
                banquetName: banquetData.name,
                hostName: banquetData.hostName || banquetData.name.split('的')[0] || '',
                photos: photos,
            });
            if (welcomeResult && welcomeResult.data) {
                aiWelcomePage = welcomeResult.data.welcome || '';
                this.logger.log(`欢迎词生成成功: ${aiWelcomePage}`);
            }
            this.logger.log('正在生成感谢词...');
            const thanksResult = await this.aiService.generateThanksWithPhotos({
                banquetType: banquetData.type,
                banquetName: banquetData.name,
                hostName: banquetData.hostName || banquetData.name.split('的')[0] || '',
                photos: photos,
            });
            if (thanksResult && thanksResult.data) {
                aiThankPage = thanksResult.data.thanks || '';
                this.logger.log(`感谢词生成成功: ${aiThankPage}`);
            }
        }
        catch (error) {
            this.logger.warn(`AI内容生成失败: ${error.message}，使用默认内容`);
            aiWelcomePage = `欢迎莅临${banquetData.name}！`;
            aiThankPage = `感谢您参加${banquetData.name}！`;
        }
        const dataToInsert = {
            host_openid: banquetData.host_openid,
            type: banquetData.type,
            name: banquetData.name,
            host_nickname: banquetData.host_nickname || null,
            event_time: banquetData.eventTime || banquetData.event_time,
            location: banquetData.location,
            photos: banquetData.photos || [],
            photo_keys: banquetData.photoKeys || banquetData.photo_keys || [],
            cover_image: banquetData.coverImage || banquetData.cover_image || null,
            return_gift_config: banquetData.returnGiftConfig || banquetData.return_gift_config || null,
            return_red_packet: banquetData.returnRedPacket || banquetData.return_red_packet || 0,
            return_gift_ids: banquetData.returnGiftIds || banquetData.return_gift_ids || [],
            description: banquetData.description || null,
            staff_wechat: banquetData.staff_wechat || null,
            status: 'active',
            ai_welcome_page: aiWelcomePage,
            ai_thank_page: aiThankPage,
        };
        const { data, error } = await client.from('banquets').insert(dataToInsert).select().single();
        if (error) {
            this.logger.error(`创建宴会失败: ${JSON.stringify(error)}`);
            throw new Error(error.message);
        }
        this.logger.log(`宴会创建成功: id=${data.id}`);
        const returnGiftConfig = banquetData.returnGiftConfig || banquetData.return_gift_config;
        if (returnGiftConfig &&
            (returnGiftConfig.red_packet_enabled ||
                returnGiftConfig.mall_gift_enabled ||
                returnGiftConfig.onsite_gift_enabled)) {
            try {
                this.logger.log('自动创建回礼设置记录...');
                const { error: settingsError } = await client.from('return_gift_settings').insert({
                    banquet_id: data.id,
                    red_packet_enabled: returnGiftConfig.red_packet_enabled || false,
                    red_packet_amount: returnGiftConfig.red_packet_amount || 0,
                    mall_gift_enabled: returnGiftConfig.mall_gift_enabled || false,
                    mall_gift_items: returnGiftConfig.mall_gift_items || [],
                    onsite_gift_enabled: returnGiftConfig.onsite_gift_enabled || false,
                    onsite_gift_items: returnGiftConfig.onsite_gift_items || [],
                    gift_claim_mode: 'all',
                    total_budget: returnGiftConfig.total_budget || 0,
                });
                if (settingsError) {
                    this.logger.warn(`创建回礼设置记录失败: ${settingsError.message}`);
                }
                else {
                    this.logger.log('回礼设置记录创建成功');
                }
            }
            catch (err) {
                this.logger.warn(`创建回礼设置记录异常: ${err.message}`);
            }
        }
        try {
            const qrcodeData = await this.getBanquetQrcode(data.id);
            data.qr_code = qrcodeData.qrcodeUrl || null;
            data.qr_code_page = qrcodeData.page || null;
        }
        catch (err) {
            this.logger.warn(`生成二维码失败: ${err.message}`);
        }
        return data;
    }
    async getBanquetQrcode(banquetId) {
        this.logger.log(`获取宴会二维码: ${banquetId}`);
        try {
            const result = await this.wechatConfig.generateMiniProgramCode(banquetId, 'pages/scan/index', 430);
            const encodedScene = result.scene || banquetId.replace(/-/g, '');
            return {
                qrcodeUrl: result.base64,
                page: `pages/scan/index?id=${banquetId}`,
                scene: encodedScene,
                sceneFormat: 'short',
                originalId: banquetId,
                tip: this.wechatConfig.isConfigured()
                    ? undefined
                    : '请配置微信小程序 AppID 和 AppSecret 后生成真实二维码',
            };
        }
        catch (error) {
            this.logger.error(`获取宴会二维码失败: ${error.message}`);
            return {
                qrcodeUrl: '',
                page: `pages/scan/index?id=${banquetId}`,
                scene: banquetId.replace(/-/g, ''),
                error: error.message,
            };
        }
    }
    async updateBanquet(id, data) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { error } = await client
            .from('banquets')
            .update({
            ...data,
            updated_at: new Date().toISOString(),
        })
            .eq('id', id);
        if (error) {
            this.logger.error(`更新宴会失败: ${error.message}`);
            throw new Error(error.message);
        }
    }
    async deleteBanquet(id) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { error } = await client.from('banquets').delete().eq('id', id);
        if (error) {
            this.logger.error(`删除宴会失败: ${error.message}`);
            throw new Error(error.message);
        }
    }
};
exports.BanquetService = BanquetService;
exports.BanquetService = BanquetService = BanquetService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [ai_service_1.AiService,
        wechat_config_service_1.WechatConfigService])
], BanquetService);
//# sourceMappingURL=banquet.service.js.map