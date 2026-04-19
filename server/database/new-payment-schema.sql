-- =====================================================
-- 尚宴礼记 - 新版个人直收支付模式数据库表结构
-- =====================================================
-- 创建时间: 2025-01-XX
-- 说明: 删除服务商子商户相关表，新增余额管理相关表
-- =====================================================

-- =====================================================
-- 1. 主办方余额表（新增）
-- =====================================================
CREATE TABLE IF NOT EXISTS host_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  openid VARCHAR(100) NOT NULL UNIQUE,
  balance BIGINT NOT NULL DEFAULT 0, -- 余额（分）
  frozen_balance BIGINT NOT NULL DEFAULT 0, -- 冻结金额（分）
  total_recharged BIGINT NOT NULL DEFAULT 0, -- 累计充值（分）
  total_spent BIGINT NOT NULL DEFAULT 0, -- 累计消费（分）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_host_balances_openid ON host_balances(openid);

COMMENT ON TABLE host_balances IS '主办方充值余额表';
COMMENT ON COLUMN host_balances.balance IS '可用余额（分）';
COMMENT ON COLUMN host_balances.frozen_balance IS '冻结金额（分），用于正在处理的红包';

-- =====================================================
-- 2. 充值订单表（新增）
-- =====================================================
CREATE TABLE IF NOT EXISTS recharge_orders (
  id VARCHAR(100) PRIMARY KEY,
  openid VARCHAR(100) NOT NULL,
  amount BIGINT NOT NULL, -- 充值金额（分）
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
  payment_method VARCHAR(20) DEFAULT 'wechat', -- wechat, alipay
  transaction_id VARCHAR(100), -- 微信支付交易号
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_recharge_orders_openid ON recharge_orders(openid);
CREATE INDEX idx_recharge_orders_status ON recharge_orders(status);
CREATE INDEX idx_recharge_orders_created_at ON recharge_orders(created_at DESC);

COMMENT ON TABLE recharge_orders IS '充值订单表';
COMMENT ON COLUMN recharge_orders.status IS 'pending-待支付, completed-已完成, failed-失败, refunded-已退款';

-- =====================================================
-- 3. 余额变动日志表（新增）
-- =====================================================
CREATE TABLE IF NOT EXISTS balance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  openid VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL, -- recharge, red_packet, refund, adjust
  amount BIGINT NOT NULL, -- 变动金额（分），正数为增加，负数为减少
  balance_after BIGINT NOT NULL, -- 变动后余额（分）
  description TEXT,
  order_id VARCHAR(100), -- 关联订单号
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_balance_logs_openid ON balance_logs(openid);
CREATE INDEX idx_balance_logs_type ON balance_logs(type);
CREATE INDEX idx_balance_logs_created_at ON balance_logs(created_at DESC);

COMMENT ON TABLE balance_logs IS '余额变动日志表';
COMMENT ON COLUMN balance_logs.type IS 'recharge-充值, red_packet-红包, refund-退款, adjust-调整';

-- =====================================================
-- 4. 修改红包日志表（增加host_openid字段）
-- =====================================================
ALTER TABLE red_packet_logs ADD COLUMN IF NOT EXISTS host_openid VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_red_packet_logs_host_openid ON red_packet_logs(host_openid);

COMMENT ON COLUMN red_packet_logs.host_openid IS '主办方openid，红包资金来源';

-- =====================================================
-- 5. 修改随礼记录表（增加转账相关字段）
-- =====================================================
ALTER TABLE gift_records ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100);
ALTER TABLE gift_records ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE gift_records ADD COLUMN IF NOT EXISTS transfer_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE gift_records ADD COLUMN IF NOT EXISTS payment_no VARCHAR(100);
ALTER TABLE gift_records ADD COLUMN IF NOT EXISTS transfer_error TEXT;

COMMENT ON COLUMN gift_records.transaction_id IS '微信支付交易号';
COMMENT ON COLUMN gift_records.paid_at IS '支付成功时间';
COMMENT ON COLUMN gift_records.transfer_time IS '转账到主办方零钱时间';
COMMENT ON COLUMN gift_records.payment_no IS '转账单号';
COMMENT ON COLUMN gift_records.transfer_error IS '转账失败原因';

-- =====================================================
-- 6. 删除原有的服务商子商户相关字段（保留merchant_accounts表用于存储基本信息）
-- =====================================================
-- 注意：merchant_accounts表保留，但不再用于服务商子商户
-- 新用途：存储主办方收款账户信息（如银行卡等，用于提现）

-- 删除不需要的字段
ALTER TABLE merchant_accounts DROP COLUMN IF EXISTS sub_mch_id;
ALTER TABLE merchant_accounts DROP COLUMN IF EXISTS business_license_url;
ALTER TABLE merchant_accounts DROP COLUMN IF EXISTS bank_account_no;
ALTER TABLE merchant_accounts DROP COLUMN IF EXISTS bank_name;
ALTER TABLE merchant_accounts DROP COLUMN IF EXISTS bank_branch;

-- 修改status字段含义
COMMENT ON COLUMN merchant_accounts.status IS '账户状态：none-未开通, active-已激活（个人直收模式无需审核）';

-- =====================================================
-- 7. 数据迁移
-- =====================================================

-- 为现有主办方创建余额账户
INSERT INTO host_balances (openid, balance, frozen_balance, total_recharged, total_spent)
SELECT DISTINCT host_openid, 0, 0, 0, 0
FROM banquets
WHERE host_openid NOT IN (SELECT openid FROM host_balances)
ON CONFLICT (openid) DO NOTHING;

-- =====================================================
-- 8. 触发器：自动更新updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_host_balances_updated_at
    BEFORE UPDATE ON host_balances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recharge_orders_updated_at
    BEFORE UPDATE ON recharge_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. 行级安全策略（RLS）
-- =====================================================
ALTER TABLE host_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE recharge_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_logs ENABLE ROW LEVEL SECURITY;

-- 主办方只能查看自己的余额
CREATE POLICY "用户只能查看自己的余额" ON host_balances
    FOR SELECT USING (openid = current_setting('request.jwt.claims->>openid', true));

CREATE POLICY "用户只能查看自己的充值记录" ON recharge_orders
    FOR SELECT USING (openid = current_setting('request.jwt.claims->>openid', true));

CREATE POLICY "用户只能查看自己的余额日志" ON balance_logs
    FOR SELECT USING (openid = current_setting('request.jwt.claims->>openid', true));

-- =====================================================
-- 完成
-- =====================================================
-- 执行完成后，原有的服务商子商户逻辑已被替换为：
-- 1. 主办方个人直收模式（无需营业执照）
-- 2. 充值余额管理（用于发放红包）
-- 3. 资金直接到主办方微信零钱
-- =====================================================
