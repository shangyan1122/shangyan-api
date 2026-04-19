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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIController = void 0;
const common_1 = require("@nestjs/common");
const unified_ai_service_1 = require("./unified-ai.service");
const siliconflow_service_1 = require("./siliconflow.service");
const ai_config_1 = require("./ai-config");
const supabase_client_1 = require("../../storage/database/supabase-client");
let AIController = class AIController {
    constructor(aiService, siliconflowService) {
        this.aiService = aiService;
        this.siliconflowService = siliconflowService;
    }
    async getStatus() {
        const config = (0, ai_config_1.getAIConfig)();
        const validation = (0, ai_config_1.validateAIConfig)(config);
        const models = this.siliconflowService.getAvailableModels();
        return {
            code: 200,
            message: 'success',
            data: {
                provider: config.provider,
                configured: validation.valid,
                errors: validation.errors,
                models: models,
            },
        };
    }
    async getModels() {
        const models = this.siliconflowService.getAvailableModels();
        return {
            code: 200,
            message: 'success',
            data: { models },
        };
    }
    async generateBlessing(body) {
        const result = await this.aiService.generateBlessing({
            banquetType: body.banquetType,
            banquetName: body.banquetName,
            guestName: body.guestName,
        });
        return {
            code: result.code,
            message: result.message,
            data: result.data ? { blessing: result.data.blessing } : null,
            error: result.error,
        };
    }
    async generateWelcome(body) {
        const result = await this.aiService.generateWelcome({
            banquetType: body.banquetType,
            banquetName: body.banquetName,
            hostName: body.hostName,
            photos: body.photos,
        });
        return {
            code: result.code,
            message: result.message,
            data: result.data ? { welcome: result.data.welcome } : null,
            error: result.error,
        };
    }
    async generateThanks(body) {
        const result = await this.aiService.generateThanks({
            banquetType: body.banquetType,
            banquetName: body.banquetName,
            hostName: body.hostName,
            photos: body.photos,
        });
        return {
            code: result.code,
            message: result.message,
            data: result.data ? { thanks: result.data.thanks } : null,
            error: result.error,
        };
    }
    async regenerateCard(body) {
        try {
            const result = await this.aiService.regenerateCard({
                type: body.type,
                banquetType: body.banquetType,
                banquetName: body.banquetName,
                photos: body.photos,
                isPaid: body.isPaid,
            });
            if (result.code !== 200 || !result.data) {
                return {
                    code: result.code,
                    message: result.error || '生成失败',
                    data: null,
                };
            }
            const fieldName = body.type === 'welcome' ? 'ai_welcome_page' : 'ai_thank_page';
            const client = (0, supabase_client_1.getSupabaseClient)();
            const { error } = await client
                .from('banquets')
                .update({ [fieldName]: result.data.content })
                .eq('id', body.banquetId);
            if (error) {
                return {
                    code: 500,
                    message: '更新失败',
                    data: null,
                };
            }
            return {
                code: 200,
                message: 'success',
                data: { content: result.data.content },
            };
        }
        catch (error) {
            console.error('重新生成AI卡片失败:', error);
            return {
                code: 500,
                message: '生成失败',
                data: null,
            };
        }
    }
    async generateGuestWelcome(body) {
        try {
            const result = await this.aiService.generateWelcome({
                banquetType: body.banquetType,
                banquetName: body.banquetName,
                hostName: body.hostName,
            });
            if (result.code !== 200 || !result.data) {
                return {
                    code: result.code,
                    message: result.error || '生成失败',
                    data: null,
                };
            }
            const content = `${body.guestName}，${result.data.welcome}`;
            const client = (0, supabase_client_1.getSupabaseClient)();
            const { error } = await client.from('guest_ai_cards').upsert({
                banquet_id: body.banquetId,
                guest_name: body.guestName,
                card_type: 'welcome',
                content: content,
                created_at: new Date().toISOString(),
            }, {
                onConflict: 'banquet_id,guest_name,card_type',
            });
            if (error) {
                return {
                    code: 500,
                    message: '保存失败',
                    data: null,
                };
            }
            return {
                code: 200,
                message: 'success',
                data: { content },
            };
        }
        catch (error) {
            console.error('生成嘉宾欢迎卡失败:', error);
            return {
                code: 500,
                message: '生成失败',
                data: null,
            };
        }
    }
    async generateGuestThanks(body) {
        try {
            const result = await this.aiService.generateThanks({
                banquetType: body.banquetType,
                banquetName: body.banquetName,
            });
            if (result.code !== 200 || !result.data) {
                return {
                    code: result.code,
                    message: result.error || '生成失败',
                    data: null,
                };
            }
            const content = `${body.guestName}，${result.data.thanks}`;
            const client = (0, supabase_client_1.getSupabaseClient)();
            const { error } = await client.from('guest_ai_cards').upsert({
                banquet_id: body.banquetId,
                guest_name: body.guestName,
                card_type: 'thank',
                content: content,
                created_at: new Date().toISOString(),
            }, {
                onConflict: 'banquet_id,guest_name,card_type',
            });
            if (error) {
                return {
                    code: 500,
                    message: '保存失败',
                    data: null,
                };
            }
            return {
                code: 200,
                message: 'success',
                data: { content },
            };
        }
        catch (error) {
            console.error('生成嘉宾感谢卡失败:', error);
            return {
                code: 500,
                message: '生成失败',
                data: null,
            };
        }
    }
    async getGuestCard(body) {
        try {
            const client = (0, supabase_client_1.getSupabaseClient)();
            const { data, error } = await client
                .from('guest_ai_cards')
                .select('content')
                .eq('banquet_id', body.banquetId)
                .eq('guest_name', body.guestName)
                .eq('card_type', body.cardType)
                .single();
            if (error || !data) {
                return {
                    code: 404,
                    message: '未找到专属卡片',
                    data: null,
                };
            }
            return {
                code: 200,
                message: 'success',
                data: { content: data.content },
            };
        }
        catch (error) {
            console.error('获取嘉宾卡片失败:', error);
            return {
                code: 500,
                message: '获取失败',
                data: null,
            };
        }
    }
};
exports.AIController = AIController;
__decorate([
    (0, common_1.Get)('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AIController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)('models'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AIController.prototype, "getModels", null);
__decorate([
    (0, common_1.Post)('generate-blessing'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AIController.prototype, "generateBlessing", null);
__decorate([
    (0, common_1.Post)('generate-welcome'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AIController.prototype, "generateWelcome", null);
__decorate([
    (0, common_1.Post)('generate-thanks'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AIController.prototype, "generateThanks", null);
__decorate([
    (0, common_1.Post)('regenerate-card'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AIController.prototype, "regenerateCard", null);
__decorate([
    (0, common_1.Post)('generate-guest-welcome'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AIController.prototype, "generateGuestWelcome", null);
__decorate([
    (0, common_1.Post)('generate-guest-thanks'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AIController.prototype, "generateGuestThanks", null);
__decorate([
    (0, common_1.Post)('get-guest-card'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AIController.prototype, "getGuestCard", null);
exports.AIController = AIController = __decorate([
    (0, common_1.Controller)('ai'),
    __metadata("design:paramtypes", [unified_ai_service_1.UnifiedAIService,
        siliconflow_service_1.SiliconflowService])
], AIController);
//# sourceMappingURL=ai.controller.js.map