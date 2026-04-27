import { Controller, Post, Body, Headers, Req, Logger } from '@nestjs/common'
import { Request } from 'express'
import { WechatPayService } from './wechat-pay.service'
import { PaidFeaturesService } from '../paid-features/paid-features.service'
import { Public } from '@/common/guards/auth.guard'

@Controller('wechat-pay')
export class WechatPayController {
  private readonly logger = new Logger(WechatPayController.name)

  constructor(
    private readonly wechatPayService: WechatPayService,
    private readonly paidFeaturesService: PaidFeaturesService
  ) {}

  /**
   * 创建支付订单
   */
  @Post('create')
  async createOrder(@Body() body: { openid: string; amount: number; description: string; orderId: string; enableProfitSharing?: boolean }) {
    this.logger.log(`创建支付订单: ${body.orderId}${body.enableProfitSharing ? ' (启用分账)' : ''}`)

    const result = await this.wechatPayService.createJsapiOrder(body)

    if (result.success) {
      return {
        code: 200,
        msg: '订单创建成功',
        data: result.data
      }
    }

    return {
      code: 400,
      msg: result.message,
      data: null
    }
  }

  /**
   * 查询订单
   */
  @Post('query')
  async queryOrder(@Body() body: { orderId: string }) {
    this.logger.log(`查询订单: ${body.orderId}`)

    const result = await this.wechatPayService.queryOrder(body.orderId)

    if (result.success) {
      return {
        code: 200,
        msg: 'success',
        data: result.data
      }
    }

    return {
      code: 400,
      msg: result.message,
      data: null
    }
  }

  /**
   * 申请退款
   */
  @Post('refund')
  async refund(@Body() body: {
    orderId: string
    refundId: string
    totalAmount: number
    refundAmount: number
    reason?: string
  }) {
    this.logger.log(`申请退款: ${body.orderId}`)

    const result = await this.wechatPayService.refund(body)

    if (result.success) {
      return {
        code: 200,
        msg: '退款申请成功',
        data: result.data
      }
    }

    return {
      code: 400,
      msg: result.message,
      data: null
    }
  }

  /**
   * 支付回调通知
   */
  @Public()
  @Post('notify')
  async handleNotify(@Headers() headers: any, @Req() req: Request) {
    this.logger.log('收到支付回调通知')

    try {
      const body = req.body as any

      // 验证签名
      const isValid = this.wechatPayService.verifyNotify(headers, JSON.stringify(body))
      
      if (!isValid) {
        this.logger.error('支付回调签名验证失败')
        return { code: 'FAIL', message: '签名验证失败' }
      }

      // 解密回调数据
      const decryptData = this.wechatPayService.decryptNotify(body.resource)
      
      if (!decryptData) {
        this.logger.error('解密回调数据失败')
        return { code: 'FAIL', message: '解密失败' }
      }

      this.logger.log('支付成功:', JSON.stringify(decryptData))

      // 更新付费功能状态
      try {
        const { out_trade_no, transaction_id } = decryptData
        
        await this.paidFeaturesService.handlePaymentSuccess(out_trade_no, transaction_id)

        return { code: 'SUCCESS', message: '成功' }
      } catch (error) {
        this.logger.error('处理支付回调失败:', error)
        return { code: 'FAIL', message: '处理失败' }
      }
    } catch (error: any) {
      // 防止微信支付 SDK 异常导致服务器崩溃
      this.logger.error(`支付回调处理异常: ${error.message}`)
      return { code: 'FAIL', message: '处理异常' }
    }
  }
}
