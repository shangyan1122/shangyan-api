"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const wechat_config_service_1 = require("../../common/services/wechat-config.service");
const supabase_client_1 = require("../../storage/database/supabase-client");
const auth_guard_1 = require("../../common/guards/auth.guard");
let AuthController = AuthController_1 = class AuthController {
    constructor(wechatConfigService) {
        this.wechatConfigService = wechatConfigService;
        this.logger = new common_1.Logger(AuthController_1.name);
    }
    async login(body) {
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
            const { openid, sessionKey } = await this.wechatConfigService.login(code);
            this.logger.log(`微信登录成功: openid=${openid}`);
            const client = (0, supabase_client_1.getSupabaseClient)();
            let { data: user, error } = await client
                .from('users')
                .select('*')
                .eq('openid', openid)
                .single();
            if (!user) {
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
                        avatar: user.avatar_url || '',
                        phone: user.phone || '',
                        isVip: false,
                        vipExpireDate: '',
                    },
                },
            };
        }
        catch (error) {
            this.logger.error(`微信登录失败: ${error.message}`);
            return {
                code: 500,
                msg: error.message || '登录失败',
                data: null,
            };
        }
    }
    async guestLogin(body) {
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
            const client = (0, supabase_client_1.getSupabaseClient)();
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
                        avatar: user?.avatar_url || '',
                        phone: user?.phone || '',
                        isVip: false,
                        vipExpireDate: '',
                    },
                },
            };
        }
        catch (error) {
            this.logger.error(`游客登录失败: ${error.message}`);
            return {
                code: 500,
                msg: '登录失败',
                data: null,
            };
        }
    }
    async getUserInfo(openid) {
        if (!openid) {
            return {
                code: 401,
                msg: '未登录',
                data: null,
            };
        }
        try {
            const client = (0, supabase_client_1.getSupabaseClient)();
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
                    isVip: false,
                    vipExpireDate: '',
                },
            };
        }
        catch (error) {
            this.logger.error(`获取用户信息失败: ${error.message}`);
            return {
                code: 500,
                msg: '获取用户信息失败',
                data: null,
            };
        }
    }
    async updateProfile(body) {
        const { openid, nickname, avatar } = body;
        if (!openid) {
            return {
                code: 401,
                msg: '未登录',
                data: null,
            };
        }
        try {
            const client = (0, supabase_client_1.getSupabaseClient)();
            const updateData = { updated_at: new Date().toISOString() };
            if (nickname)
                updateData.nickname = nickname;
            if (avatar)
                updateData.avatar_url = avatar;
            const { error } = await client.from('users').update(updateData).eq('openid', openid);
            if (error) {
                throw new Error(error.message);
            }
            return {
                code: 200,
                msg: '更新成功',
                data: null,
            };
        }
        catch (error) {
            this.logger.error(`更新用户信息失败: ${error.message}`);
            return {
                code: 500,
                msg: '更新失败',
                data: null,
            };
        }
    }
    async checkLogin(openid) {
        if (!openid) {
            return {
                code: 401,
                msg: '未登录',
                data: { isLogin: false },
            };
        }
        try {
            const client = (0, supabase_client_1.getSupabaseClient)();
            const { data: user } = await client.from('users').select('id').eq('openid', openid).single();
            return {
                code: 200,
                msg: 'success',
                data: {
                    isLogin: !!user,
                    openid,
                },
            };
        }
        catch {
            return {
                code: 200,
                msg: 'success',
                data: {
                    isLogin: false,
                },
            };
        }
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('login'),
    (0, auth_guard_1.Public)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('guest'),
    (0, auth_guard_1.Public)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "guestLogin", null);
__decorate([
    (0, common_1.Get)('userinfo'),
    __param(0, (0, common_1.Query)('openid')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getUserInfo", null);
__decorate([
    (0, common_1.Post)('update-profile'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Get)('check'),
    __param(0, (0, common_1.Query)('openid')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "checkLogin", null);
exports.AuthController = AuthController = AuthController_1 = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [wechat_config_service_1.WechatConfigService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map