-- ============================================
-- 尚宴礼记 - 数据库字段修复脚本
-- 执行日期: 2026-04-24
-- 说明: 让数据库字段名匹配代码期望
-- ============================================

-- ============================================
-- 第一步：添加缺失字段
-- ============================================

-- 1. 回礼相关字段
ALTER TABLE banquets 
  ADD COLUMN IF NOT EXISTS return_red_packet INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS return_gift_ids JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS return_gift_config JSONB DEFAULT '{}';

-- 2. AI页面相关字段
ALTER TABLE banquets 
  ADD COLUMN IF NOT EXISTS ai_welcome_page TEXT,
  ADD COLUMN IF NOT EXISTS ai_thank_page TEXT,
  ADD COLUMN IF NOT EXISTS ai_page_enabled BOOLEAN DEFAULT true;

-- 3. 商城相关字段
ALTER TABLE banquets 
  ADD COLUMN IF NOT EXISTS mall_gift_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS mall_gift_pay_amount INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mall_gift_pay_time TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS mall_gift_pay_no VARCHAR(64);

-- ============================================
-- 第二步：添加代码期望的字段（作为计算列）
-- ============================================

-- 注意：如果PostgreSQL版本不支持GENERATED COLUMNS（< 12），请改用触发器方案（见下方）

-- 4. event_time (TIMESTAMP) = banquet_date + banquet_time
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='banquets' AND column_name='event_time') THEN
    ALTER TABLE banquets 
      ADD COLUMN event_time TIMESTAMP WITH TIME ZONE 
      GENERATED ALWAYS AS (
        (banquet_date || 'T' || COALESCE(banquet_time, '00:00:00'))::TIMESTAMP WITH TIME ZONE
      ) STORED;
    RAISE NOTICE '✅ 添加 event_time 计算列成功';
  ELSE
    RAISE NOTICE '⚠️  event_time 列已存在，跳过';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ 添加 event_time 失败: %', SQLERRM;
END $$;

-- 5. type 字段（banquet_type的别名）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='banquets' AND column_name='type') THEN
    ALTER TABLE banquets 
      ADD COLUMN type VARCHAR(20) 
      GENERATED ALWAYS AS (banquet_type) STORED;
    RAISE NOTICE '✅ 添加 type 计算列成功';
  ELSE
    RAISE NOTICE '⚠️  type 列已存在，跳过';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ 添加 type 失败: %', SQLERRM;
END $$;

-- 6. location 字段（venue_name的别名）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='banquets' AND column_name='location') THEN
    ALTER TABLE banquets 
      ADD COLUMN location TEXT 
      GENERATED ALWAYS AS (venue_name) STORED;
    RAISE NOTICE '✅ 添加 location 计算列成功';
  ELSE
    RAISE NOTICE '⚠️  location 列已存在，跳过';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ 添加 location 失败: %', SQLERRM;
END $$;

-- 7. name 字段（banquet_name的别名）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='banquets' AND column_name='name') THEN
    ALTER TABLE banquets 
      ADD COLUMN name VARCHAR(255) 
      GENERATED ALWAYS AS (banquet_name) STORED;
    RAISE NOTICE '✅ 添加 name 计算列成功';
  ELSE
    RAISE NOTICE '⚠️  name 列已存在，跳过';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ 添加 name 失败: %', SQLERRM;
END $$;

-- 8. host_openid 字段（openid的别名）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='banquets' AND column_name='host_openid') THEN
    ALTER TABLE banquets 
      ADD COLUMN host_openid VARCHAR(128) 
      GENERATED ALWAYS AS (openid) STORED;
    RAISE NOTICE '✅ 添加 host_openid 计算列成功';
  ELSE
    RAISE NOTICE '⚠️  host_openid 列已存在，跳过';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ 添加 host_openid 失败: %', SQLERRM;
END $$;

-- ============================================
-- 第三步：迁移AI内容（从JSON列提取到TEXT列）
-- ============================================

UPDATE banquets 
SET 
  ai_welcome_page = COALESCE(
    ai_welcome_page, 
    welcome_page_config->>'content'
  ),
  ai_thank_page = COALESCE(
    ai_thank_page, 
    thank_page_config->>'content'
  )
WHERE ai_welcome_page IS NULL 
   OR ai_thank_page IS NULL;

RAISE NOTICE '✅ AI内容迁移完成';

-- ============================================
-- 第四步：修复 guest_return_gifts 表
-- ============================================

ALTER TABLE guest_return_gifts 
  ADD COLUMN IF NOT EXISTS estimated_ship_time TIMESTAMP WITH TIME ZONE;

RAISE NOTICE '✅ 添加 estimated_ship_time 字段成功';

-- ============================================
-- 第五步：创建索引（提高查询性能）
-- ============================================

CREATE INDEX IF NOT EXISTS idx_banquets_event_time ON banquets(event_time);
CREATE INDEX IF NOT EXISTS idx_banquets_type ON banquets(type);
CREATE INDEX IF NOT EXISTS idx_banquets_location ON banquets(location);

RAISE NOTICE '✅ 索引创建完成';

-- ============================================
-- 第六步：验证结果
-- ============================================

-- 查看修复后的表结构
SELECT 
  column_name, 
  data_type, 
  is_generated,
  column_default
FROM information_schema.columns 
WHERE table_name = 'banquets' 
ORDER BY ordinal_position;

-- 查看样本数据
SELECT 
  id,
  openid,
  host_openid,  -- 应该是计算列
  banquet_name,
  name,          -- 应该是计算列
  banquet_type,
  type,          -- 应该是计算列
  banquet_date,
  banquet_time,
  event_time,    -- 应该是计算列
  venue_name,
  location,      -- 应该是计算列
  ai_welcome_page,
  ai_thank_page,
  return_red_packet,
  ai_page_enabled
FROM banquets 
LIMIT 5;

-- ============================================
-- 执行完成！
-- ============================================

RAISE NOTICE '🎉 数据库修复脚本执行完成！';
