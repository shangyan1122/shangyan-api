import { Injectable, Logger } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { AiService } from '../ai/ai.service';
import { WechatConfigService } from '@/common/services/wechat-config.service';

/**
 * 宴会服务
 *
 * 数据库字段映射（banquets表）：
 * - openid → 宴会主人openid
 * - banquet_type → 宴会类型
 * - banquet_name → 宴会名称
 * - host_name → 主人姓名
 * - host_phone → 主人电话
 * - banquet_date / banquet_time → 宴会日期/时间
 * - venue_name / venue_address → 场地信息
 * - protagonist_name / protagonist_photos → 主角信息
 * - welcome_page_config / thank_page_config → AI页面配置
 * - ai_page_enabled → 是否启用AI页面
 */
@Injectable()
export class BanquetService {
  private readonly logger = new Logger(BanquetService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly wechatConfig: WechatConfigService
  ) {}

  async getBanquets(openid: string, status?: string) {
    const client = getSupabaseClient();

    let query = client.from('banquets').select('*').eq('openid', openid);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('获取宴会列表失败:', error);
      throw new Error(error.message);
    }

    // 转换字段名为前端兼容格式
    return (data || []).map((item: any) => this.mapDbToApi(item));
  }

  async getBanquetById(id: string) {
    const client = getSupabaseClient();
    const { data, error } = await client.from('banquets').select('*').eq('id', id).single();

    if (error) {
      console.error('获取宴会详情失败:', error);
      throw new Error(error.message);
    }

    return this.mapDbToApi(data);
  }

  async createBanquet(banquetData: any) {
    const client = getSupabaseClient();

    // 生成AI欢迎页和感谢页内容
    let aiWelcomePage = '';
    let aiThankPage = '';

    this.logger.log(`开始创建宴会: ${banquetData.name}, 类型: ${banquetData.type}`);

    // 获取主角照片
    const photos = banquetData.photos || [];

    this.logger.log(`照片数量: ${photos.length}`);

    try {
      // 使用主角照片生成欢迎词
      this.logger.log('正在生成欢迎词...');
      const welcomeResult = await this.aiService.generateWelcomeWithPhotos({
        banquetType: banquetData.type,
        banquetName: banquetData.name,
        hostName: banquetData.hostName || banquetData.name?.split('的')[0] || '',
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
        hostName: banquetData.hostName || banquetData.name?.split('的')[0] || '',
        photos: photos,
      });
      if (thanksResult && thanksResult.data) {
        aiThankPage = thanksResult.data.thanks || '';
        this.logger.log(`感谢词生成成功: ${aiThankPage}`);
      }
    } catch (error: any) {
      this.logger.warn(`AI内容生成失败: ${error.message}，使用默认内容`);
      aiWelcomePage = `欢迎莅临${banquetData.name}！`;
      aiThankPage = `感谢您参加${banquetData.name}！`;
    }

    // 映射前端字段到数据库列名
    const dataToInsert: Record<string, any> = {
      openid: banquetData.host_openid || banquetData.openid,
      banquet_type: banquetData.type || banquetData.banquet_type,
      banquet_name: banquetData.name || banquetData.banquet_name,
      host_name: banquetData.hostName || banquetData.host_name || banquetData.host_nickname || null,
      host_phone: banquetData.host_phone || null,
      banquet_date: banquetData.eventTime
        ? new Date(banquetData.eventTime).toISOString().split('T')[0]
        : banquetData.banquet_date || null,
      banquet_time: banquetData.eventTime
        ? new Date(banquetData.eventTime).toTimeString().split(' ')[0]
        : banquetData.banquet_time || null,
      venue_name: banquetData.venue_name || (typeof banquetData.location === 'string' ? banquetData.location : null),
      venue_address: banquetData.venue_address || (typeof banquetData.location === 'string' ? banquetData.location : null),
      protagonist_name: banquetData.protagonist_name || banquetData.hostName || null,
      protagonist_photos: photos,
      description: banquetData.description || null,
      ai_page_enabled: true,
      welcome_page_config: { content: aiWelcomePage },
      thank_page_config: { content: aiThankPage },
      status: 'active',
    };

    const { data, error } = await client.from('banquets').insert(dataToInsert).select().single();

    if (error) {
      this.logger.error(`创建宴会失败: ${JSON.stringify(error)}`);
      throw new Error(error.message);
    }

    this.logger.log(`宴会创建成功: id=${data.id}`);

    // 自动生成二维码
    try {
      const qrcodeData = await this.getBanquetQrcode(data.id);
      data.qr_code = qrcodeData.qrcodeUrl || null;
      data.qr_code_page = qrcodeData.page || null;
    } catch (err: any) {
      this.logger.warn(`生成二维码失败: ${err.message}`);
    }

    return this.mapDbToApi(data);
  }

  /**
   * 获取宴会二维码
   */
  async getBanquetQrcode(banquetId: string) {
    this.logger.log(`获取宴会二维码: ${banquetId}`);

    try {
      const result = await this.wechatConfig.generateMiniProgramCode(
        banquetId,
        'pages/scan/index',
        430
      );

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

    // 映射前端字段到数据库列名
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.name || data.banquet_name) {
      updateData.banquet_name = data.name || data.banquet_name;
    }
    if (data.type || data.banquet_type) {
      updateData.banquet_type = data.type || data.banquet_type;
    }
    if (data.hostName || data.host_name) {
      updateData.host_name = data.hostName || data.host_name;
    }
    if (data.location) {
      updateData.venue_name = data.location;
      updateData.venue_address = data.location;
    }
    if (data.description) {
      updateData.description = data.description;
    }
    if (data.status) {
      updateData.status = data.status;
    }
    if (data.photos) {
      updateData.protagonist_photos = data.photos;
    }

    const { error } = await client
      .from('banquets')
      .update(updateData)
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

  /**
   * 数据库行 → API响应字段映射
   * 将数据库列名转换为前端使用的字段名
   */
  private mapDbToApi(row: any): any {
    if (!row) return row;

    return {
      ...row,
      // 前端兼容字段
      host_openid: row.openid,
      type: row.banquet_type,
      name: row.banquet_name || row.name,
      host_name: row.host_name,
      event_time: row.banquet_date
        ? `${row.banquet_date}${row.banquet_time ? 'T' + row.banquet_time : ''}`
        : null,
      location: row.venue_name || row.venue_address,
      photos: row.protagonist_photos || [],
      ai_welcome_page:
        typeof row.welcome_page_config === 'object'
          ? row.welcome_page_config?.content
          : row.welcome_page_config,
      ai_thank_page:
        typeof row.thank_page_config === 'object'
          ? row.thank_page_config?.content
          : row.thank_page_config,
    };
  }
}
