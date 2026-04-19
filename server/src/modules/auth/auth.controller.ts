import { Controller, Post, Body, Get, Query, Logger, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { WechatConfigService } from '@/common/services/wechat-config.service';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { Public } from '@/common/guards/auth.guard';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly wechatConfigService: WechatConfigService) {}

  /**
   * 微信一键登录
   * 通过 wx.login 获取的 code 换取 openid 和 session_key
   */
  @Post('login')
  @Public()
  async login(@Body() body: { code: string }) {
    const { code } = body;

    if (!code) {
      return {
        code: 400,
        msg: '缺少登录凭证',
        data: null,
      };
    }

    this.logger.log(`微信登录: code=${code}`);

    try {
      // 1. 调用微信接口获取 openid 和 session_key
      const { openid, sessionKey } = await this.wechatConfigService.login(code);

      this.logger.log(`微信登录成功: openid=${openid}`);

      // 2. 查询或创建用户
      const client = getSupabaseClient();
      let { data: user, error } = await client
        .from('users')
        .select('*')
        .eq('openid', openid)
        .single();

      if (!user) {
        // 创建新用户
        const { data: newUser, error: createError } = await client
          .from('users')
          .insert({
            openid,
            nickname: '新用户',
          })
          .select()
          .single();

        if (createError) {
          this.logger.error('创建用户失败:', createError);
          return {
            code: 500,
            msg: '创建用户失败',
            data: null,
          };
        }
        user = newUser;
      }

      // 3. 生成 token（实际项目应该使用 JWT）
      const token = `token_${openid}_${Date.now()}`;

      return {
        code: 200,
        msg: 'success',
        data: {
          openid,
          token,
          userInfo: {
            id: user.id,
            nickname: user.nickname || '用户',
            avatar: user.avatar_url || '', // 使用数据库中的 avatar_url 字段
            phone: user.phone || '',
            isVip: false, // users 表暂无此字段，默认为 false
            vipExpireDate: '', // users 表暂无此字段
          },
        },
      };
    } catch (error: any) {
      this.logger.error(`微信登录失败: ${error.message}`);
      return {
        code: 500,
        msg: error.message || '登录失败',
        data: null,
      };
    }
  }

  /**
   * 游客登录（H5调试用）
   */
  @Post('guest')
  @Public()
  async guestLogin(@Body() body: { openid: string }) {
    const { openid } = body;

    if (!openid) {
      return {
        code: 400,
        msg: '缺少 openid',
        data: null,
      };
    }

    this.logger.log(`游客登录: openid=${openid}`);

    try {
      const client = getSupabaseClient();

      // 查询或创建用户
      let { data: user } = await client.from('users').select('*').eq('openid', openid).single();

      if (!user) {
        const { data: newUser } = await client
          .from('users')
          .insert({
            openid,
            nickname: '游客用户',
          })
          .select()
          .single();
        user = newUser;
      }

      const token = `token_${openid}_${Date.now()}`;

      return {
        code: 200,
        msg: 'success',
        data: {
          openid,
          token,
          userInfo: {
            id: user?.id,
            nickname: user?.nickname || '游客用户',
            avatar: user?.avatar_url || '', // 使用数据库中的 avatar_url 字段
            phone: user?.phone || '',
            isVip: false, // users 表暂无此字段，默认为 false
            vipExpireDate: '', // users 表暂无此字段
          },
        },
      };
    } catch (error: any) {
      this.logger.error(`游客登录失败: ${error.message}`);
      return {
        code: 500,
        msg: '登录失败',
        data: null,
      };
    }
  }

  /**
   * 获取用户信息
   */
  @Get('userinfo')
  async getUserInfo(@Query('openid') openid: string) {
    if (!openid) {
      return {
        code: 401,
        msg: '未登录',
        data: null,
      };
    }

    try {
      const client = getSupabaseClient();
      const { data: user, error } = await client
        .from('users')
        .select('*')
        .eq('openid', openid)
        .single();

      if (error || !user) {
        return {
          code: 404,
          msg: '用户不存在',
          data: null,
        };
      }

      return {
        code: 200,
        msg: 'success',
        data: {
          id: user.id,
          openid: user.openid,
          nickname: user.nickname,
          avatar: user.avatar_url || '',
          phone: user.phone || '',
          isVip: false, // users 表暂无此字段
          vipExpireDate: '', // users 表暂无此字段
        },
      };
    } catch (error: any) {
      this.logger.error(`获取用户信息失败: ${error.message}`);
      return {
        code: 500,
        msg: '获取用户信息失败',
        data: null,
      };
    }
  }

  /**
   * 更新用户信息
   */
  @Post('update-profile')
  async updateProfile(@Body() body: { openid: string; nickname?: string; avatar?: string }) {
    const { openid, nickname, avatar } = body;

    if (!openid) {
      return {
        code: 401,
        msg: '未登录',
        data: null,
      };
    }

    try {
      const client = getSupabaseClient();

      const updateData: any = { updated_at: new Date().toISOString() };
      if (nickname) updateData.nickname = nickname;
      if (avatar) updateData.avatar_url = avatar; // 使用数据库中的 avatar_url 字段

      const { error } = await client.from('users').update(updateData).eq('openid', openid);

      if (error) {
        throw new Error(error.message);
      }

      return {
        code: 200,
        msg: '更新成功',
        data: null,
      };
    } catch (error: any) {
      this.logger.error(`更新用户信息失败: ${error.message}`);
      return {
        code: 500,
        msg: '更新失败',
        data: null,
      };
    }
  }

  /**
   * 检查登录状态
   */
  @Get('check')
  async checkLogin(@Query('openid') openid: string) {
    if (!openid) {
      return {
        code: 401,
        msg: '未登录',
        data: { isLogin: false },
      };
    }

    try {
      const client = getSupabaseClient();
      const { data: user } = await client.from('users').select('id').eq('openid', openid).single();

      return {
        code: 200,
        msg: 'success',
        data: {
          isLogin: !!user,
          openid,
        },
      };
    } catch {
      return {
        code: 200,
        msg: 'success',
        data: {
          isLogin: false,
        },
      };
    }
  }
}
