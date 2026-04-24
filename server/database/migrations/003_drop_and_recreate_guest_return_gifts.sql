-- ============================================
-- 尚宴礼记数据库迁移脚本
-- 功能: 删除旧表，重新创建正确的 guest_return_gifts 表
-- ============================================

-- 步骤 1: 删除旧表（如果存在）
DROP TABLE IF EXISTS guest_return_gifts CASCADE;

-- 步骤 2: 重新创建表（正确的结构）
CREATE TABLE guest_return_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_record_id UUID NOT NULL,
  banquet_id UUID NOT NULL,
  guest_openid TEXT DEFAULT NULL,
  guest_name TEXT DEFAULT NULL,
  gift_amount INTEGER DEFAULT 0,
  
  -- 商城礼品
  mall_gift_claimed BOOLEAN DEFAULT false,
  mall_product_id TEXT DEFAULT NULL,
  mall_product_name TEXT DEFAULT NULL,
  mall_product_price INTEGER DEFAULT 0,
  mall_product_image TEXT DEFAULT NULL,
  mall_claim_type TEXT DEFAULT NULL,
  delivery_status TEXT DEFAULT 'none',
  recipient_name TEXT DEFAULT NULL,
  recipient_phone TEXT DEFAULT NULL,
  recipient_address TEXT DEFAULT NULL,
  express_company TEXT DEFAULT NULL,
  express_no TEXT DEFAULT NULL,
  estimated_ship_time TIMESTAMPTZ DEFAULT NULL,
  
  -- 现场礼品
  onsite_gift_claimed BOOLEAN DEFAULT false,
  onsite_gift_id TEXT DEFAULT NULL,
  onsite_gift_name TEXT DEFAULT NULL,
  onsite_gift_image TEXT DEFAULT NULL,
  onsite_gift_price INTEGER DEFAULT 0,
  exchange_code TEXT DEFAULT NULL,
  exchange_status TEXT DEFAULT 'none',
  exchanged_at TIMESTAMPTZ DEFAULT NULL,
  
  -- 通用状态
  status TEXT DEFAULT 'pending',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  FOREIGN KEY (banquet_id) REFERENCES banquets(id) ON DELETE CASCADE
);

-- 步骤 3: 创建索引
CREATE INDEX idx_guest_return_gifts_gift_record_id ON guest_return_gifts(gift_record_id);
CREATE INDEX idx_guest_return_gifts_banquet_id ON guest_return_gifts(banquet_id);
CREATE INDEX idx_guest_return_gifts_guest_openid ON guest_return_gifts(guest_openid);
CREATE INDEX idx_guest_return_gifts_exchange_code ON guest_return_gifts(exchange_code);

COMMENT ON TABLE guest_return_gifts IS '嘉宾回礼记录表：记录每位嘉宾的回礼发放情况';

-- 步骤 4: 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS update_guest_return_gifts_updated_at ON guest_return_gifts;
CREATE TRIGGER update_guest_return_gifts_updated_at
  BEFORE UPDATE ON guest_return_gifts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 完成
SELECT 'Table guest_return_gifts recreated successfully!' AS status;
