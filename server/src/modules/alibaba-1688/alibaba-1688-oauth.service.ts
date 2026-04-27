import { Injectable, Logger } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'
import crypto from 'crypto'

const supabase = getSupabaseClient()

/**
 * 1688 OAuth 授权服务
 */
@Injectable()
export class Alibaba1688OAuthService {
  private readonly logger = new Logger(Alibaba1688OAuthService.name)

  /**
   * 1688 OAuth 配置
   */
  private readonly AUTH_URL = 'https://auth.1688.com/oauth/authorize'
  private readonly TOKEN_URL = 'https://gw.open.1688.com/openapi/oauth2/accessToken'
  private readonly REFRESH_URL = 'https://gw.open.1688.com/openapi/oauth2/refreshToken'

  /**
   * 获取授权 URL
   */
  async getAuthUrl(redirectUri: string, state?: string): Promise<string> {
    const config = await this.getConfig()
    if (!config) {
      throw new Error('1688 配置不存在，请先配置 App Key 和 App Secret')
    }

    const stateValue = state || this.generateState()
    // 1688 OAuth 2.0 需要的参数
    const params = new URLSearchParams({
      client_id: config.app_key,
      redirect_uri: redirectUri,
      response_type: 'code',
      state: stateValue,
      scope: 'all',
      view: 'web' // 添加视图参数
    })

    return `${this.AUTH_URL}?${params.toString()}`
  }

  /**
   * 使用授权码获取 Access Token
   */
  async getAccessToken(code: string, redirectUri: string): Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: string
  }> {
    const config = await this.getConfig()
    if (!config) {
      throw new Error('1688 配置不存在')
    }

    this.logger.log('开始获取 Access Token')

    const params = new URLSearchParams({
      client_id: config.app_key,
      client_secret: config.app_secret,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri
    })

    try {
      const response = await fetch(this.TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      })

      const result = await response.json()

      if (result.error) {
        throw new Error(`获取 Access Token 失败: ${result.error_description || result.error}`)
      }

      this.logger.log('Access Token 获取成功')

      return {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        expires_in: result.expires_in,
        token_type: result.token_type || 'Bearer'
      }
    } catch (error: any) {
      this.logger.error('获取 Access Token 异常:', error)
      throw new Error(`获取 Access Token 异常: ${error.message}`)
    }
  }

  /**
   * 刷新 Access Token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: string
  }> {
    const config = await this.getConfig()
    if (!config) {
      throw new Error('1688 配置不存在')
    }

    this.logger.log('开始刷新 Access Token')

    const params = new URLSearchParams({
      client_id: config.app_key,
      client_secret: config.app_secret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })

    try {
      const response = await fetch(this.REFRESH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      })

      const result = await response.json()

      if (result.error) {
        throw new Error(`刷新 Access Token 失败: ${result.error_description || result.error}`)
      }

      this.logger.log('Access Token 刷新成功')

      return {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        expires_in: result.expires_in,
        token_type: result.token_type || 'Bearer'
      }
    } catch (error: any) {
      this.logger.error('刷新 Access Token 异常:', error)
      throw new Error(`刷新 Access Token 异常: ${error.message}`)
    }
  }

  /**
   * 保存 Access Token 到数据库
   */
  async saveAccessToken(tokenInfo: {
    access_token: string
    refresh_token: string
    expires_in: number
  }): Promise<void> {
    const config = await this.getConfig()
    if (!config) {
      throw new Error('1688 配置不存在')
    }

    const expiresAt = new Date(Date.now() + tokenInfo.expires_in * 1000)

    const { error } = await supabase
      .from('alibaba_1688_config')
      .update({
        access_token: tokenInfo.access_token,
        refresh_token: tokenInfo.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', config.id)

    if (error) {
      this.logger.error('保存 Access Token 失败:', error)
      throw new Error('保存 Access Token 失败')
    }

    this.logger.log('Access Token 保存成功')
  }

  /**
   * 获取 1688 配置
   */
  private async getConfig(): Promise<{ app_key: string; app_secret: string; id: string } | null> {
    const { data, error } = await supabase
      .from('alibaba_1688_config')
      .select('id, app_key, app_secret')
      .eq('status', 'active')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      this.logger.error('获取配置失败:', error)
      throw new Error('获取配置失败')
    }

    return data
  }

  /**
   * 生成随机 state
   */
  private generateState(): string {
    return crypto.randomBytes(16).toString('hex')
  }

  /**
   * 检查 Access Token 是否有效
   */
  async isAccessTokenValid(): Promise<boolean> {
    const config = await this.getConfig()
    if (!config) {
      return false
    }

    // 从数据库查询 token 信息
    const { data } = await supabase
      .from('alibaba_1688_config')
      .select('access_token, token_expires_at')
      .eq('id', config.id)
      .single()

    if (!data || !data.access_token) {
      return false
    }

    if (!data.token_expires_at) {
      return false
    }

    // 提前 5 分钟判断过期
    const expiresAt = new Date(data.token_expires_at)
    const now = new Date()
    const bufferTime = 5 * 60 * 1000 // 5 分钟

    return now.getTime() < (expiresAt.getTime() - bufferTime)
  }

  /**
   * 获取有效的 Access Token（自动刷新）
   */
  async getValidAccessToken(): Promise<string> {
    const config = await this.getConfig()
    if (!config) {
      throw new Error('1688 配置不存在')
    }

    // 检查是否有 Access Token
    const { data } = await supabase
      .from('alibaba_1688_config')
      .select('access_token, refresh_token, token_expires_at')
      .eq('id', config.id)
      .single()

    if (!data || !data.access_token) {
      throw new Error('Access Token 不存在，请先完成 OAuth 授权')
    }

    // 检查是否过期
    if (await this.isAccessTokenValid()) {
      return data.access_token
    }

    // 过期了，尝试刷新
    if (!data.refresh_token) {
      throw new Error('Refresh Token 不存在，需要重新授权')
    }

    try {
      this.logger.log('Access Token 已过期，开始刷新')
      const newToken = await this.refreshAccessToken(data.refresh_token)
      await this.saveAccessToken(newToken)
      return newToken.access_token
    } catch (error: any) {
      this.logger.error('刷新 Access Token 失败:', error)
      throw new Error('刷新 Access Token 失败，需要重新授权')
    }
  }
}
