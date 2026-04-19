"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var WechatConfigService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WechatConfigService = void 0;
const common_1 = require("@nestjs/common");
let WechatConfigService = WechatConfigService_1 = class WechatConfigService {
    constructor() {
        this.logger = new common_1.Logger(WechatConfigService_1.name);
        this.appId = process.env.WECHAT_APP_ID || '';
        this.appSecret = process.env.WECHAT_APP_SECRET || '';
        this.accessToken = '';
        this.tokenExpireTime = 0;
    }
    isConfigured() {
        return !!(this.appId && this.appSecret);
    }
    getAppId() {
        return this.appId;
    }
    async getAccessToken() {
        if (this.accessToken && Date.now() < this.tokenExpireTime) {
            return this.accessToken;
        }
        if (!this.isConfigured()) {
            throw new Error('微信小程序未配置，请设置 WECHAT_APP_ID 和 WECHAT_APP_SECRET 环境变量');
        }
        try {
            const response = await fetch(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`);
            const data = await response.json();
            if (data.errcode) {
                throw new Error(`获取 access_token 失败: ${data.errmsg} (${data.errcode})`);
            }
            this.accessToken = data.access_token;
            this.tokenExpireTime = Date.now() + (data.expires_in - 300) * 1000;
            this.logger.log('成功获取微信access_token');
            return this.accessToken;
        }
        catch (error) {
            this.logger.error(`获取access_token失败: ${error.message}`);
            throw error;
        }
    }
    async generateMiniProgramCode(scene, page = 'pages/scan/index', width = 430) {
        if (!this.isConfigured()) {
            this.logger.warn('微信小程序未配置，返回模拟二维码');
            return {
                base64: '',
                url: '',
                scene: scene,
            };
        }
        const shortScene = scene.replace(/-/g, '');
        if (shortScene.length > 32) {
            this.logger.error(`scene参数过长: ${shortScene.length}字符，最大允许32字符`);
            throw new Error(`scene参数过长，最大允许32字符`);
        }
        try {
            const accessToken = await this.getAccessToken();
            this.logger.log(`生成小程序码: 原始scene=${scene}, 编码后scene=${shortScene}`);
            const response = await fetch(`https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scene: shortScene,
                    page,
                    width,
                    auto_color: false,
                    line_color: { r: 196, g: 30, b: 58 },
                    is_hyaline: false,
                }),
            });
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                const errorData = await response.json();
                throw new Error(`生成小程序码失败: ${errorData.errmsg} (${errorData.errcode})`);
            }
            const imageBuffer = await response.arrayBuffer();
            const base64 = Buffer.from(imageBuffer).toString('base64');
            this.logger.log(`成功生成小程序码: shortScene=${shortScene}`);
            return {
                base64: `data:image/png;base64,${base64}`,
                url: '',
                scene: shortScene,
            };
        }
        catch (error) {
            this.logger.error(`生成小程序码失败: ${error.message}`);
            throw error;
        }
    }
    async login(code) {
        if (!this.isConfigured()) {
            this.logger.warn('微信小程序未配置，返回模拟openid');
            return {
                openid: `mock_openid_${Date.now()}`,
                sessionKey: 'mock_session_key',
            };
        }
        try {
            const response = await fetch(`https://api.weixin.qq.com/sns/jscode2session?appid=${this.appId}&secret=${this.appSecret}&js_code=${code}&grant_type=authorization_code`);
            const data = await response.json();
            if (data.errcode) {
                throw new Error(`微信登录失败: ${data.errmsg} (${data.errcode})`);
            }
            return {
                openid: data.openid,
                sessionKey: data.session_key,
            };
        }
        catch (error) {
            this.logger.error(`微信登录失败: ${error.message}`);
            throw error;
        }
    }
    async sendTemplateMessage(openid, templateId, data, page = 'pages/index/index') {
        if (!this.isConfigured()) {
            this.logger.warn('微信小程序未配置，跳过发送模板消息');
            return false;
        }
        try {
            const accessToken = await this.getAccessToken();
            const response = await fetch(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    touser: openid,
                    template_id: templateId,
                    page,
                    data,
                }),
            });
            const result = await response.json();
            if (result.errcode) {
                throw new Error(`发送模板消息失败: ${result.errmsg} (${result.errcode})`);
            }
            this.logger.log(`成功发送模板消息: openid=${openid}`);
            return true;
        }
        catch (error) {
            this.logger.error(`发送模板消息失败: ${error.message}`);
            return false;
        }
    }
};
exports.WechatConfigService = WechatConfigService;
exports.WechatConfigService = WechatConfigService = WechatConfigService_1 = __decorate([
    (0, common_1.Injectable)()
], WechatConfigService);
//# sourceMappingURL=wechat-config.service.js.map