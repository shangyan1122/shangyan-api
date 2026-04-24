-- ============================================
-- 尚宴礼记数据库迁移脚本
-- 功能: 添加缺失的列到 banquets 和 guest_return_gifts 表
-- ============================================

-- 1. 添加 voucher_issued 列到 banquets 表
ALTER TABLE banquets 
ADD COLUMN IF NOT EXISTS voucher_issued BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS voucher_issued_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN banquets.voucher_issued IS '是否已发放购物券';
COMMENT ON COLUMN banquets.voucher_issued_at IS '购物券发放时间';

-- 2. 添加 delivery_reminder 相关列到 guest_return_gifts 表（如果需要提醒功能）
-- 注意：这些列在当前的表结构中不存在，如果需要提醒功能，请取消注释以下语句
/*
ALTER TABLE guest_return_gifts 
ADD COLUMN IF NOT EXISTS need_delivery BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS delivery_reminder_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS delivery_reminder_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN guest_return_gifts.need_delivery IS '是否需要配送';
COMMENT ON COLUMN guest_return_gifts.delivery_reminder_sent IS '是否已发送收货提醒';
COMMENT ON COLUMN guest_return_gifts.delivery_reminder_count IS '提醒发送次数';
COMMENT ON COLUMN guest_return_gifts.last_reminder_at IS '上次提醒时间';
*/

-- 完成
SELECT 'Missing columns migration completed!' AS status;
