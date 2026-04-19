-- ============================================
-- 尚宴礼记数据库扩展迁移脚本
-- 版本: 1.1.0
-- 功能: 添加回礼配置、商户账户、现场礼品核销等支持
-- ============================================

-- 1. 为 banquets 表添加新字段
ALTER TABLE banquets 
ADD COLUMN IF NOT EXISTS return_gift_config JSONB DEFAULT NULL COMMENT '回礼配置：包含现金红包、商城礼品、现场礼品三种类型的配置',
ADD COLUMN IF NOT EXISTS photo_keys TEXT[] DEFAULT NULL COMMENT '照片存储key列表',
ADD COLUMN IF NOT EXISTS cover_image TEXT DEFAULT NULL COMMENT '封面图片URL',
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL COMMENT '宴会简介';

COMMENT ON COLUMN banquets.return_gift_config IS '回礼配置JSON结构：{"redPacket":{"enabled":bool,"amount":number,"count":number},"mallProducts":{"enabled":bool,"items":[...]},"onsiteGifts":{"enabled":bool,"items":[...]}}';

-- 2. 创建商户账户表
CREATE TABLE IF NOT EXISTS merchant_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  openid TEXT NOT NULL UNIQUE COMMENT '用户openid',
  merchant_id TEXT DEFAULT NULL COMMENT '微信支付商户号',
  merchant_name TEXT NOT NULL COMMENT '商户名称',
  contact_name TEXT NOT NULL COMMENT '联系人姓名',
  contact_phone TEXT NOT NULL COMMENT '联系电话',
  business_license_url TEXT DEFAULT NULL COMMENT '营业执照URL',
  id_card_front_url TEXT DEFAULT NULL COMMENT '身份证正面URL',
  id_card_back_url TEXT DEFAULT NULL COMMENT '身份证背面URL',
  bank_account_no TEXT DEFAULT NULL COMMENT '银行账号',
  bank_name TEXT DEFAULT NULL COMMENT '开户银行',
  bank_branch TEXT DEFAULT NULL COMMENT '开户行支行',
  status TEXT NOT NULL DEFAULT 'pending' COMMENT '状态：none/pending/approved/rejected',
  reject_reason TEXT DEFAULT NULL COMMENT '拒绝原因',
  sub_mchid TEXT DEFAULT NULL COMMENT '微信支付子商户号',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_accounts_openid ON merchant_accounts(openid);
CREATE INDEX IF NOT EXISTS idx_merchant_accounts_status ON merchant_accounts(status);

COMMENT ON TABLE merchant_accounts IS '商户账户表：存储服务商子账户申请信息';

-- 3. 创建商城商品表
CREATE TABLE IF NOT EXISTS gift_products (
  id TEXT PRIMARY KEY COMMENT '商品ID',
  name TEXT NOT NULL COMMENT '商品名称',
  description TEXT DEFAULT NULL COMMENT '商品描述',
  price INTEGER NOT NULL COMMENT '价格（单位：分）',
  original_price INTEGER DEFAULT NULL COMMENT '原价（单位：分）',
  image TEXT NOT NULL COMMENT '主图URL',
  images TEXT[] DEFAULT NULL COMMENT '图片列表',
  category TEXT DEFAULT '其他' COMMENT '分类',
  stock INTEGER DEFAULT 999 COMMENT '库存',
  sales INTEGER DEFAULT 0 COMMENT '销量',
  status TEXT DEFAULT 'active' COMMENT '状态：active/inactive',
  sort_order INTEGER DEFAULT 0 COMMENT '排序权重',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gift_products_status ON gift_products(status);
CREATE INDEX IF NOT EXISTS idx_gift_products_category ON gift_products(category);

COMMENT ON TABLE gift_products IS '商城商品表：存储回礼商品信息';

-- 4. 创建现场礼品表
CREATE TABLE IF NOT EXISTS onsite_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banquet_id UUID NOT NULL COMMENT '宴会ID',
  name TEXT NOT NULL COMMENT '礼品名称',
  image TEXT NOT NULL COMMENT '礼品图片',
  price INTEGER NOT NULL COMMENT '单价（单位：分）',
  total_count INTEGER NOT NULL COMMENT '总数量',
  remaining_count INTEGER NOT NULL COMMENT '剩余数量',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  FOREIGN KEY (banquet_id) REFERENCES banquets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_onsite_gifts_banquet_id ON onsite_gifts(banquet_id);

COMMENT ON TABLE onsite_gifts IS '现场礼品表：存储宴会现场发放的礼品信息';

-- 5. 创建礼品领取码表
CREATE TABLE IF NOT EXISTS gift_claim_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE COMMENT '领取码',
  banquet_id UUID NOT NULL COMMENT '宴会ID',
  gift_id UUID NOT NULL COMMENT '礼品ID（onsite_gifts.id）',
  gift_name TEXT NOT NULL COMMENT '礼品名称',
  gift_image TEXT NOT NULL COMMENT '礼品图片',
  guest_openid TEXT DEFAULT NULL COMMENT '领取嘉宾openid',
  guest_name TEXT DEFAULT NULL COMMENT '领取嘉宾姓名',
  status TEXT NOT NULL DEFAULT 'unused' COMMENT '状态：unused/claimed/used',
  claimed_at TIMESTAMPTZ DEFAULT NULL COMMENT '领取时间',
  used_at TIMESTAMPTZ DEFAULT NULL COMMENT '核销时间',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  FOREIGN KEY (banquet_id) REFERENCES banquets(id) ON DELETE CASCADE,
  FOREIGN KEY (gift_id) REFERENCES onsite_gifts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gift_claim_codes_code ON gift_claim_codes(code);
CREATE INDEX IF NOT EXISTS idx_gift_claim_codes_banquet_id ON gift_claim_codes(banquet_id);
CREATE INDEX IF NOT EXISTS idx_gift_claim_codes_guest_openid ON gift_claim_codes(guest_openid);
CREATE INDEX IF NOT EXISTS idx_gift_claim_codes_status ON gift_claim_codes(status);

COMMENT ON TABLE gift_claim_codes IS '礼品领取码表：现场礼品核销使用';

-- 6. 创建礼品核销记录表
CREATE TABLE IF NOT EXISTS gift_redemption_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banquet_id UUID NOT NULL COMMENT '宴会ID',
  claim_code_id UUID NOT NULL COMMENT '领取码ID',
  gift_id UUID NOT NULL COMMENT '礼品ID',
  guest_openid TEXT NOT NULL COMMENT '嘉宾openid',
  verifier_openid TEXT NOT NULL COMMENT '核销人openid',
  redeemed_at TIMESTAMPTZ DEFAULT NOW() COMMENT '核销时间',
  
  FOREIGN KEY (banquet_id) REFERENCES banquets(id) ON DELETE CASCADE,
  FOREIGN KEY (claim_code_id) REFERENCES gift_claim_codes(id) ON DELETE CASCADE,
  FOREIGN KEY (gift_id) REFERENCES onsite_gifts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gift_redemption_records_banquet_id ON gift_redemption_records(banquet_id);
CREATE INDEX IF NOT EXISTS idx_gift_redemption_records_guest_openid ON gift_redemption_records(guest_openid);

COMMENT ON TABLE gift_redemption_records IS '礼品核销记录表：记录现场礼品核销历史';

-- 7. 创建商城礼品订单表
CREATE TABLE IF NOT EXISTS mall_gift_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banquet_id UUID NOT NULL COMMENT '宴会ID',
  product_id TEXT NOT NULL COMMENT '商品ID',
  product_name TEXT NOT NULL COMMENT '商品名称',
  product_image TEXT NOT NULL COMMENT '商品图片',
  price INTEGER NOT NULL COMMENT '单价（单位：分）',
  quantity INTEGER NOT NULL COMMENT '购买数量',
  total_amount INTEGER NOT NULL COMMENT '总金额（单位：分）',
  status TEXT NOT NULL DEFAULT 'pending' COMMENT '状态：pending/paid/claimed/refunded',
  guest_openid TEXT DEFAULT NULL COMMENT '领取嘉宾openid',
  guest_name TEXT DEFAULT NULL COMMENT '领取嘉宾姓名',
  claimed_at TIMESTAMPTZ DEFAULT NULL COMMENT '领取时间',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  FOREIGN KEY (banquet_id) REFERENCES banquets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mall_gift_orders_banquet_id ON mall_gift_orders(banquet_id);
CREATE INDEX IF NOT EXISTS idx_mall_gift_orders_product_id ON mall_gift_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_mall_gift_orders_status ON mall_gift_orders(status);

COMMENT ON TABLE mall_gift_orders IS '商城礼品订单表：记录主办方预购的商城礼品';

-- 8. 插入默认商品数据（如果表为空）
INSERT INTO gift_products (id, name, description, price, original_price, image, category, stock, sales, status)
SELECT * FROM (
  VALUES
    ('gift-001', '经典喜糖礼盒（12颗装）', '精选进口巧克力，搭配传统喜糖，寓意甜蜜美满', 3800, 4800, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', '喜糖礼盒', 999, 1280, 'active'),
    ('gift-002', '高端定制喜糖盒（8颗装）', '法式手工巧克力，精美礼盒包装，支持定制logo', 6800, 8800, 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400', '喜糖礼盒', 500, 856, 'active'),
    ('gift-003', '中式传统喜糖袋（16颗装）', '传统红色锦囊包装，内含花生、糖果、红枣，寓意早生贵子', 2800, 3500, 'https://images.unsplash.com/photo-1562440499-64c9a111f713?w=400', '喜糖礼盒', 1500, 2340, 'active'),
    ('gift-004', '精美茶具套装', '景德镇白瓷茶具，4杯1壶，礼盒包装', 15800, 19800, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400', '伴手礼', 200, 456, 'active'),
    ('gift-005', '定制马克杯套装（2个装）', '高品质陶瓷，可定制照片或祝福语', 8800, 12000, 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400', '伴手礼', 300, 678, 'active'),
    ('gift-006', '香薰蜡烛礼盒', '天然植物精油，淡雅花香，营造浪漫氛围', 9900, 13800, 'https://images.unsplash.com/photo-1602607650461-19e2a4a6e7a0?w=400', '伴手礼', 180, 234, 'active'),
    ('gift-007', '定制日历笔记本', '精美印刷，可定制照片和重要日期，记录美好时光', 4800, 6800, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400', '创意礼品', 500, 890, 'active'),
    ('gift-008', '迷你加湿器', '便携式设计，静音运行，LED氛围灯', 7800, 9900, 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400', '创意礼品', 250, 345, 'active'),
    ('gift-009', '定制钥匙扣套装', '金属材质，可刻字，精美礼盒包装', 3800, 5000, 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400', '创意礼品', 800, 1230, 'active'),
    ('gift-010', '精品毛巾礼盒（2条装）', '纯棉材质，柔软亲肤，刺绣工艺', 5800, 7800, 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400', '生活家居', 400, 567, 'active'),
    ('gift-011', '玻璃花瓶套装', '北欧简约风格，三件套，搭配仿真花', 6600, 8800, 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=400', '生活家居', 150, 189, 'active'),
    ('gift-012', '便携餐具套装', '304不锈钢，收纳盒设计，环保卫生', 4800, 6500, 'https://images.unsplash.com/photo-1584990347449-a2d4c2c044a8?w=400', '生活家居', 600, 789, 'active')
) AS t(id, name, description, price, original_price, image, category, stock, sales, status)
WHERE NOT EXISTS (SELECT 1 FROM gift_products LIMIT 1);

-- 9. 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加更新时间触发器
DROP TRIGGER IF EXISTS update_merchant_accounts_updated_at ON merchant_accounts;
CREATE TRIGGER update_merchant_accounts_updated_at
    BEFORE UPDATE ON merchant_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gift_products_updated_at ON gift_products;
CREATE TRIGGER update_gift_products_updated_at
    BEFORE UPDATE ON gift_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 完成
SELECT 'Migration completed successfully!' AS status;
