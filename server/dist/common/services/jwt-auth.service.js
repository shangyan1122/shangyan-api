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
var JwtAuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
let JwtAuthService = JwtAuthService_1 = class JwtAuthService {
    constructor(jwtService) {
        this.jwtService = jwtService;
        this.logger = new common_1.Logger(JwtAuthService_1.name);
        this.tokenBlacklist = new Set();
    }
    generateAccessToken(payload) {
        const token = this.jwtService.sign(payload, {
            expiresIn: '2h',
        });
        this.logger.debug(`生成访问令牌: openid=${payload.openid}`);
        return token;
    }
    generateRefreshToken(payload) {
        const token = this.jwtService.sign(payload, {
            expiresIn: '7d',
        });
        this.logger.debug(`生成刷新令牌: openid=${payload.openid}`);
        return token;
    }
    verifyToken(token) {
        try {
            if (this.tokenBlacklist.has(token)) {
                this.logger.warn('令牌已在黑名单中');
                throw new common_1.UnauthorizedException('令牌已失效');
            }
            const payload = this.jwtService.verify(token);
            return payload;
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            this.logger.warn(`令牌验证失败: ${error.message}`);
            throw new common_1.UnauthorizedException('令牌无效或已过期');
        }
    }
    decodeToken(token) {
        try {
            return this.jwtService.decode(token);
        }
        catch (error) {
            return null;
        }
    }
    revokeToken(token) {
        this.tokenBlacklist.add(token);
        this.logger.debug('令牌已加入黑名单');
        this.cleanupBlacklist();
    }
    cleanupBlacklist() {
        if (this.tokenBlacklist.size > 1000) {
            this.tokenBlacklist.clear();
            this.logger.log('黑名单已清理');
        }
    }
    extractTokenFromRequest(request) {
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        const queryToken = request.query.token;
        if (queryToken) {
            return queryToken;
        }
        return null;
    }
    authenticate(request) {
        const token = this.extractTokenFromRequest(request);
        if (!token) {
            return null;
        }
        try {
            return this.verifyToken(token);
        }
        catch {
            return null;
        }
    }
    generateTokenPair(payload) {
        return {
            accessToken: this.generateAccessToken(payload),
            refreshToken: this.generateRefreshToken({ openid: payload.openid }),
            expiresIn: 7200,
        };
    }
    refreshAccessToken(refreshToken) {
        try {
            const payload = this.verifyToken(refreshToken);
            return {
                accessToken: this.generateAccessToken(payload),
                expiresIn: 7200,
            };
        }
        catch {
            return null;
        }
    }
};
exports.JwtAuthService = JwtAuthService;
exports.JwtAuthService = JwtAuthService = JwtAuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], JwtAuthService);
//# sourceMappingURL=jwt-auth.service.js.map