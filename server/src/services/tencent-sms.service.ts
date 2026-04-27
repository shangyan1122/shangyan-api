import { Injectable, Logger } from '@nestjs/common'
import * as crypto from 'crypto'

/**
 * 腾讯云短信服务
 * API文档: https://cloud.tencent.com/document/product/382/43197
 */
@Injectable()
export class TencentSmsService {
  private readonly logger = new Logger(TencentSmsService.name)

  // 腾讯云短信配置（从环境变量读取）
  private readonly secretId = process.env.TENCENT_SMS_SECRET_ID || ''
  private readonly secretKey = process.env.TENCENT_SMS_SECRET_KEY || ''
  private readonly sdkAppId = process.env.TENCENT_SMS_SDK_APP_ID || ''
  private readonly signName = process.env.TENCENT_SMS_SIGN_NAME || '尚宴礼记'

  // 腾讯云API端点
  private readonly endpoint = 'sms.tencentcloudapi.com'
  private readonly region = process.env.TENCENT_SMS_REGION || 'ap-guangzhou'

  /**
   * 发送验证码短信
   * @param phone 手机号
   * @param code 验证码
   * @param templateId 模板ID
   */
  async sendVerificationCode(
    phone: string,
    code: string,
    templateId: string = process.env.TENCENT_SMS_TEMPLATE_ID || ''
  ): Promise<{ success: boolean; msg: string; requestId?: string }> {
    this.logger.log(`发送验证码短信: phone=${phone}, code=${code}`)

    // 测试环境：在日志中输出验证码
    this.logger.log(`[测试模式] 手机号 ${phone} 的验证码是: ${code}`)

    // 检查配置
    if (!this.secretId || !this.secretKey || !this.sdkAppId) {
      this.logger.warn('腾讯云短信未配置，使用测试模式')
      this.logger.log(`[测试模式] 手机号 ${phone} 的验证码是: ${code}`)
      return { success: true, msg: '验证码已发送（测试模式）' }
    }

    // 生产环境：调用腾讯云短信API
    try {
      const params = {
        PhoneNumberSet: [`+86${phone}`],
        SmsSdkAppId: this.sdkAppId,
        SignName: this.signName,
        TemplateId: templateId,
        TemplateParamSet: [code]
      }

      const result = await this.sendRequest('SendSms', params)

      if (result.SendStatusSet?.[0]?.Code === 'Ok') {
        this.logger.log(`短信发送成功: phone=${phone}, requestId=${result.RequestId}`)
        return {
          success: true,
          msg: '验证码已发送',
          requestId: result.RequestId
        }
      } else {
        const errorMsg = result.SendStatusSet?.[0]?.Message || '发送失败'
        this.logger.error(`短信发送失败: ${errorMsg}`)
        return { success: false, msg: errorMsg }
      }
    } catch (error: any) {
      this.logger.error(`发送短信失败: ${error.message}`)
      // 降级到测试模式
      this.logger.log(`[测试模式] 手机号 ${phone} 的验证码是: ${code}`)
      return { success: true, msg: '验证码已发送（测试模式）' }
    }
  }

  /**
   * 发送模板短信
   * @param phone 手机号
   * @param templateId 模板ID
   * @param params 模板参数
   */
  async sendTemplateSms(
    phone: string,
    templateId: string,
    params: string[]
  ): Promise<{ success: boolean; msg: string; requestId?: string }> {
    this.logger.log(`发送模板短信: phone=${phone}, templateId=${templateId}`)

    // 检查配置
    if (!this.secretId || !this.secretKey || !this.sdkAppId) {
      this.logger.warn('腾讯云短信未配置')
      return { success: false, msg: '短信服务未配置' }
    }

    try {
      const smsParams = {
        PhoneNumberSet: [`+86${phone}`],
        SmsSdkAppId: this.sdkAppId,
        SignName: this.signName,
        TemplateId: templateId,
        TemplateParamSet: params
      }

      const result = await this.sendRequest('SendSms', smsParams)

      if (result.SendStatusSet?.[0]?.Code === 'Ok') {
        this.logger.log(`短信发送成功: phone=${phone}, requestId=${result.RequestId}`)
        return {
          success: true,
          msg: '短信已发送',
          requestId: result.RequestId
        }
      } else {
        const errorMsg = result.SendStatusSet?.[0]?.Message || '发送失败'
        this.logger.error(`短信发送失败: ${errorMsg}`)
        return { success: false, msg: errorMsg }
      }
    } catch (error: any) {
      this.logger.error(`发送短信失败: ${error.message}`)
      return { success: false, msg: '发送失败' }
    }
  }

  /**
   * 发送腾讯云API请求
   */
  private async sendRequest(action: string, params: any): Promise<any> {
    const timestamp = Math.floor(Date.now() / 1000)
    const date = new Date().toISOString().slice(0, 10)

    // 1. 构造请求参数
    const payload = {
      Action: action,
      Version: '2021-01-11',
      Region: this.region,
      Timestamp: timestamp,
      RequestId: crypto.randomUUID(),
      ...params
    }

    // 2. 序列化请求体
    const body = JSON.stringify(payload)

    // 3. 计算签名
    const credentialScope = `${date}/${this.region}/sms/tc3_request`
    const hashedRequestPayload = this.sha256(body)
    const canonicalRequest = `POST\n/\n\ncontent-type:application/json; charset=utf-8\nhost:${this.endpoint}\n\ncontent-type;host\n${this.sha256('content-type:application/json; charset=utf-8\nhost:' + this.endpoint)}`

    const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${this.sha256(canonicalRequest)}`
    const signature = this.hmacSha256(
      this.hmacSha256(
        this.hmacSha256(
          this.hmacSha256(this.secretKey, 'TC3' + this.secretKey),
          date
        ),
        this.region
      ),
      'sms/tc3_request'
    )

    const authorization = `TC3-HMAC-SHA256 Credential=${this.secretId}/${credentialScope}, SignedHeaders=content-type;host, Signature=${signature}`

    // 4. 发送请求
    const response = await fetch(`https://${this.endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': authorization,
        'Content-Type': 'application/json; charset=utf-8',
        'Host': this.endpoint,
        'X-TC-Action': action,
        'X-TC-Timestamp': timestamp.toString(),
        'X-TC-Version': '2021-01-11',
        'X-TC-Region': this.region,
        'X-TC-RequestId': crypto.randomUUID()
      },
      body: body
    })

    return await response.json()
  }

  /**
   * SHA256 哈希
   */
  private sha256(message: string): string {
    return crypto.createHash('sha256').update(message).digest('hex')
  }

  /**
   * HMAC-SHA256
   */
  private hmacSha256(key: string | Buffer, message: string): string {
    return crypto.createHmac('sha256', key).update(message).digest('hex')
  }

  /**
   * 发送人情绑定宴会创建通知短信
   * 当绑定了人情提醒的用户创建新宴会时，短信通知对方
   * @param phone 对方手机号
   * @param templateId 短信模板ID
   * @param hostName 办宴人姓名
   * @param banquetType 宴会类型
   * @param banquetName 宴会名称
   * @param eventTime 宴会时间
   * @param location 宴会地点
   */
  async sendBanquetCreatedNotify(
    phone: string,
    templateId: string = process.env.TENCENT_SMS_BANQUET_NOTIFY_TEMPLATE_ID || '',
    hostName: string,
    banquetType: string,
    banquetName: string,
    eventTime: string,
    location: string
  ): Promise<{ success: boolean; msg: string; requestId?: string }> {
    this.logger.log(`发送宴会创建通知短信: phone=${phone}, host=${hostName}, banquet=${banquetName}`)

    // 检查配置
    if (!this.secretId || !this.secretKey || !this.sdkAppId) {
      this.logger.warn('腾讯云短信未配置，使用测试模式')
      this.logger.log(`[测试模式] 通知短信: ${phone} -> ${hostName}举办${banquetType}${banquetName}，时间${eventTime}，地点${location}`)
      return { success: true, msg: '短信已发送（测试模式）' }
    }

    if (!templateId) {
      this.logger.warn('宴会创建通知短信模板ID未配置')
      return { success: false, msg: '短信模板未配置' }
    }

    try {
      const params = {
        PhoneNumberSet: [`+86${phone}`],
        SmsSdkAppId: this.sdkAppId,
        SignName: this.signName,
        TemplateId: templateId,
        TemplateParamSet: [hostName, banquetType, banquetName, eventTime, location]
      }

      const result = await this.sendRequest('SendSms', params)

      if (result.SendStatusSet?.[0]?.Code === 'Ok') {
        this.logger.log(`宴会创建通知短信发送成功: phone=${phone}`)
        return {
          success: true,
          msg: '短信已发送',
          requestId: result.RequestId
        }
      } else {
        const errorMsg = result.SendStatusSet?.[0]?.Message || '发送失败'
        this.logger.error(`宴会创建通知短信发送失败: ${errorMsg}`)
        return { success: false, msg: errorMsg }
      }
    } catch (error: any) {
      this.logger.error(`宴会创建通知短信发送异常: ${error.message}`)
      return { success: false, msg: '发送失败' }
    }
  }

  /**
   * 验证手机号格式
   */
  isValidPhone(phone: string): boolean {
    return /^1[3-9]\d{9}$/.test(phone)
  }

  /**
   * 获取发送状态
   */
  async getSendStatus(phone: string): Promise<{ canSend: boolean; remainingSeconds: number }> {
    // 可以从Redis获取发送频率限制信息
    // 这里简单返回允许发送
    return { canSend: true, remainingSeconds: 0 }
  }

  /**
   * 查询短信发送状态
   * @param phoneNumber 手机号
   * @param beginDateTime 开始时间
   * @param endDateTime 结束时间
   */
  async querySendStatus(
    phoneNumber: string,
    beginDateTime: string,
    endDateTime: string
  ): Promise<{ success: boolean; data?: any; msg?: string }> {
    try {
      const params = {
        PhoneNumberSet: [`+86${phoneNumber}`],
        SendDateTime: beginDateTime,
        Limit: 100
      }

      const result = await this.sendRequest('PullSendStatus', params)

      return {
        success: true,
        data: result.PullSendStatusSet || [],
        msg: '查询成功'
      }
    } catch (error: any) {
      this.logger.error(`查询短信状态失败: ${error.message}`)
      return { success: false, msg: '查询失败' }
    }
  }
}
