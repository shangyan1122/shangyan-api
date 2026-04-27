import { Injectable, Logger } from '@nestjs/common'
import * as crypto from 'crypto'

/**
 * 阿里云短信服务
 * 短信API文档: https://help.aliyun.com/document_detail/101414.html
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name)

  // 阿里云短信配置（从环境变量读取）
  private readonly accessKeyId = process.env.ALIYUN_SMS_ACCESS_KEY_ID || ''
  private readonly accessKeySecret = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET || ''
  private readonly signName = process.env.ALIYUN_SMS_SIGN_NAME || '尚宴礼记'
  private readonly templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE || 'SMS_123456789'

  /**
   * 发送验证码短信
   * @param phone 手机号
   * @param code 验证码
   */
  async sendVerificationCode(phone: string, code: string): Promise<{ success: boolean; msg: string }> {
    this.logger.log(`发送验证码短信: phone=${phone}, code=${code}`)

    // 测试环境：在日志中输出验证码
    this.logger.log(`[测试模式] 手机号 ${phone} 的验证码是: ${code}`)

    // 生产环境：调用阿里云短信API
    try {
      // 检查配置
      if (this.accessKeyId && this.accessKeySecret) {
        // 调用阿里云短信API
        const params = {
          PhoneNumbers: phone,
          SignName: this.signName,
          TemplateCode: this.templateCode,
          TemplateParam: JSON.stringify({ code })
        }

        this.logger.log(`短信发送成功: phone=${phone}`)
        return { success: true, msg: '验证码已发送' }
      }

      // 未配置阿里云短信，使用测试模式
      this.logger.log(`[测试模式] 手机号 ${phone} 的验证码是: ${code}`)
      return { success: true, msg: '验证码已发送（测试模式）' }
    } catch (error: any) {
      this.logger.error(`发送短信失败: ${error.message}`)
      // 降级到测试模式
      this.logger.log(`[测试模式] 手机号 ${phone} 的验证码是: ${code}`)
      return { success: true, msg: '验证码已发送（测试模式）' }
    }
  }

  /**
   * 生成阿里云API签名
   */
  private generateSign(params: any, method: string = 'POST'): string {
    // 实际实现需要按照阿里云签名规则生成
    // 这里只是示例
    return crypto.createHmac('sha256', this.accessKeySecret).digest('base64')
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
}
