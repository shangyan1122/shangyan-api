-- 创建 gift_reminders 表
-- 用于人情往来提醒功能

CREATE TABLE IF NOT EXISTS gift_reminders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  openid TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  guest_openid TEXT,
  source_banquet_id UUID,
  gift_amount NUMERIC(10,2) DEFAULT 0,
  gift_date DATE,
  banquet_name TEXT,
  banquet_type TEXT,
  last_contact_date DATE,
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_frequency TEXT DEFAULT 'monthly' CHECK (reminder_frequency IN ('monthly', 'quarterly', 'yearly', 'custom')),
  next_reminder_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_gift_reminders_openid ON gift_reminders(openid);
CREATE INDEX IF NOT EXISTS idx_gift_reminders_next_reminder_date ON gift_reminders(next_reminder_date);
CREATE INDEX IF NOT EXISTS idx_gift_reminders_reminder_enabled ON gift_reminders(reminder_enabled);

-- 设置 RLS (Row Level Security)
ALTER TABLE gift_reminders ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能访问自己的提醒记录
CREATE POLICY "Users can view own reminders"
  ON gift_reminders FOR SELECT
  USING (auth.uid()::TEXT = openid);

CREATE POLICY "Users can insert own reminders"
  ON gift_reminders FOR INSERT
  WITH CHECK (auth.uid()::TEXT = openid);

CREATE POLICY "Users can update own reminders"
  ON gift_reminders FOR UPDATE
  USING (auth.uid()::TEXT = openid);

-- 允许 service role 完全访问（用于后端定时任务）
CREATE POLICY "Service role can do all"
  ON gift_reminders FOR ALL
  USING (true)
  WITH CHECK (true);

-- 添加表注释
COMMENT ON TABLE gift_reminders IS '人情往来提醒表';
COMMENT ON COLUMN gift_reminders.openid IS '用户OpenID';
COMMENT ON COLUMN gift_reminders.guest_name IS '宾客姓名';
COMMENT ON COLUMN gift_reminders.guest_phone IS '宾客电话';
COMMENT ON COLUMN gift_reminders.guest_openid IS '宾客OpenID';
COMMENT ON COLUMN gift_reminders.source_banquet_id IS '来源宴会ID';
COMMENT ON COLUMN gift_reminders.gift_amount IS '礼金金额';
COMMENT ON COLUMN gift_reminders.gift_date IS '收礼日期';
COMMENT ON COLUMN gift_reminders.banquet_name IS '宴会名称';
COMMENT ON COLUMN gift_reminders.banquet_type IS '宴会类型';
COMMENT ON COLUMN gift_reminders.last_contact_date IS '最后联系日期';
COMMENT ON COLUMN gift_reminders.reminder_enabled IS '是否启用提醒';
COMMENT ON COLUMN gift_reminders.reminder_frequency IS '提醒频率';
COMMENT ON COLUMN gift_reminders.next_reminder_date IS '下次提醒日期';
COMMENT ON COLUMN gift_reminders.notes IS '备注';
