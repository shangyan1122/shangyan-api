"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ExcelExportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcelExportService = void 0;
const common_1 = require("@nestjs/common");
const exceljs_1 = require("exceljs");
const supabase_client_1 = require("../../storage/database/supabase-client");
const storage_1 = require("../../storage");
const supabase = (0, supabase_client_1.getSupabaseClient)();
let ExcelExportService = ExcelExportService_1 = class ExcelExportService {
    constructor() {
        this.logger = new common_1.Logger(ExcelExportService_1.name);
    }
    async exportGiftLedger(params) {
        const { openid, banquetId, startDate, endDate } = params;
        try {
            const { data: banquets, error: banquetsError } = await supabase
                .from('banquets')
                .select('id, name, type, event_time')
                .eq('host_openid', openid);
            if (banquetsError) {
                this.logger.error('查询宴会列表失败:', banquetsError);
                throw new Error(banquetsError.message);
            }
            if (!banquets || banquets.length === 0) {
                throw new Error('没有可导出的宴会记录');
            }
            const banquetMap = new Map();
            const banquetIds = banquets.map((b) => {
                banquetMap.set(b.id, b);
                return b.id;
            });
            let query = supabase
                .from('gift_records')
                .select('id, guest_name, guest_openid, amount, blessing, created_at, banquet_id, payment_status')
                .in('banquet_id', banquetIds)
                .eq('payment_status', 'paid')
                .order('created_at', { ascending: false });
            if (banquetId) {
                query = query.eq('banquet_id', banquetId);
            }
            if (startDate) {
                query = query.gte('created_at', startDate);
            }
            if (endDate) {
                query = query.lte('created_at', endDate);
            }
            const { data: records, error: recordsError } = await query;
            if (recordsError) {
                this.logger.error('查询礼账记录失败:', recordsError);
                throw new Error(recordsError.message);
            }
            if (!records || records.length === 0) {
                throw new Error('没有可导出的随礼记录');
            }
            const workbook = new exceljs_1.Workbook();
            const worksheet = workbook.addWorksheet('礼账记录');
            worksheet.columns = [
                { header: '序号', key: 'index', width: 8 },
                { header: '宴会名称', key: 'banquetName', width: 20 },
                { header: '宴会类型', key: 'banquetType', width: 12 },
                { header: '宴会时间', key: 'eventTime', width: 18 },
                { header: '宾客姓名', key: 'guestName', width: 15 },
                { header: '礼金金额(元)', key: 'amount', width: 14 },
                { header: '祝福语', key: 'blessing', width: 35 },
                { header: '随礼时间', key: 'createdAt', width: 20 },
            ];
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFA91D2E' },
            };
            headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
            headerRow.height = 25;
            let totalAmount = 0;
            records.forEach((record, index) => {
                const amountYuan = (record.amount / 100).toFixed(2);
                totalAmount += record.amount;
                const banquetInfo = banquetMap.get(record.banquet_id);
                const row = worksheet.addRow({
                    index: index + 1,
                    banquetName: banquetInfo?.name || '-',
                    banquetType: banquetInfo?.type || '-',
                    eventTime: banquetInfo?.event_time
                        ? new Date(banquetInfo.event_time).toLocaleDateString('zh-CN')
                        : '-',
                    guestName: record.guest_name || '-',
                    amount: amountYuan,
                    blessing: record.blessing || '-',
                    createdAt: new Date(record.created_at).toLocaleString('zh-CN'),
                });
                row.getCell('amount').alignment = { horizontal: 'right' };
            });
            worksheet.addRow({});
            const summaryRow = worksheet.addRow({
                index: '合计',
                guestName: `共 ${records.length} 笔`,
                amount: (totalAmount / 100).toFixed(2),
            });
            summaryRow.font = { bold: true, size: 12 };
            summaryRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFF5EE' },
            };
            worksheet.eachRow((row, rowNum) => {
                if (rowNum <= records.length + 2) {
                    row.eachCell((cell) => {
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
                            left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
                            bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
                            right: { style: 'thin', color: { argb: 'FFDDDDDD' } },
                        };
                    });
                }
            });
            const buffer = await workbook.xlsx.writeBuffer();
            const fileName = `gift_ledger_${openid}_${Date.now()}.xlsx`;
            const fileUrl = await (0, storage_1.uploadToStorage)({
                bucket: 'exports',
                fileName,
                file: Buffer.from(buffer),
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            this.logger.log(`导出礼账成功: ${fileUrl}`);
            return fileUrl;
        }
        catch (error) {
            this.logger.error('导出礼账失败:', error);
            throw error;
        }
    }
    async exportBanquetReport(params) {
        const { openid, banquetId } = params;
        try {
            const { data: banquet, error: banquetError } = await supabase
                .from('banquets')
                .select('*')
                .eq('id', banquetId)
                .eq('host_openid', openid)
                .single();
            if (banquetError || !banquet) {
                throw new Error('宴会不存在或无权限');
            }
            const { data: records, error: recordsError } = await supabase
                .from('gift_records')
                .select('*')
                .eq('banquet_id', banquetId)
                .eq('payment_status', 'paid')
                .order('amount', { ascending: false });
            if (recordsError) {
                throw new Error(recordsError.message);
            }
            const workbook = new exceljs_1.Workbook();
            const overviewSheet = workbook.addWorksheet('宴会概览');
            overviewSheet.columns = [
                { header: '项目', key: 'item', width: 18 },
                { header: '内容', key: 'content', width: 45 },
            ];
            overviewSheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
            overviewSheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFA91D2E' },
            };
            const totalAmount = records?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
            const avgAmount = records?.length ? totalAmount / records.length : 0;
            overviewSheet.addRow({ item: '宴会名称', content: banquet.name });
            overviewSheet.addRow({ item: '宴会类型', content: banquet.type });
            overviewSheet.addRow({
                item: '宴会时间',
                content: new Date(banquet.event_time).toLocaleString('zh-CN'),
            });
            overviewSheet.addRow({ item: '宴会地点', content: banquet.location || '-' });
            overviewSheet.addRow({ item: '宾客人数', content: `${records?.length || 0} 人` });
            overviewSheet.addRow({ item: '礼金总额', content: `¥${(totalAmount / 100).toFixed(2)}` });
            overviewSheet.addRow({ item: '平均礼金', content: `¥${(avgAmount / 100).toFixed(2)}` });
            overviewSheet.addRow({
                item: '宴会状态',
                content: banquet.status === 'active' ? '进行中' : banquet.status === 'ended' ? '已结束' : '草稿',
            });
            const detailSheet = workbook.addWorksheet('礼账明细');
            detailSheet.columns = [
                { header: '序号', key: 'index', width: 8 },
                { header: '宾客姓名', key: 'guestName', width: 15 },
                { header: '礼金金额(元)', key: 'amount', width: 14 },
                { header: '祝福语', key: 'blessing', width: 35 },
                { header: '随礼时间', key: 'createdAt', width: 20 },
            ];
            detailSheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
            detailSheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFA91D2E' },
            };
            records?.forEach((record, index) => {
                detailSheet.addRow({
                    index: index + 1,
                    guestName: record.guest_name || '-',
                    amount: (record.amount / 100).toFixed(2),
                    blessing: record.blessing || '-',
                    createdAt: new Date(record.created_at).toLocaleString('zh-CN'),
                });
            });
            const distributionSheet = workbook.addWorksheet('礼金分布');
            distributionSheet.columns = [
                { header: '礼金区间', key: 'range', width: 18 },
                { header: '人数', key: 'count', width: 10 },
                { header: '占比', key: 'percentage', width: 12 },
            ];
            distributionSheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
            distributionSheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFC9A227' },
            };
            const distribution = {
                '500元以上': 0,
                '200-500元': 0,
                '100-200元': 0,
                '100元以下': 0,
            };
            records?.forEach((record) => {
                const amount = record.amount / 100;
                if (amount >= 500)
                    distribution['500元以上']++;
                else if (amount >= 200)
                    distribution['200-500元']++;
                else if (amount >= 100)
                    distribution['100-200元']++;
                else
                    distribution['100元以下']++;
            });
            const totalRecords = records?.length || 1;
            Object.entries(distribution).forEach(([range, count]) => {
                distributionSheet.addRow({
                    range,
                    count,
                    percentage: `${((count / totalRecords) * 100).toFixed(1)}%`,
                });
            });
            const buffer = await workbook.xlsx.writeBuffer();
            const fileName = `banquet_report_${banquetId}_${Date.now()}.xlsx`;
            const fileUrl = await (0, storage_1.uploadToStorage)({
                bucket: 'exports',
                fileName,
                file: Buffer.from(buffer),
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            this.logger.log(`导出宴会报告成功: ${fileUrl}`);
            return fileUrl;
        }
        catch (error) {
            this.logger.error('导出宴会报告失败:', error);
            throw error;
        }
    }
};
exports.ExcelExportService = ExcelExportService;
exports.ExcelExportService = ExcelExportService = ExcelExportService_1 = __decorate([
    (0, common_1.Injectable)()
], ExcelExportService);
//# sourceMappingURL=excel-export.service.js.map