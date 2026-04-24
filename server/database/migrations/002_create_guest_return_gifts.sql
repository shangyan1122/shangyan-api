-- ============================================
-- 尚宴礼记数据库扩展迁移脚本
-- 版本: 1.2.0
-- 功能: 添加嘉宾回礼记录表 guest_return_gifts
-- ============================================

-- 创建嘉宾回礼记录表
CREATE TABLE IF NOT EXISTS guest_return_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_record_id UUID NOT NULL COMMENT '随礼记录ID',
  banquet_id UUID NOT NULL COMMENT '宴会ID',
  guest_openid TEXT DEFAULT NULL COMMENT '嘉宾openid',
  guest_name TEXT DEFAULT NULL COMMENT '嘉宾姓名',
  gift_amount INTEGER DEFAULT 0 COMMENT '随礼金额（单位：分）',
  
  -- 红包回礼
  red_packet_amount INTEGER DEFAULT 0 COMMENT '红包金额（单位：分）',
  red_packet_status TEXT DEFAULT 'none' COMMENT '红包状态：none/pending/sent/failed',
  red_packet_sent_at TIMESTAMPTZ DEFAULT NULL COMMENT '红包发送时间',
  red_packet_error_msg TEXT DEFAULT NULL COMMENT '红包发送失败原因',
  
  -- 商城礼品
  mall_gift_claimed BOOLEAN DEFAULT false COMMENT '商城礼品是否已领取',
  mall_gift_items JSONB DEFAULT NULL COMMENT '领取的商城礼品详情',
  recipient_name TEXT DEFAULT NULL COMMENT '收件人姓名',
  recipient_phone TEXT DEFAULT NULL COMMENT '收件人电话',
  recipient_address TEXT DEFAULT NULL COMMENT '收件人地址',
  delivery_status TEXT DEFAULT 'none' COMMENT '发货状态：none/pending/shipped/delivered',
  estimated_ship_time TIMESTAMPTZ DEFAULT NULL COMMENT '预计发货时间',
  
  -- 现场礼品
  onsite_gift_claimed BOOLEAN DEFAULT false COMMENT '现场礼品是否已领取',
  onsite_gift_name TEXT DEFAULT NULL COMMENT '现场礼品名称',
  onsite_gift_image TEXT DEFAULT NULL COMMENT '现场礼品图片',
  onsite_gift_price INTEGER DEFAULT 0 COMMENT '现场礼品单价（单位：分）',
  
  -- 核销信息
  exchange_code TEXT DEFAULT NULL COMMENT '领取码',
  exchange_status TEXT DEFAULT 'none' COMMENT '核销状态：none/pending/exchanged/expired',
  exchanged_at TIMESTAMPTZ DEFAULT NULL COMMENT '核销时间',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  FOREIGN KEY (banquet_id) REFERENCES banquets(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_guest_return_gifts_gift_record_id ON guest_return_gifts(gift_record_id);
CREATE INDEX IF NOT EXISTS idx_guest_return_gifts_banquet_id ON guest_return_gifts(banquet_id);
CREATE INDEX IF NOT EXISTS idx_guest_return_gifts_guest_openid ON guest_return_gifts(guest_openid);
CREATE INDEX IF NOT EXISTS idx_guest_return_gifts_exchange_code ON guest_return_gifts(exchange_code);

COMMENT ON TABLE guest_return_gifts IS '嘉宾回礼记录表：记录每位嘉宾的回礼发放情况';

-- 创建更新时间触发器
DROP TRIGGER IF EXISTS update_guest_return_gifts_updated_at ON guest_return_gifts;
CREATE TRIGGER update_guest_return_gifts_updated_at
  BEFORE UPDATE ON guest_return_gifts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 完成
SELECT 'Migration 002 completed successfully!' AS status;
