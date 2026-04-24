/**
 * 使用Supabase Management API执行SQL
 * 文档: https://supabase.com/docs/reference/api/projects
 */

const https = require('https');
const { execSync } = require('child_process');

// 从Railway环境变量获取Supabase项目信息
const supabaseUrl = process.env.SUPABASE_URL || 'https://qrkwbbphskndxzkfsfep.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// 提取项目ID（从URL中提取）
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

console.log('🚀 使用Supabase Management API执行SQL修复...');
console.log('项目Ref:', projectRef);

if (!projectRef || !serviceRoleKey) {
  console.error('❌ 缺少必要的环境变量: SUPABASE_URL 或 SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// SQL语句
const sqlStatements = `
-- 添加缺失字段
ALTER TABLE IF EXISTS banquets 
  ADD COLUMN IF NOT EXISTS return_red_packet INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS return_gift_ids JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS return_gift_config JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_welcome_page TEXT,
  ADD COLUMN IF NOT EXISTS ai_thank_page TEXT,
  ADD COLUMN IF NOT EXISTS ai_page_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mall_gift_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS mall_gift_pay_amount INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mall_gift_pay_time TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS mall_gift_pay_no VARCHAR(64);

-- 添加计算列（如果PostgreSQL支持）
DO $$ 
BEGIN
  -- event_time 计算列
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='banquets' AND column_name='event_time') THEN
    BEGIN
      ALTER TABLE banquets 
        ADD COLUMN event_time TIMESTAMP WITH TIME ZONE 
        GENERATED ALWAYS AS (
          (banquet_date || 'T' || COALESCE(banquet_time, '00:00:00'))::TIMESTAMP WITH TIME ZONE
        ) STORED;
    EXCEPTION 
      WHEN OTHERS THEN 
        -- 如果不支持生成列，添加普通列
        ALTER TABLE banquets ADD COLUMN IF NOT EXISTS event_time TIMESTAMP WITH TIME ZONE;
    END;
  END IF;

  -- type 计算列
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='banquets' AND column_name='type') THEN
    BEGIN
      ALTER TABLE banquets 
        ADD COLUMN type VARCHAR(20) 
        GENERATED ALWAYS AS (banquet_type) STORED;
    EXCEPTION 
      WHEN OTHERS THEN 
        ALTER TABLE banquets ADD COLUMN IF NOT EXISTS type VARCHAR(20);
    END;
  END IF;

  -- location 计算列
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='banquets' AND column_name='location') THEN
    BEGIN
      ALTER TABLE banquets 
        ADD COLUMN location TEXT 
        GENERATED ALWAYS AS (venue_name) STORED;
    EXCEPTION 
      WHEN OTHERS THEN 
        ALTER TABLE banquets ADD COLUMN IF NOT EXISTS location TEXT;
    END;
  END IF;

  -- name 计算列
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='banquets' AND column_name='name') THEN
    BEGIN
      ALTER TABLE banquets 
        ADD COLUMN name VARCHAR(255) 
        GENERATED ALWAYS AS (banquet_name) STORED;
    EXCEPTION 
      WHEN OTHERS THEN 
        ALTER TABLE banquets ADD COLUMN IF NOT EXISTS name VARCHAR(255);
    END;
  END IF;

  -- host_openid 计算列
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='banquets' AND column_name='host_openid') THEN
    BEGIN
      ALTER TABLE banquets 
        ADD COLUMN host_openid VARCHAR(128) 
        GENERATED ALWAYS AS (openid) STORED;
    EXCEPTION 
      WHEN OTHERS THEN 
        ALTER TABLE banquets ADD COLUMN IF NOT EXISTS host_openid VARCHAR(128);
    END;
  END IF;
END $$;

-- 迁移AI内容
UPDATE banquets 
SET 
  ai_welcome_page = COALESCE(ai_welcome_page, welcome_page_config->>'content'),
  ai_thank_page = COALESCE(ai_thank_page, thank_page_config->>'content')
WHERE ai_welcome_page IS NULL 
   OR ai_thank_page IS NULL;

-- 修复 guest_return_gifts 表
ALTER TABLE IF EXISTS guest_return_gifts 
  ADD COLUMN IF NOT EXISTS estimated_ship_time TIMESTAMP WITH TIME ZONE;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_banquets_event_time ON banquets(event_time);
CREATE INDEX IF NOT EXISTS idx_banquets_type ON banquets(type);
CREATE INDEX IF NOT EXISTS idx_banquets_location ON banquets(venue_name);

-- 验证：查看表结构
SELECT 
  column_name, 
  data_type, 
  is_generated
FROM information_schema.columns 
WHERE table_name = 'banquets' 
ORDER BY ordinal_position;
`;

// 使用Supabase的SQL端点（需要Service Role Key）
// 注意：Supabase JavaScript客户端不支持直接执行SQL，但我们可以使用pg连接

// 方案：使用正确的连接字符串格式
// Supabase Pooler连接格式：postgresql://postgres.ref:password@aws-0-region.pooler.supabase.com:6543/postgres
// 我们需要从DATABASE_URL环境变量中解析

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ 缺少 DATABASE_URL 环境变量');
  console.log('请确保Railway环境变量中设置了 DATABASE_URL');
  process.exit(1);
}

console.log('使用数据库连接:', databaseUrl.replace(/:[^:@]+@/, ':****@'));

// 使用child_process运行psql命令（如果可用）
// 或者我们可以使用pg库，但需要先安装

// 让我们尝试使用Railway的Shell访问来执行SQL
console.log('\n📝 由于API限制，我无法直接执行SQL。');
console.log('请按以下步骤手动执行SQL修复：\n');
console.log('方案1：使用Supabase SQL编辑器（推荐）');
console.log('1. 访问: https://supabase.com/dashboard/project/' + projectRef + '/sql');
console.log('2. 复制下面的SQL语句');
console.log('3. 粘贴到SQL编辑器并点击"Run"\n');

console.log('方案2：使用psql命令行工具');
console.log('1. 安装psql: brew install libpq');
console.log('2. 运行: psql "' + databaseUrl + '" -f fix-database-schema.sql\n');

console.log('===========================================');
console.log('SQL修复脚本已生成在: /Users/mac/CodeBuddy/Claw/shangyan-api/fix-database-schema.sql');
console.log('===========================================\n');

console.log('📋 SQL内容预览（完整内容请查看文件）:');
console.log(sqlStatements.substring(0, 500) + '...\n');

// 将SQL保存到文件
const fs = require('fs');
fs.writeFileSync('/tmp/supabase-fix.sql', sqlStatements);
console.log('✅ SQL已保存到 /tmp/supabase-fix.sql');
console.log('   你可以将这个文件内容复制到Supabase SQL编辑器中执行');
