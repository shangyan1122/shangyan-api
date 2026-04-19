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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminRecommendOfficerController = exports.RecommendOfficerController = void 0;
const common_1 = require("@nestjs/common");
const recommend_officer_service_1 = require("./recommend-officer.service");
let RecommendOfficerController = class RecommendOfficerController {
    constructor(service) {
        this.service = service;
    }
    async apply(body, req) {
        const openid = body.openid || req.headers['x-wx-openid'] || 'test_openid_123';
        if (!body.realName || body.realName.trim().length < 2) {
            return { code: 400, msg: '请输入真实姓名' };
        }
        return this.service.apply(openid, body.realName.trim(), body.idCard, body.phone);
    }
    async getStatus(openid, req) {
        const userOpenid = openid || req.headers['x-wx-openid'] || 'test_openid_123';
        return this.service.getStatus(userOpenid);
    }
    async getInvitees(openid, req) {
        const userOpenid = openid || req.headers['x-wx-openid'] || 'test_openid_123';
        return this.service.getInvitees(userOpenid);
    }
    async bindUser(body, req) {
        const userOpenid = body.openid || req.headers['x-wx-openid'] || 'test_openid_123';
        if (!body.officerId) {
            return { code: 400, msg: '缺少推荐官ID' };
        }
        const { getSupabaseClient } = await Promise.resolve().then(() => __importStar(require('@/storage/database/supabase-client')));
        const supabase = getSupabaseClient();
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('openid', userOpenid)
            .single();
        if (!user) {
            return { code: 400, msg: '用户不存在' };
        }
        return this.service.bindUser(body.officerId, user.id);
    }
};
exports.RecommendOfficerController = RecommendOfficerController;
__decorate([
    (0, common_1.Post)('apply'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RecommendOfficerController.prototype, "apply", null);
__decorate([
    (0, common_1.Get)('status'),
    __param(0, (0, common_1.Query)('openid')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RecommendOfficerController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)('invitees'),
    __param(0, (0, common_1.Query)('openid')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RecommendOfficerController.prototype, "getInvitees", null);
__decorate([
    (0, common_1.Post)('bind'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RecommendOfficerController.prototype, "bindUser", null);
exports.RecommendOfficerController = RecommendOfficerController = __decorate([
    (0, common_1.Controller)('recommend-officer'),
    __metadata("design:paramtypes", [recommend_officer_service_1.RecommendOfficerService])
], RecommendOfficerController);
let AdminRecommendOfficerController = class AdminRecommendOfficerController {
    constructor(service) {
        this.service = service;
    }
    async getList(page, pageSize, status, keyword) {
        return this.service.getList({
            page: page ? parseInt(page) : 1,
            pageSize: pageSize ? parseInt(pageSize) : 20,
            status,
            keyword,
        });
    }
    async getDetail(id) {
        return this.service.getDetail(id);
    }
    async updateOfficer(id, body) {
        return this.service.updateOfficer(id, body);
    }
};
exports.AdminRecommendOfficerController = AdminRecommendOfficerController;
__decorate([
    (0, common_1.Get)('list'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('pageSize')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('keyword')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminRecommendOfficerController.prototype, "getList", null);
__decorate([
    (0, common_1.Get)('detail/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminRecommendOfficerController.prototype, "getDetail", null);
__decorate([
    (0, common_1.Put)('update/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminRecommendOfficerController.prototype, "updateOfficer", null);
exports.AdminRecommendOfficerController = AdminRecommendOfficerController = __decorate([
    (0, common_1.Controller)('admin/recommend-officer'),
    __metadata("design:paramtypes", [recommend_officer_service_1.RecommendOfficerService])
], AdminRecommendOfficerController);
//# sourceMappingURL=recommend-officer.controller.js.map