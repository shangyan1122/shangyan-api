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
var AuthGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequireAuth = exports.Public = exports.AuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
let AuthGuard = AuthGuard_1 = class AuthGuard {
    constructor(reflector, jwtAuthService) {
        this.reflector = reflector;
        this.jwtAuthService = jwtAuthService;
        this.logger = new common_1.Logger(AuthGuard_1.name);
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const isPublic = this.reflector.get('isPublic', context.getHandler());
        if (isPublic) {
            return true;
        }
        const user = this.authenticate(request);
        if (!user || !user.openid) {
            this.logger.warn('未授权访问: 缺少有效的用户身份标识');
            throw new common_1.UnauthorizedException('请先登录');
        }
        request.user = {
            openid: user.openid,
            nickname: user.nickname || request.headers['x-wx-nickname'] || '',
            avatar: request.headers['x-wx-avatar'] || '',
        };
        return true;
    }
    authenticate(request) {
        if (this.jwtAuthService) {
            const user = this.jwtAuthService.authenticate(request);
            if (user) {
                this.logger.debug(`JWT认证成功: openid=${user.openid}`);
                return user;
            }
        }
        const openid = this.extractOpenidLegacy(request);
        if (openid) {
            return { openid };
        }
        return null;
    }
    extractOpenidLegacy(request) {
        const authHeader = request.headers['authorization'];
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            if (token && token !== 'null' && token !== 'undefined') {
                const parts = token.split('_');
                if (parts.length >= 2 && parts[1] && parts[0] === 'token') {
                    return parts[1];
                }
                return null;
            }
        }
        const wxOpenid = request.headers['x-wx-openid'];
        if (wxOpenid) {
            if (this.isValidOpenid(wxOpenid)) {
                return wxOpenid;
            }
        }
        const bodyOpenid = request.body?.openid;
        if (bodyOpenid && this.isValidOpenid(bodyOpenid)) {
            this.logger.debug('从请求体获取openid（不推荐）');
            return bodyOpenid;
        }
        const queryOpenid = request.query.openid;
        if (queryOpenid && this.isValidOpenid(queryOpenid)) {
            this.logger.debug('从查询参数获取openid（不推荐）');
            return queryOpenid;
        }
        return null;
    }
    isValidOpenid(openid) {
        if (!openid || typeof openid !== 'string') {
            return false;
        }
        const validPattern = /^[a-zA-Z0-9_\-]{10,100}$/;
        return validPattern.test(openid);
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = AuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __param(1, (0, common_1.Inject)('JwtAuthService')),
    __metadata("design:paramtypes", [core_1.Reflector, Object])
], AuthGuard);
const Public = () => (0, common_1.SetMetadata)('isPublic', true);
exports.Public = Public;
const RequireAuth = () => (0, common_1.applyDecorators)((0, common_1.UseGuards)(AuthGuard));
exports.RequireAuth = RequireAuth;
//# sourceMappingURL=auth.guard.js.map