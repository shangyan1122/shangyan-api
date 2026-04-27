import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, Res, Logger, UseGuards, HttpException, HttpStatus } from '@nestjs/common'
import { Request, Response } from 'express'
import { BanquetService } from './banquet.service'
import { GiftReminderService } from '../gift-reminder/gift-reminder.service'
import { PaidFeaturesService } from '../paid-features/paid-features.service'
import { AuthGuard, Public } from '@/common/guards/auth.guard'

/**
 * 宴会控制器
 * 处理宴会相关的所有操作
 */
@Controller('banquets')
@UseGuards(AuthGuard)
export class BanquetController {
  private readonly logger = new Logger(BanquetController.name)

  constructor(
    private readonly banquetService: BanquetService,
    private readonly giftReminderService: GiftReminderService,
    private readonly paidFeaturesService: PaidFeaturesService
  ) {}

  /**
   * 获取用户的宴会列表
   * 支持按状态筛选
   * 
   * 【安全】
   * - 禁止客户端传入 openid 参数
   * - 从已验证的请求中获取用户 openid
   */
  @Get()
  async getBanquets(
    @Query('status') status: string,
    @Req() req: Request
  ) {
    // 【安全】从已验证的请求中获取 openid，禁止客户端传入
    const hostOpenid = req.user?.openid
    
    if (!hostOpenid) {
      return {
        code: 401,
        msg: '请先登录',
        data: []
      }
    }
    
    this.logger.log(`获取宴会列表: openid=${hostOpenid}, status=${status}`)

    try {
      const data = await this.banquetService.getBanquets(hostOpenid, status)
      
      // 批量获取各宴会的付费功能状态
      const dataWithFeatures = await Promise.all(
        data.map(async (item: any) => {
          let features = { ai_page_enabled: false, ledger_export_enabled: false, gift_reminder_enabled: false }
          try {
            const banquetFeatures = await this.paidFeaturesService.getBanquetPaidFeatures(item.id)
            features = {
              ai_page_enabled: banquetFeatures.aiPage?.enabled || false,
              ledger_export_enabled: banquetFeatures.ledgerExport?.enabled || false,
              gift_reminder_enabled: banquetFeatures.giftReminder?.enabled || false
            }
          } catch (e) {
            // 忽略付费功能查询失败
          }
          return {
            ...item,
            guestCount: item.guestCount || 0,
            totalAmount: item.totalAmount || 0,
            ...features
          }
        })
      )
      
      return {
        code: 200,
        msg: 'success',
        data: dataWithFeatures
      }
    } catch (error: any) {
      this.logger.error(`获取宴会列表失败: ${error.message}`)
      return {
        code: 500,
        msg: '获取宴会列表失败',
        data: []
      }
    }
  }

  /**
   * 获取宴会详情
   * 公开接口，允许嘉宾查看
   */
  @Public()
  @Get(':id')
  async getBanquetById(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    this.logger.log(`获取宴会详情: id=${id}`)

    try {
      const data = await this.banquetService.getBanquetById(id)

      if (!data) {
        this.logger.warn(`宴会不存在: id=${id}`)
        throw new HttpException('宴会不存在', HttpStatus.NOT_FOUND)
      }

      return res.json({
        code: 200,
        msg: 'success',
        data: data
      })
    } catch (error: any) {
      // 检查是否是 HttpException
      if (error instanceof HttpException) {
        throw error
      }

      // 检查是否是"未找到"错误
      if (error.message?.includes('PGRST116') || error.message?.toLowerCase().includes('not found')) {
        this.logger.warn(`宴会不存在: id=${id}`)
        throw new HttpException('宴会不存在', HttpStatus.NOT_FOUND)
      }

      this.logger.error(`获取宴会详情失败: ${error.message}`)
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        code: 500,
        msg: '获取宴会详情失败',
        data: null
      })
    }
  }

  /**
   * 获取宴会二维码
   * 用于嘉宾扫码随礼
   */
  @Get(':id/qrcode')
  async getBanquetQrcode(@Param('id') id: string, @Req() req: Request) {
    this.logger.log(`获取宴会二维码: id=${id}`)

    try {
      const qrcodeData = await this.banquetService.getBanquetQrcode(id)
      
      return {
        code: 200,
        msg: 'success',
        data: qrcodeData
      }
    } catch (error: any) {
      this.logger.error(`获取二维码失败: ${error.message}`)
      return {
        code: 500,
        msg: '获取二维码失败',
        data: null
      }
    }
  }

  /**
   * 创建宴会
   */
  @Post()
  async createBanquet(@Body() body: any, @Req() req: Request) {
    const hostOpenid = req.user?.openid
    
    if (!hostOpenid) {
      return {
        code: 401,
        msg: '请先登录',
        data: null
      }
    }
    
    this.logger.log(`创建宴会: openid=${hostOpenid}, type=${body.type}, name=${body.name}`)

    // 参数验证
    if (!body.type || !body.name || !body.event_time || !body.location) {
      return {
        code: 400,
        msg: '请填写完整的宴会信息',
        data: null
      }
    }

    // 验证宴会类型
    const validTypes = ['婚宴', '回门', '生日', '寿宴', '升学', '乔迁', '满月', '开锁']
    if (!validTypes.includes(body.type)) {
      return {
        code: 400,
        msg: '宴会类型无效',
        data: null
      }
    }

    try {
      const banquetData = {
        ...body,
        hostOpenid: hostOpenid,
        eventTime: body.event_time,
        returnRedPacket: body.return_red_packet || 0,
        returnGiftIds: body.return_gift_ids || []
      }
      
      const data = await this.banquetService.createBanquet(banquetData)
      
      this.logger.log(`宴会创建成功: id=${data.id}`)
      
      // 发送人情提醒（异步执行，不阻塞响应）
      this.giftReminderService.onBanquetGiftReminderEnabled(data.id)
        .catch(err => this.logger.error('发送人情提醒失败:', err))
      
      return {
        code: 200,
        msg: '创建成功',
        data: data
      }
    } catch (error: any) {
      this.logger.error(`创建宴会失败: ${error.message}`)
      return {
        code: 500,
        msg: '创建宴会失败',
        data: null
      }
    }
  }

  /**
   * 更新宴会
   */
  @Put(':id')
  async updateBanquet(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: Request
  ) {
    const hostOpenid = req.user?.openid

    if (!hostOpenid) {
      return {
        code: 401,
        msg: '请先登录',
        data: null
      }
    }

    this.logger.log(`更新宴会: id=${id}, openid=${hostOpenid}`)

    try {
      // 验证宴会所有权
      const banquet = await this.banquetService.getBanquetById(id)
      if (!banquet) {
        return {
          code: 404,
          msg: '宴会不存在',
          data: null
        }
      }

      if (banquet.host_openid !== hostOpenid) {
        return {
          code: 403,
          msg: '无权限操作',
          data: null
        }
      }

      // 校验宴会是否已举办（宴会当天23:59:59后不可修改）
      if (banquet.event_time) {
        const eventDate = new Date(banquet.event_time)
        const now = new Date()
        eventDate.setHours(23, 59, 59, 999)

        if (now > eventDate) {
          return {
            code: 400,
            msg: '宴会已举办，无法修改宴会信息',
            data: null
          }
        }
      }

      const result = await this.banquetService.updateBanquet(id, body)

      return {
        code: 200,
        msg: '更新成功',
        data: result
      }
    } catch (error: any) {
      this.logger.error(`更新宴会失败: ${error.message}`)
      return {
        code: 500,
        msg: '更新宴会失败',
        data: null
      }
    }
  }

  /**
   * 删除宴会（仅限未开始举办的宴会）
   */
  @Delete(':id')
  async deleteBanquet(@Param('id') id: string, @Req() req: Request) {
    const hostOpenid = req.user?.openid

    if (!hostOpenid) {
      return {
        code: 401,
        msg: '请先登录',
        data: null
      }
    }

    this.logger.log(`删除宴会: id=${id}, openid=${hostOpenid}`)

    try {
      const banquet = await this.banquetService.getBanquetById(id)

      if (!banquet) {
        return {
          code: 404,
          msg: '宴会不存在',
          data: null
        }
      }

      if (banquet.host_openid !== hostOpenid) {
        return {
          code: 403,
          msg: '无权限操作',
          data: null
        }
      }

      // 检查宴会是否已经开始举办（当前时间超过宴会时间）
      if (banquet.event_time) {
        const eventDate = new Date(banquet.event_time)
        const now = new Date()
        // 宴会当天开始时间
        const eventStart = new Date(eventDate.setHours(0, 0, 0, 0))

        if (now >= eventStart) {
          return {
            code: 400,
            msg: '宴会已开始举办，无法删除',
            data: null
          }
        }
      }

      const result = await this.banquetService.deleteBanquet(id)

      return {
        code: 200,
        msg: '删除成功',
        data: result
      }
    } catch (error: any) {
      this.logger.error(`删除宴会失败: ${error.message}`)
      return {
        code: 500,
        msg: '删除宴会失败',
        data: null
      }
    }
  }
}
