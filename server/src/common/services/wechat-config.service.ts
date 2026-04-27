import { Injectable, Logger } from '@nestjs/common'

/**
 * 微信小程序配置服务
 * 管理微信小程序的AppID、AppSecret和API调用
 */
@Injectable()
export class WechatConfigService {
  private readonly logger = new Logger(WechatConfigService.name)
  
  // 小程序配置
  private readonly appId = process.env.WECHAT_APP_ID || ''
  private readonly appSecret = process.env.WECHAT_APP_SECRET || ''
  
  // 开发环境配置：是否使用模拟登录（绕过微信API）
  private readonly useMockLogin = process.env.WECHAT_MOCK_LOGIN === 'true'
  
  // 缓存access_token
  private accessToken: string = ''
  private tokenExpireTime: number = 0

  /**
   * 检查是否配置了微信小程序
   */
  isConfigured(): boolean {
    return !!(this.appId && this.appSecret)
  }

  /**
   * 获取AppID
   */
  getAppId(): string {
    return this.appId
  }

  /**
   * 获取access_token
   * 带缓存，避免频繁调用
   */
  async getAccessToken(): Promise<string> {
    // 检查缓存是否有效
    if (this.accessToken && Date.now() < this.tokenExpireTime) {
      return this.accessToken
    }

    if (!this.isConfigured()) {
      throw new Error('微信小程序未配置，请设置 WECHAT_APP_ID 和 WECHAT_APP_SECRET 环境变量')
    }

    try {
      const response = await fetch(
        `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`
      )
      
      const data = await response.json()

      if (data.errcode) {
        throw new Error(`获取 access_token 失败: ${data.errmsg} (${data.errcode})`)
      }

      this.accessToken = data.access_token
      // 提前5分钟过期，避免临界情况
      this.tokenExpireTime = Date.now() + (data.expires_in - 300) * 1000

      this.logger.log('成功获取微信access_token')
      return this.accessToken
    } catch (error: any) {
      this.logger.error(`获取access_token失败: ${error.message}`)
      throw error
    }
  }

  /**
   * 生成小程序码
   * @param scene 场景值（UUID格式会自动转换为32字符格式）
   * @param page 页面路径
   * @param width 二维码宽度
   *
   * 微信限制：scene参数最长32个可见字符
   * UUID格式(36字符)需要去掉横线转换为32字符
   */
  async generateMiniProgramCode(
    scene: string,
    page: string = 'pages/scan/index',
    width: number = 430
  ): Promise<{ base64: string; url: string; scene: string; success: boolean; message?: string }> {
    if (!this.isConfigured()) {
      this.logger.warn('微信小程序未配置，生成降级二维码（模拟数据）')
      return this.generateFallbackQRCode(scene, page, '微信小程序未配置')
    }

    // 将UUID格式转换为32字符格式（去掉横线）
    // 例如：71aea610-22b6-4177-94b9-3425ef7b2ebf -> 71aea61022b6417794b93425ef7b2ebf
    const shortScene = scene.replace(/-/g, '')

    if (shortScene.length > 32) {
      this.logger.error(`scene参数过长: ${shortScene.length}字符，最大允许32字符`)
      return this.generateFallbackQRCode(scene, page, 'scene参数过长')
    }

    try {
      const accessToken = await this.getAccessToken()

      this.logger.log(`生成小程序码: 原始scene=${scene}, 编码后scene=${shortScene}`)

      const response = await fetch(
        `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scene: shortScene,
            page,
            width,
            auto_color: false,
            line_color: { r: 196, g: 30, b: 58 }, // 中国红 #C41E3A
            is_hyaline: false
          })
        }
      )

      const contentType = response.headers.get('content-type')

      // 如果返回的是 JSON（错误信息）
      if (contentType?.includes('application/json')) {
        const errorData = await response.json()
        this.logger.error(`生成小程序码失败: ${errorData.errmsg} (${errorData.errcode})`)
        return this.generateFallbackQRCode(scene, page, `微信API错误: ${errorData.errmsg}`)
      }

      // 获取图片 buffer
      const imageBuffer = await response.arrayBuffer()
      const base64 = Buffer.from(imageBuffer).toString('base64')

      this.logger.log(`成功生成小程序码: shortScene=${shortScene}`)

      return {
        base64: `data:image/png;base64,${base64}`,
        url: '',
        scene: shortScene,  // 返回编码后的scene，前端需要使用这个
        success: true
      }
    } catch (error: any) {
      this.logger.error(`生成小程序码失败: ${error.message}`)
      return this.generateFallbackQRCode(scene, page, `网络错误: ${error.message}`)
    }
  }

  /**
   * 生成降级二维码（当微信API失败时使用）
   */
  private generateFallbackQRCode(
    scene: string,
    page: string,
    reason: string
  ): { base64: string; url: string; scene: string; success: boolean; message: string } {
    // 使用 qrcode 库生成二维码（需要先安装）
    // 这里使用一个简单的SVG二维码作为降级方案
    const qrData = `${page}?id=${scene}`

    // 简单的SVG二维码样式
    const svgQrCode = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#FFFFFF"/>
  <rect x="10" y="10" width="20" height="20" fill="#000000"/>
  <rect x="70" y="10" width="20" height="20" fill="#000000"/>
  <rect x="10" y="70" width="20" height="20" fill="#000000"/>
  <rect x="35" y="35" width="30" height="30" fill="#A91D2E"/>
  <text x="50" y="55" font-size="8" fill="#FFFFFF" text-anchor="middle">扫码随礼</text>
</svg>`

    const base64 = Buffer.from(svgQrCode).toString('base64')

    this.logger.warn(`使用降级二维码: 原因=${reason}`)

    return {
      base64: `data:image/svg+xml;base64,${base64}`,
      url: '',
      scene: scene.replace(/-/g, ''),
      success: false,
      message: reason
    }
  }

  /**
   * 微信登录 - 通过code换取openid
   * @param code 小程序登录code
   */
  async login(code: string): Promise<{ openid: string; sessionKey: string }> {
    // 开发环境或未配置时使用模拟登录
    if (!this.isConfigured() || this.useMockLogin) {
      this.logger.warn('微信小程序未配置或使用模拟登录模式，返回模拟openid')
      // 使用固定的 openid，避免每次登录都生成新ID导致购物车等数据丢失
      return {
        openid: 'mock_openid_development_user',
        sessionKey: 'mock_session_key'
      }
    }

    try {
      const response = await fetch(
        `https://api.weixin.qq.com/sns/jscode2session?appid=${this.appId}&secret=${this.appSecret}&js_code=${code}&grant_type=authorization_code`
      )
      
      const data = await response.json()

      if (data.errcode) {
        throw new Error(`微信登录失败: ${data.errmsg} (${data.errcode})`)
      }

      return {
        openid: data.openid,
        sessionKey: data.session_key
      }
    } catch (error: any) {
      this.logger.error(`微信登录失败: ${error.message}`)
      throw error
    }
  }

  /**
   * 发送模板消息
   * @param openid 接收者openid
   * @param templateId 模板ID
   * @param data 模板数据
   * @param page 跳转页面
   */
  async sendTemplateMessage(
    openid: string,
    templateId: string,
    data: Record<string, { value: string }>,
    page: string = 'pages/index/index'
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn('微信小程序未配置，跳过发送模板消息')
      return false
    }

    try {
      const accessToken = await this.getAccessToken()

      const response = await fetch(
        `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            touser: openid,
            template_id: templateId,
            page,
            data
          })
        }
      )

      const result = await response.json()

      if (result.errcode) {
        throw new Error(`发送模板消息失败: ${result.errmsg} (${result.errcode})`)
      }

      this.logger.log(`成功发送模板消息: openid=${openid}`)
      return true
    } catch (error: any) {
      this.logger.error(`发送模板消息失败: ${error.message}`)
      return false
    }
  }
}
