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
var OnsiteGiftController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnsiteGiftController = void 0;
const common_1 = require("@nestjs/common");
const supabase_client_1 = require("../../storage/database/supabase-client");
const auth_guard_1 = require("../../common/guards/auth.guard");
let OnsiteGiftController = OnsiteGiftController_1 = class OnsiteGiftController {
    constructor() {
        this.logger = new common_1.Logger(OnsiteGiftController_1.name);
    }
    async generateClaimCode(body) {
        this.logger.log(`生成领取码: banquetId=${body.banquetId}, guest=${body.guestOpenid}`);
        try {
            const client = (0, supabase_client_1.getSupabaseClient)();
            const { data: banquet, error: banquetError } = await client
                .from('banquets')
                .select('*')
                .eq('id', body.banquetId)
                .single();
            if (banquetError || !banquet) {
                return { code: 404, msg: '宴会不存在', data: null };
            }
            const returnGiftConfig = banquet.return_gift_config;
            if (!returnGiftConfig?.onsiteGifts?.enabled) {
                return { code: 400, msg: '该宴会未启用现场礼品', data: null };
            }
            const { data: onsiteGifts, error: giftsError } = await client
                .from('onsite_gifts')
                .select('*')
                .eq('banquet_id', body.banquetId)
                .gt('remaining_count', 0);
            if (giftsError || !onsiteGifts || onsiteGifts.length === 0) {
                return { code: 400, msg: '暂无可领取的礼品', data: null };
            }
            const codes = [];
            for (const gift of onsiteGifts) {
                const code = this.generateRandomCode();
                const { data: claimCode, error: insertError } = await client
                    .from('gift_claim_codes')
                    .insert({
                    code,
                    banquet_id: body.banquetId,
                    gift_id: gift.id,
                    gift_name: gift.name,
                    gift_image: gift.image,
                    guest_openid: body.guestOpenid,
                    guest_name: body.guestName || null,
                    status: 'claimed',
                    claimed_at: new Date().toISOString(),
                })
                    .select()
                    .single();
                if (!insertError && claimCode) {
                    codes.push({
                        code: claimCode.code,
                        giftId: gift.id,
                        giftName: gift.name,
                        giftImage: gift.image,
                    });
                    await client
                        .from('onsite_gifts')
                        .update({ remaining_count: gift.remaining_count - 1 })
                        .eq('id', gift.id);
                }
            }
            return {
                code: 200,
                msg: '领取码生成成功',
                data: { codes },
            };
        }
        catch (error) {
            this.logger.error(`生成领取码异常: ${error.message}`);
            return { code: 500, msg: '生成领取码失败', data: null };
        }
    }
    async getMyCodes(banquetId, guestOpenid) {
        this.logger.log(`查询领取码: banquetId=${banquetId}, guest=${guestOpenid}`);
        try {
            const client = (0, supabase_client_1.getSupabaseClient)();
            const { data, error } = await client
                .from('gift_claim_codes')
                .select('*')
                .eq('banquet_id', banquetId)
                .eq('guest_openid', guestOpenid)
                .order('created_at', { ascending: false });
            if (error) {
                this.logger.error(`查询领取码失败: ${error.message}`);
                return { code: 500, msg: '查询失败', data: [] };
            }
            const codes = (data || []).map((item) => ({
                code: item.code,
                giftName: item.gift_name,
                giftImage: item.gift_image,
                status: item.status,
                claimedAt: item.claimed_at,
                usedAt: item.used_at,
            }));
            return { code: 200, msg: 'success', data: codes };
        }
        catch (error) {
            this.logger.error(`查询领取码异常: ${error.message}`);
            return { code: 500, msg: '查询失败', data: [] };
        }
    }
    async getCodeInfo(code) {
        this.logger.log(`扫码查询领取码: code=${code}`);
        try {
            const client = (0, supabase_client_1.getSupabaseClient)();
            const { data, error } = await client
                .from('gift_claim_codes')
                .select(`
          *,
          banquets(name, type, event_time, location)
        `)
                .eq('code', code)
                .single();
            if (error || !data) {
                return { code: 404, msg: '领取码不存在', data: null };
            }
            return {
                code: 200,
                msg: 'success',
                data: {
                    code: data.code,
                    giftName: data.gift_name,
                    giftImage: data.gift_image,
                    status: data.status,
                    guestName: data.guest_name,
                    banquet: data.banquets,
                },
            };
        }
        catch (error) {
            this.logger.error(`查询领取码异常: ${error.message}`);
            return { code: 500, msg: '查询失败', data: null };
        }
    }
    async redeemCode(body, req) {
        const verifierOpenid = req.user?.openid || body.verifierOpenid || 'host_test';
        this.logger.log(`核销领取码: code=${body.code}, verifier=${verifierOpenid}`);
        try {
            const client = (0, supabase_client_1.getSupabaseClient)();
            const { data: claimCode, error: queryError } = await client
                .from('gift_claim_codes')
                .select('*')
                .eq('code', body.code)
                .single();
            if (queryError || !claimCode) {
                return { code: 404, msg: '领取码不存在', data: null };
            }
            if (claimCode.status === 'used') {
                return { code: 400, msg: '该领取码已核销', data: null };
            }
            const { error: updateError } = await client
                .from('gift_claim_codes')
                .update({
                status: 'used',
                used_at: new Date().toISOString(),
            })
                .eq('code', body.code);
            if (updateError) {
                this.logger.error(`更新领取码状态失败: ${updateError.message}`);
                return { code: 500, msg: '核销失败', data: null };
            }
            await client.from('gift_redemption_records').insert({
                banquet_id: claimCode.banquet_id,
                claim_code_id: claimCode.id,
                gift_id: claimCode.gift_id,
                guest_openid: claimCode.guest_openid,
                verifier_openid: verifierOpenid,
            });
            this.logger.log(`领取码核销成功: code=${body.code}`);
            return {
                code: 200,
                msg: '核销成功',
                data: {
                    giftName: claimCode.gift_name,
                    guestName: claimCode.guest_name,
                },
            };
        }
        catch (error) {
            this.logger.error(`核销领取码异常: ${error.message}`);
            return { code: 500, msg: '核销失败', data: null };
        }
    }
    async getBanquetGifts(banquetId, req) {
        this.logger.log(`获取宴会现场礼品: banquetId=${banquetId}`);
        try {
            const client = (0, supabase_client_1.getSupabaseClient)();
            const { data, error } = await client
                .from('onsite_gifts')
                .select('*')
                .eq('banquet_id', banquetId);
            if (error) {
                this.logger.error(`获取现场礼品失败: ${error.message}`);
                return { code: 500, msg: '获取失败', data: [] };
            }
            const gifts = (data || []).map((item) => ({
                id: item.id,
                name: item.name,
                image: item.image,
                price: item.price,
                displayPrice: (item.price / 100).toFixed(2),
                totalCount: item.total_count,
                remainingCount: item.remaining_count,
            }));
            return { code: 200, msg: 'success', data: gifts };
        }
        catch (error) {
            this.logger.error(`获取现场礼品异常: ${error.message}`);
            return { code: 500, msg: '获取失败', data: [] };
        }
    }
    async getGiftStats(banquetId, page = '1', pageSize = '20', req) {
        this.logger.log(`获取现场礼品核销统计: banquetId=${banquetId}`);
        try {
            const client = (0, supabase_client_1.getSupabaseClient)();
            const pageNum = parseInt(page) || 1;
            const pageSizeNum = parseInt(pageSize) || 20;
            const offset = (pageNum - 1) * pageSizeNum;
            const { data: gifts, error: giftsError } = await client
                .from('onsite_gifts')
                .select('*')
                .eq('banquet_id', banquetId);
            if (giftsError) {
                this.logger.error(`获取现场礼品失败: ${giftsError.message}`);
                return { code: 500, msg: '获取失败', data: null };
            }
            const giftStats = (gifts || []).map((item) => ({
                id: item.id,
                name: item.name,
                image: item.image,
                price: item.price,
                displayPrice: (item.price / 100).toFixed(2),
                totalCount: item.total_count,
                remainingCount: item.remaining_count,
                claimedCount: item.total_count - item.remaining_count,
                claimedPercentage: item.total_count > 0
                    ? (((item.total_count - item.remaining_count) / item.total_count) * 100).toFixed(1)
                    : '0',
            }));
            const totalStats = {
                totalGifts: (gifts || []).length,
                totalCount: (gifts || []).reduce((sum, g) => sum + g.total_count, 0),
                totalRemaining: (gifts || []).reduce((sum, g) => sum + g.remaining_count, 0),
                totalClaimed: (gifts || []).reduce((sum, g) => sum + (g.total_count - g.remaining_count), 0),
            };
            const { data: records, error: recordsError, count, } = await client
                .from('gift_redemption_records')
                .select(`
          id,
          created_at,
          gift_id,
          guest_openid,
          verifier_openid,
          claim_code_id,
          gift_claim_codes(code, guest_name, gift_name)
        `, { count: 'exact' })
                .eq('banquet_id', banquetId)
                .order('created_at', { ascending: false })
                .range(offset, offset + pageSizeNum - 1);
            if (recordsError) {
                this.logger.error(`获取核销明细失败: ${recordsError.message}`);
                return { code: 500, msg: '获取核销明细失败', data: null };
            }
            const redemptionRecords = (records || []).map((record) => {
                const claimCode = record.gift_claim_codes;
                return {
                    id: record.id,
                    code: claimCode?.code || '',
                    guestName: claimCode?.guest_name || '未知',
                    giftName: claimCode?.gift_name || '未知礼品',
                    verifierOpenid: record.verifier_openid,
                    redeemedAt: record.created_at,
                };
            });
            return {
                code: 200,
                msg: 'success',
                data: {
                    giftStats,
                    totalStats,
                    redemptionRecords,
                    pagination: {
                        page: pageNum,
                        pageSize: pageSizeNum,
                        total: count || 0,
                        totalPages: Math.ceil((count || 0) / pageSizeNum),
                    },
                },
            };
        }
        catch (error) {
            this.logger.error(`获取核销统计异常: ${error.message}`);
            return { code: 500, msg: '获取失败', data: null };
        }
    }
    generateRandomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
};
exports.OnsiteGiftController = OnsiteGiftController;
__decorate([
    (0, common_1.Post)('generate-code'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OnsiteGiftController.prototype, "generateClaimCode", null);
__decorate([
    (0, common_1.Get)('my-codes'),
    __param(0, (0, common_1.Query)('banquetId')),
    __param(1, (0, common_1.Query)('guestOpenid')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OnsiteGiftController.prototype, "getMyCodes", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('code/:code'),
    __param(0, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OnsiteGiftController.prototype, "getCodeInfo", null);
__decorate([
    (0, common_1.Post)('redeem'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OnsiteGiftController.prototype, "redeemCode", null);
__decorate([
    (0, common_1.Get)('banquet/:banquetId'),
    __param(0, (0, common_1.Param)('banquetId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OnsiteGiftController.prototype, "getBanquetGifts", null);
__decorate([
    (0, common_1.Get)('stats/:banquetId'),
    __param(0, (0, common_1.Param)('banquetId')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('pageSize')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], OnsiteGiftController.prototype, "getGiftStats", null);
exports.OnsiteGiftController = OnsiteGiftController = OnsiteGiftController_1 = __decorate([
    (0, common_1.Controller)('onsite-gifts'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard)
], OnsiteGiftController);
//# sourceMappingURL=onsite-gift.controller.js.map