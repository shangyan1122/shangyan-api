import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

/**
 * JWT认证服务
 *
 * 【安全特性】
 * 1. 使用 RS256 或 HS256 算法签名
 * 2. Token 有效期：访问令牌 2小时，刷新令牌 7天
 * 3. 支持 Token 黑名单（登出后立即失效）
 * 4. 记录 Token 使用日志
 */
@Injectable()
export class JwtAuthService {
  private readonly logger = new Logger(JwtAuthService.name);

  // Token黑名单（生产环境应使用Redis）
  private tokenBlacklist: Set<string> = new Set();

  constructor(private readonly jwtService: JwtService) {}

  /**
   * 生成访问令牌
   */
  generateAccessToken(payload: { openid: string; nickname?: string }): string {
    const token = this.jwtService.sign(payload, {
      expiresIn: '2h', // 访问令牌有效期2小时
    });

    this.logger.debug(`生成访问令牌: openid=${payload.openid}`);
    return token;
  }

  /**
   * 生成刷新令牌
   */
  generateRefreshToken(payload: { openid: string }): string {
    const token = this.jwtService.sign(payload, {
      expiresIn: '7d', // 刷新令牌有效期7天
    });

    this.logger.debug(`生成刷新令牌: openid=${payload.openid}`);
    return token;
  }

  /**
   * 验证令牌
   */
  verifyToken(token: string): { openid: string; nickname?: string } {
    try {
      // 检查黑名单
      if (this.tokenBlacklist.has(token)) {
        this.logger.warn('令牌已在黑名单中');
        throw new UnauthorizedException('令牌已失效');
      }

      // 验证签名和有效期
      const payload = this.jwtService.verify(token);
      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.warn(`令牌验证失败: ${error.message}`);
      throw new UnauthorizedException('令牌无效或已过期');
    }
  }

  /**
   * 解析令牌（不验证签名，用于获取信息）
   */
  decodeToken(token: string): any {
    try {
      return this.jwtService.decode(token);
    } catch (error) {
      return null;
    }
  }

  /**
   * 将令牌加入黑名单（登出时调用）
   */
  revokeToken(token: string): void {
    this.tokenBlacklist.add(token);
    this.logger.debug('令牌已加入黑名单');

    // 定期清理过期的黑名单（生产环境应使用Redis并设置过期时间）
    this.cleanupBlacklist();
  }

  /**
   * 清理黑名单中过期的令牌
   */
  private cleanupBlacklist(): void {
    // 简单实现：黑名单超过1000条时清理
    if (this.tokenBlacklist.size > 1000) {
      this.tokenBlacklist.clear();
      this.logger.log('黑名单已清理');
    }
  }

  /**
   * 从请求中提取令牌
   */
  extractTokenFromRequest(request: Request): string | null {
    // 1. 从 Authorization header 提取
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 2. 从查询参数提取（仅用于特定场景）
    const queryToken = request.query.token as string;
    if (queryToken) {
      return queryToken;
    }

    return null;
  }

  /**
   * 验证请求中的令牌并返回用户信息
   */
  authenticate(request: Request): { openid: string; nickname?: string } | null {
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      return null;
    }

    try {
      return this.verifyToken(token);
    } catch {
      return null;
    }
  }

  /**
   * 生成令牌对（访问令牌 + 刷新令牌）
   */
  generateTokenPair(payload: { openid: string; nickname?: string }): {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  } {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken({ openid: payload.openid }),
      expiresIn: 7200, // 2小时，单位秒
    };
  }

  /**
   * 刷新访问令牌
   */
  refreshAccessToken(refreshToken: string): { accessToken: string; expiresIn: number } | null {
    try {
      const payload = this.verifyToken(refreshToken);

      return {
        accessToken: this.generateAccessToken(payload),
        expiresIn: 7200,
      };
    } catch {
      return null;
    }
  }
}
