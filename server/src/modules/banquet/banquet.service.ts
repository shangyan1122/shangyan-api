import { Injectable, Logger } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { AiService } from '../ai/ai.service';
import { WechatConfigService } from '@/common/services/wechat-config.service';

@Injectable()
export class BanquetService {
  private readonly logger = new Logger(BanquetService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly wechatConfig: WechatConfigService
  ) {}

  async getBanquets(hostOpenid: string, status?: string) {
    const client = getSupabaseClient();

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

  async getBanquetById(id: string) {
    const client = getSupabaseClient();
    const { data, error } = await client.from('banquets').select('*').eq('id', id).single();

    if (error) {
      console.error('获取宴会详情失败:', error);
      throw new Error(error.message);
    }

    return data;
  }

  async createBanquet(banquetData: any) {
    const client = getSupabaseClient();

    // 生成AI欢迎页和感谢页内容
    let aiWelcomePage = '';
    let aiThankPage = '';

    this.logger.log(`开始创建宴会: ${banquetData.name}, 类型: ${banquetData.type}`);

    // 获取主角照片
    const photos = banquetData.photos || [];
    const coverImage =
      banquetData.coverImage || banquetData.cover_image || (photos.length > 0 ? photos[0] : null);

    this.logger.log(`照片数量: ${photos.length}, 封面图片: ${coverImage ? '已设置' : '未设置'}`);

    try {
      // 使用主角照片生成欢迎词
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

      // 使用主角照片生成感谢词
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
    } catch (error: any) {
      this.logger.warn(`AI内容生成失败: ${error.message}，使用默认内容`);
      // 使用默认内容
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

    // 如果有回礼配置，自动创建 return_gift_settings 记录
    const returnGiftConfig = banquetData.returnGiftConfig || banquetData.return_gift_config;
    if (
      returnGiftConfig &&
      (returnGiftConfig.red_packet_enabled ||
        returnGiftConfig.mall_gift_enabled ||
        returnGiftConfig.onsite_gift_enabled)
    ) {
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
        } else {
          this.logger.log('回礼设置记录创建成功');
        }
      } catch (err: any) {
        this.logger.warn(`创建回礼设置记录异常: ${err.message}`);
      }
    }

    // 自动生成二维码
    try {
      const qrcodeData = await this.getBanquetQrcode(data.id);
      data.qr_code = qrcodeData.qrcodeUrl || null;
      data.qr_code_page = qrcodeData.page || null;
    } catch (err: any) {
      this.logger.warn(`生成二维码失败: ${err.message}`);
    }

    return data;
  }

  /**
   * 获取宴会二维码
   * 用于嘉宾扫码进入随礼页面
   *
   * scene参数说明：
   * - 微信限制scene最长32字符
   * - UUID格式(36字符)会被自动转换为32字符格式（去掉横线）
   * - 前端scan页面需要将32字符还原为UUID格式
   */
  async getBanquetQrcode(banquetId: string) {
    this.logger.log(`获取宴会二维码: ${banquetId}`);

    try {
      const result = await this.wechatConfig.generateMiniProgramCode(
        banquetId,
        'pages/scan/index',
        430
      );

      // 返回编码后的scene（32字符格式）
      const encodedScene = result.scene || banquetId.replace(/-/g, '');

      return {
        qrcodeUrl: result.base64,
        page: `pages/scan/index?id=${banquetId}`,
        scene: encodedScene,
        sceneFormat: 'short', // 标识scene是32字符格式
        originalId: banquetId, // 保留原始UUID
        tip: this.wechatConfig.isConfigured()
          ? undefined
          : '请配置微信小程序 AppID 和 AppSecret 后生成真实二维码',
      };
    } catch (error: any) {
      this.logger.error(`获取宴会二维码失败: ${error.message}`);
      return {
        qrcodeUrl: '',
        page: `pages/scan/index?id=${banquetId}`,
        scene: banquetId.replace(/-/g, ''),
        error: error.message,
      };
    }
  }

  /**
   * 更新宴会
   */
  async updateBanquet(id: string, data: any) {
    const client = getSupabaseClient();
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

  /**
   * 删除宴会
   */
  async deleteBanquet(id: string) {
    const client = getSupabaseClient();
    const { error } = await client.from('banquets').delete().eq('id', id);

    if (error) {
      this.logger.error(`删除宴会失败: ${error.message}`);
      throw new Error(error.message);
    }
  }
}
