"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AdminAuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const supabase_client_1 = require("../../storage/database/supabase-client");
const tencent_sms_service_1 = require("../../common/services/tencent-sms.service");
const jwt = __importStar(require("jsonwebtoken"));
const verificationCodes = new Map();
const ALLOWED_ADMIN_PHONES = new Set();
let AdminAuthService = AdminAuthService_1 = class AdminAuthService {
    constructor(configService, smsService) {
        this.configService = configService;
        this.smsService = smsService;
        this.logger = new common_1.Logger(AdminAuthService_1.name);
        this.codeExpireMinutes = 5;
        this.maxCodeAttempts = 5;
        this.codeCleanInterval = 60000;
        this.jwtSecret =
            this.configService.get('JWT_SECRET') || 'shangyan-admin-secret-key-2024';
        const allowedPhones = this.configService.get('ADMIN_ALLOWED_PHONES') || '';
        if (allowedPhones) {
            allowedPhones.split(',').forEach((phone) => {
                const trimmed = phone.trim();
                if (trimmed) {
                    ALLOWED_ADMIN_PHONES.add(trimmed);
                }
            });
        }
        if (ALLOWED_ADMIN_PHONES.size === 0) {
            this.logger.warn('⚠️ 未配置 ADMIN_ALLOWED_PHONES，允许所有手机号登录（开发模式）');
        }
        else {
            this.logger.log(`✅ 已加载 ${ALLOWED_ADMIN_PHONES.size} 个授权管理员手机号`);
        }
        this.startCodeCleanup();
    }
    startCodeCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [phone, data] of verificationCodes.entries()) {
                if (now > data.expireTime) {
                    verificationCodes.delete(phone);
                }
            }
        }, this.codeCleanInterval);
    }
    isPhoneAuthorized(phone) {
        if (ALLOWED_ADMIN_PHONES.size === 0) {
            return true;
        }
        return ALLOWED_ADMIN_PHONES.has(phone);
    }
    getAuthorizedPhones() {
        return Array.from(ALLOWED_ADMIN_PHONES);
    }
    async sendLoginCode(phone) {
        this.logger.log(`发送登录验证码请求: phone=${phone}`);
        if (!/^1[3-9]\d{9}$/.test(phone)) {
            return { code: 400, msg: '请输入正确的手机号', data: null };
        }
        if (!this.isPhoneAuthorized(phone)) {
            this.logger.warn(`未授权手机号尝试登录: phone=${phone}`);
            return { code: 403, msg: '该手机号未授权登录管理后台', data: null };
        }
        const existingCode = verificationCodes.get(phone);
        if (existingCode && Date.now() - existingCode.expireTime < -60000) {
            const remainingSeconds = Math.ceil((60000 - (Date.now() - existingCode.expireTime)) / 1000);
            if (remainingSeconds > 0) {
                return { code: 429, msg: `请${remainingSeconds}秒后再试`, data: null };
            }
        }
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expireTime = Date.now() + this.codeExpireMinutes * 60 * 1000;
        verificationCodes.set(phone, { code, expireTime, attempts: 0 });
        const smsResult = await this.smsService.sendLoginCode(phone, code);
        if (!smsResult.success) {
            this.logger.error(`发送验证码失败: ${smsResult.error}`);
            return { code: 200, msg: '验证码已发送', data: null };
        }
        this.logger.log(`验证码已发送: phone=${phone}, code=${code}`);
        return { code: 200, msg: '验证码已发送', data: null };
    }
    async login(phone, code) {
        this.logger.log(`管理员登录: phone=${phone}`);
        if (!/^1[3-9]\d{9}$/.test(phone)) {
            return { code: 400, msg: '手机号格式不正确', data: null };
        }
        if (!/^\d{6}$/.test(code)) {
            return { code: 400, msg: '验证码为6位数字', data: null };
        }
        if (!this.isPhoneAuthorized(phone)) {
            this.logger.warn(`未授权手机号尝试登录: phone=${phone}`);
            return { code: 403, msg: '该手机号未授权登录管理后台', data: null };
        }
        const storedCode = verificationCodes.get(phone);
        if (!storedCode) {
            return { code: 400, msg: '请先获取验证码', data: null };
        }
        if (Date.now() > storedCode.expireTime) {
            verificationCodes.delete(phone);
            return { code: 400, msg: '验证码已过期，请重新获取', data: null };
        }
        storedCode.attempts++;
        if (storedCode.attempts > this.maxCodeAttempts) {
            verificationCodes.delete(phone);
            return { code: 400, msg: '验证次数过多，请重新获取验证码', data: null };
        }
        if (storedCode.code !== code) {
            const remainingAttempts = this.maxCodeAttempts - storedCode.attempts;
            this.logger.warn(`验证码错误: phone=${phone}, 剩余尝试次数=${remainingAttempts}`);
            return {
                code: 400,
                msg: remainingAttempts > 0
                    ? `验证码错误，剩余${remainingAttempts}次机会`
                    : '验证次数过多，请重新获取验证码',
                data: null,
            };
        }
        verificationCodes.delete(phone);
        const admin = await this.findOrCreateAdmin(phone);
        if (!admin) {
            return { code: 500, msg: '登录失败', data: null };
        }
        const token = this.generateToken(admin);
        this.logger.log(`管理员登录成功: phone=${phone}, id=${admin.id}`);
        return {
            code: 200,
            msg: '登录成功',
            data: {
                token,
                user: {
                    id: admin.id,
                    phone: admin.phone,
                    name: admin.name,
                    role: admin.role,
                },
            },
        };
    }
    async findOrCreateAdmin(phone) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data: admin, error } = await client
            .from('admins')
            .select('*')
            .eq('phone', phone)
            .single();
        if (!error && admin) {
            return admin;
        }
        const newAdmin = {
            phone,
            name: `管理员${phone.slice(-4)}`,
            role: 'admin',
            status: 'active',
            created_at: new Date().toISOString(),
        };
        const { data: created, error: createError } = await client
            .from('admins')
            .insert(newAdmin)
            .select()
            .single();
        if (createError) {
            this.logger.error(`创建管理员失败: ${createError.message}`);
            return null;
        }
        return created;
    }
    async getProfile(adminId) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data: admin, error } = await client
            .from('admins')
            .select('id, phone, name, role, status, created_at')
            .eq('id', adminId)
            .single();
        if (error || !admin) {
            return { code: 404, msg: '管理员不存在', data: null };
        }
        return { code: 200, msg: 'success', data: admin };
    }
    async getAdminList() {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data: admins, error } = await client
            .from('admins')
            .select('id, phone, name, role, status, created_at, last_login_at')
            .order('created_at', { ascending: false });
        if (error) {
            this.logger.error('查询管理员列表失败:', error);
            return { code: 500, msg: '查询失败', data: [] };
        }
        return { code: 200, msg: 'success', data: admins || [] };
    }
    async updateAdmin(adminId, updates) {
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { error } = await client
            .from('admins')
            .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
            .eq('id', adminId);
        if (error) {
            this.logger.error(`更新管理员失败: ${error.message}`);
            return { code: 500, msg: '更新失败' };
        }
        return { code: 200, msg: '更新成功' };
    }
    generateToken(admin) {
        return jwt.sign({
            id: admin.id,
            phone: admin.phone,
            role: admin.role,
        }, this.jwtSecret, { expiresIn: '7d' });
    }
    verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        }
        catch {
            return null;
        }
    }
    async refreshToken(token) {
        const decoded = this.verifyToken(token);
        if (!decoded) {
            return { code: 401, msg: 'Token无效', data: null };
        }
        const client = (0, supabase_client_1.getSupabaseClient)();
        const { data: admin, error } = await client
            .from('admins')
            .select('*')
            .eq('id', decoded.id)
            .single();
        if (error || !admin) {
            return { code: 401, msg: '管理员不存在', data: null };
        }
        const newToken = this.generateToken(admin);
        return { code: 200, msg: '刷新成功', data: { token: newToken } };
    }
};
exports.AdminAuthService = AdminAuthService;
exports.AdminAuthService = AdminAuthService = AdminAuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        tencent_sms_service_1.TencentSmsService])
], AdminAuthService);
//# sourceMappingURL=admin-auth.service.js.map