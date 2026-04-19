-- 商城订单系统迁移脚本
-- 执行时间: 2024-01-15

-- 1. 商城订单表
CREATE TABLE IF NOT EXISTS mall_orders (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no VARCHAR(32) NOT NULL UNIQUE,  -- 订单号，格式：MO+时间戳+随机码
  user_openid VARCHAR(128) NOT NULL,      -- 下单用户
  
  -- 订单类型：normal(普通购买)、return_gift(回礼购买)、exchange(置换补差)
  order_type VARCHAR(20) NOT NULL DEFAULT 'normal',
  
  -- 关联宴会ID（回礼购买时使用）
  banquet_id VARCHAR(36),
  
  -- 金额信息（单位：分）
  total_amount INTEGER NOT NULL DEFAULT 0,     -- 商品总金额
  discount_amount INTEGER DEFAULT 0,           -- 优惠金额
  shipping_fee INTEGER DEFAULT 0,              -- 运费
  pay_amount INTEGER NOT NULL DEFAULT 0,       -- 实付金额
  
  -- 支付信息
  pay_status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending/paid/refunded
  pay_time TIMESTAMP WITH TIME ZONE,
  pay_transaction_id VARCHAR(64),              -- 微信支付交易号
  
  -- 发货信息
  ship_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending/shipped/received
  ship_time TIMESTAMP WITH TIME ZONE,
  
  -- 收货信息
  recipient_name VARCHAR(50),
  recipient_phone VARCHAR(20),
  recipient_address TEXT,
  recipient_province VARCHAR(50),
  recipient_city VARCHAR(50),
  recipient_district VARCHAR(50),
  
  -- 状态
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending/paid/shipped/received/cancelled/refunded
  cancel_reason TEXT,
  
  -- 备注
  remark TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- 索引
CREATE INDEX IF NOT EXISTS mall_orders_user_openid_idx ON mall_orders(user_openid);
CREATE INDEX IF NOT EXISTS mall_orders_order_no_idx ON mall_orders(order_no);
CREATE INDEX IF NOT EXISTS mall_orders_status_idx ON mall_orders(status);
CREATE INDEX IF NOT EXISTS mall_orders_banquet_id_idx ON mall_orders(banquet_id);
CREATE INDEX IF NOT EXISTS mall_orders_created_at_idx ON mall_orders(created_at);

-- 2. 订单商品明细表
CREATE TABLE IF NOT EXISTS mall_order_items (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  
  -- 商品快照（下单时的商品信息）
  product_name VARCHAR(255) NOT NULL,
  product_image TEXT,
  product_price INTEGER NOT NULL,        -- 单价（分）
  quantity INTEGER NOT NULL DEFAULT 1,   -- 数量
  total_price INTEGER NOT NULL,          -- 小计（分）
  
  -- 回礼相关（如果是回礼订单）
  is_return_gift BOOLEAN DEFAULT FALSE,
  gift_record_id VARCHAR(36),            -- 关联的随礼记录ID
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS mall_order_items_order_id_idx ON mall_order_items(order_id);
CREATE INDEX IF NOT EXISTS mall_order_items_product_id_idx ON mall_order_items(product_id);

-- 3. 物流信息表
CREATE TABLE IF NOT EXISTS order_logistics (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(36) NOT NULL,
  
  -- 物流公司信息
  logistics_company VARCHAR(50),         -- 物流公司名称
  logistics_code VARCHAR(20),            -- 物流公司编码
  tracking_no VARCHAR(50),               -- 快递单号
  
  -- 物流状态
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending/picked/in_transit/delivered/signed
  
  -- 物流轨迹（JSON数组）
  traces JSONB,
  
  -- 发货时间
  shipped_at TIMESTAMP WITH TIME ZONE,
  -- 签收时间
  signed_at TIMESTAMP WITH TIME ZONE,
  
  -- 备注
  remark TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- 索引
CREATE INDEX IF NOT EXISTS order_logistics_order_id_idx ON order_logistics(order_id);
CREATE INDEX IF NOT EXISTS order_logistics_tracking_no_idx ON order_logistics(tracking_no);

-- 4. 商品置换记录表（升级版）
CREATE TABLE IF NOT EXISTS gift_exchanges (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_no VARCHAR(32) NOT NULL UNIQUE,  -- 置换单号
  user_openid VARCHAR(128) NOT NULL,
  
  -- 置换类型：n_to_1(N换1)、1_to_n(1换N)
  exchange_type VARCHAR(20) NOT NULL DEFAULT 'n_to_1',
  
  -- 源商品（用于置换的商品）
  source_items JSONB NOT NULL,  -- [{id, name, price, quantity}]
  source_total_value INTEGER NOT NULL,  -- 源商品总价值（分）
  
  -- 目标商品（换得的商品）
  target_items JSONB NOT NULL,  -- [{id, name, price, quantity}]
  target_total_value INTEGER NOT NULL,  -- 目标商品总价值（分）
  
  -- 手续费（按目标商品价值的10%计算）
  service_fee INTEGER NOT NULL DEFAULT 0,  -- 手续费（分）
  
  -- 差价（目标价值 - 源价值 - 手续费）
  diff_amount INTEGER NOT NULL DEFAULT 0,  -- 需补差价（分），负数表示有余额
  
  -- 差价支付状态
  diff_pay_status VARCHAR(20) DEFAULT 'none',  -- none/pending/paid
  diff_pay_transaction_id VARCHAR(64),
  
  -- 状态
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending/completed/cancelled
  
  -- 关联订单（置换产生的订单）
  order_id VARCHAR(36),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 索引
CREATE INDEX IF NOT EXISTS gift_exchanges_user_openid_idx ON gift_exchanges(user_openid);
CREATE INDEX IF NOT EXISTS gift_exchanges_exchange_no_idx ON gift_exchanges(exchange_no);
CREATE INDEX IF NOT EXISTS gift_exchanges_status_idx ON gift_exchanges(status);

-- 5. 用户可用回礼礼品表（嘉宾收到的商城回礼）
CREATE TABLE IF NOT EXISTS user_return_gifts (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_openid VARCHAR(128) NOT NULL,
  
  -- 商品信息
  product_id VARCHAR(36) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_image TEXT,
  product_price INTEGER NOT NULL,  -- 商品价值（分）
  
  -- 来源信息
  source_type VARCHAR(20) NOT NULL,  -- banquet_return(宴会回礼)、exchange(置换获得)
  source_banquet_id VARCHAR(36),     -- 来源宴会ID
  source_banquet_name VARCHAR(255),  -- 来源宴会名称
  source_gift_record_id VARCHAR(36), -- 来源随礼记录ID
  
  -- 状态
  status VARCHAR(20) NOT NULL DEFAULT 'available',  -- available/exchanged/shipped/received
  
  -- 物流信息
  tracking_no VARCHAR(50),
  shipped_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- 索引
CREATE INDEX IF NOT EXISTS user_return_gifts_user_openid_idx ON user_return_gifts(user_openid);
CREATE INDEX IF NOT EXISTS user_return_gifts_status_idx ON user_return_gifts(status);
CREATE INDEX IF NOT EXISTS user_return_gifts_product_id_idx ON user_return_gifts(product_id);

-- 6. 评论
COMMENT ON TABLE mall_orders IS '商城订单表';
COMMENT ON TABLE mall_order_items IS '订单商品明细表';
COMMENT ON TABLE order_logistics IS '物流信息表';
COMMENT ON TABLE gift_exchanges IS '商品置换记录表';
COMMENT ON TABLE user_return_gifts IS '用户可用回礼礼品表';
