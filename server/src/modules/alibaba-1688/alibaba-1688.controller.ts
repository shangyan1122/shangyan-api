import { Controller, Get, Post, Body, Param, Query, Logger } from '@nestjs/common';
import { Alibaba1688Service, Alibaba1688Config, DropshipOrder } from './alibaba-1688.service';

/**
 * 1688一件代发控制器
 */
@Controller('alibaba-1688')
export class Alibaba1688Controller {
  private readonly logger = new Logger(Alibaba1688Controller.name);

  constructor(private readonly alibaba1688Service: Alibaba1688Service) {}

  /**
   * 获取1688配置
   * GET /api/alibaba-1688/config
   */
  @Get('config')
  async getConfig(): Promise<{ code: number; msg: string; data: Alibaba1688Config | null }> {
    try {
      const config = await this.alibaba1688Service.getConfig();
      // 脱敏处理：不返回完整的 app_secret
      if (config) {
        const safeConfig = {
          ...config,
          app_secret: config.app_secret ? '******' : '',
          access_token: config.access_token ? '******' : '',
        };
        return { code: 200, msg: '获取成功', data: safeConfig };
      }
      return { code: 200, msg: '获取成功', data: config };
    } catch (error: any) {
      this.logger.error('获取配置失败:', error);
      return { code: 500, msg: error.message, data: null };
    }
  }

  /**
   * 保存1688配置
   * POST /api/alibaba-1688/config
   */
  @Post('config')
  async saveConfig(
    @Body() body: Partial<Alibaba1688Config>
  ): Promise<{ code: number; msg: string; data: Alibaba1688Config | null }> {
    try {
      this.logger.log('保存1688配置');
      const config = await this.alibaba1688Service.saveConfig(body);
      return { code: 200, msg: '保存成功', data: config };
    } catch (error: any) {
      this.logger.error('保存配置失败:', error);
      return { code: 500, msg: error.message, data: null };
    }
  }

  /**
   * 更新1688配置
   * POST /api/alibaba-1688/config/:id
   */
  @Post('config/:id')
  async updateConfig(
    @Param('id') id: string,
    @Body() body: Partial<Alibaba1688Config>
  ): Promise<{ code: number; msg: string; data: Alibaba1688Config | null }> {
    try {
      const config = await this.alibaba1688Service.updateConfig(id, body);
      return { code: 200, msg: '更新成功', data: config };
    } catch (error: any) {
      this.logger.error('更新配置失败:', error);
      return { code: 500, msg: error.message, data: null };
    }
  }

  /**
   * 切换代发开关
   * POST /api/alibaba-1688/toggle
   */
  @Post('toggle')
  async toggleDropship(@Body() body: { enabled: boolean }): Promise<{ code: number; msg: string }> {
    try {
      await this.alibaba1688Service.toggleDropship(body.enabled);
      return { code: 200, msg: body.enabled ? '代发已开启' : '代发已关闭' };
    } catch (error: any) {
      this.logger.error('切换代发开关失败:', error);
      return { code: 500, msg: error.message };
    }
  }

  /**
   * 检查代发是否启用
   * GET /api/alibaba-1688/status
   */
  @Get('status')
  async getStatus(): Promise<{ code: number; msg: string; data: { enabled: boolean } }> {
    try {
      const enabled = await this.alibaba1688Service.isDropshipEnabled();
      return { code: 200, msg: '获取成功', data: { enabled } };
    } catch (error: any) {
      this.logger.error('获取状态失败:', error);
      return { code: 500, msg: error.message, data: { enabled: false } };
    }
  }

  /**
   * 获取代发订单列表
   * GET /api/alibaba-1688/orders
   */
  @Get('orders')
  async getOrders(
    @Query('banquetId') banquetId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ): Promise<{ code: number; msg: string; data: { orders: DropshipOrder[]; total: number } }> {
    try {
      const result = await this.alibaba1688Service.getDropshipOrders({
        banquetId,
        status,
        limit: limit ? parseInt(limit) : 20,
        offset: offset ? parseInt(offset) : 0,
      });
      return { code: 200, msg: '获取成功', data: result };
    } catch (error: any) {
      this.logger.error('获取订单列表失败:', error);
      return { code: 500, msg: error.message, data: { orders: [], total: 0 } };
    }
  }

  /**
   * 获取代发订单详情
   * GET /api/alibaba-1688/orders/:id
   */
  @Get('orders/:id')
  async getOrderById(
    @Param('id') id: string
  ): Promise<{ code: number; msg: string; data: DropshipOrder | null }> {
    try {
      const order = await this.alibaba1688Service.getDropshipOrderById(id);
      return { code: 200, msg: '获取成功', data: order };
    } catch (error: any) {
      this.logger.error('获取订单详情失败:', error);
      return { code: 500, msg: error.message, data: null };
    }
  }

  /**
   * 同步物流信息
   * POST /api/alibaba-1688/orders/:id/sync-logistics
   */
  @Post('orders/:id/sync-logistics')
  async syncLogistics(@Param('id') id: string): Promise<{ code: number; msg: string }> {
    try {
      await this.alibaba1688Service.syncLogistics(id);
      return { code: 200, msg: '同步成功' };
    } catch (error: any) {
      this.logger.error('同步物流失败:', error);
      return { code: 500, msg: error.message };
    }
  }

  /**
   * 批量同步物流
   * POST /api/alibaba-1688/sync-all-logistics
   */
  @Post('sync-all-logistics')
  async syncAllLogistics(): Promise<{ code: number; msg: string }> {
    try {
      await this.alibaba1688Service.syncAllPendingLogistics();
      return { code: 200, msg: '同步完成' };
    } catch (error: any) {
      this.logger.error('批量同步物流失败:', error);
      return { code: 500, msg: error.message };
    }
  }

  /**
   * 获取代发统计
   * GET /api/alibaba-1688/stats
   */
  @Get('stats')
  async getStats(
    @Query('banquetId') banquetId?: string
  ): Promise<{ code: number; msg: string; data: any }> {
    try {
      const stats = await this.alibaba1688Service.getDropshipStats(banquetId);
      return { code: 200, msg: '获取成功', data: stats };
    } catch (error: any) {
      this.logger.error('获取统计失败:', error);
      return { code: 500, msg: error.message, data: null };
    }
  }
}
