"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMiddleware = void 0;
const common_1 = require("@nestjs/common");
let AuthMiddleware = class AuthMiddleware {
    use(req, res, next) {
        const token = req.headers['authorization']?.replace('Bearer ', '');
        if (token) {
            try {
                req.user = {
                    openid: 'test_openid_' + Date.now(),
                    nickname: '测试用户',
                    avatar: '',
                };
            }
            catch (error) {
                console.error('[Auth] Token verification failed:', error);
            }
        }
        if (!req.user) {
            req.user = {
                openid: 'anonymous_openid',
                nickname: '匿名用户',
                avatar: '',
            };
        }
        next();
    }
};
exports.AuthMiddleware = AuthMiddleware;
exports.AuthMiddleware = AuthMiddleware = __decorate([
    (0, common_1.Injectable)()
], AuthMiddleware);
//# sourceMappingURL=auth.middleware.js.map