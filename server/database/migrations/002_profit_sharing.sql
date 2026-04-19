-- =====================================================
-- 尚宴礼记 - 微信支付V3分账相关数据库表结构
-- =====================================================
-- 创建时间: 2025-01-XX
-- 说明: 新增分账相关字段和管理员通知表
-- =====================================================

-- =====================================================
-- 1. 为gift_records表添加分账相关字段
-- =====================================================
ALTER TABLE gift_records ADD COLUMN IF NOT EXISTS profit_sharing_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE gift_records ADD COLUMN IF NOT EXISTS profit_sharing_out_order_no VARCHAR(100);
ALTER TABLE gift_records ADD COLUMN IF NOT EXISTS profit_sharing_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE gift_records ADD COLUMN IF NOT EXISTS profit_sharing_error TEXT;
ALTER TABLE gift_records ADD COLUMN IF NOT EXISTS profit_sharing_retry_count INTEGER DEFAULT 0;

COMMENT ON COLUMN gift_records.profit_sharing_status IS '分账状态：pending-待分账, success-成功, failed-失败';
COMMENT ON COLUMN gift_records.profit_sharing_out_order_no IS '分账单号';
COMMENT ON COLUMN gift_records.profit_sharing_time IS '分账成功时间';
COMMENT ON COLUMN gift_records.profit_sharing_error IS '分账失败原因';
COMMENT ON COLUMN gift_records.profit_sharing_retry_count IS '分账重试次数';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_gift_records_profit_sharing_status ON gift_records(profit_sharing_status);

-- =====================================================
-- 2. 创建管理员通知表
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL, -- profit_sharing_failed, refund_failed, etc.
  title VARCHAR(200) NOT NULL,
  content TEXT,
  order_id VARCHAR(100),
  host_openid VARCHAR(100),
  amount BIGINT,
  error_message TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, processing, resolved, ignored
  resolved_by VARCHAR(100),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_notifications_type ON admin_notifications(type);
CREATE INDEX idx_admin_notifications_status ON admin_notifications(status);
CREATE INDEX idx_admin_notifications_created_at ON admin_notifications(created_at DESC);

COMMENT ON TABLE admin_notifications IS '管理员通知表';
COMMENT ON COLUMN admin_notifications.type IS '通知类型：profit_sharing_failed-分账失败, refund_failed-退款失败';
COMMENT ON COLUMN admin_notifications.status IS '状态：pending-待处理, processing-处理中, resolved-已解决, ignored-已忽略';

-- =====================================================
-- 3. 触发器：自动更新updated_at
-- =====================================================
CREATE TRIGGER update_admin_notifications_updated_at
    BEFORE UPDATE ON admin_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 完成
-- =====================================================
-- 执行完成后，系统支持：
-- 1. 微信支付V3分账API调用
-- 2. 分账状态跟踪
-- 3. 分账失败自动重试
-- 4. 管理员通知
-- =====================================================
