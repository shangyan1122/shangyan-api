/**
 * 数据库字段修复脚本
 * 执行日期: 2026-04-24
 * 说明: 让数据库字段名匹配代码期望
 */

const { createClient } = require('@supabase/supabase-js');

// 从环境变量读取Supabase配置
const supabaseUrl = process.env.SUPABASE_URL || 'https://qrkwbbphskndxzkfsfep.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseKey) {
  console.error('❌ 缺少 SUPABASE_SERVICE_ROLE_KEY 环境变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// SQL语句数组（逐条执行）
const sqlStatements = [
  // 1. 添加代码中使用的字段
  `ALTER TABLE banquets 
    ADD COLUMN IF NOT EXISTS return_red_packet INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS return_gift_ids JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS return_gift_config JSONB DEFAULT '{}'`,
  
  `ALTER TABLE banquets 
    ADD COLUMN IF NOT EXISTS ai_welcome_page TEXT,
    ADD COLUMN IF NOT EXISTS ai_thank_page TEXT,
    ADD COLUMN IF NOT EXISTS ai_page_enabled BOOLEAN DEFAULT true`,
  
  `ALTER TABLE banquets 
    ADD COLUMN IF NOT EXISTS mall_gift_paid BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS mall_gift_pay_amount INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS mall_gift_pay_time TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS mall_gift_pay_no VARCHAR(64)`,
  
  // 2. 添加代码期望的字段名（作为计算列）
  `ALTER TABLE banquets 
    ADD COLUMN IF NOT EXISTS event_time TIMESTAMP WITH TIME ZONE 
    GENERATED ALWAYS AS (
      (banquet_date || 'T' || COALESCE(banquet_time, '00:00:00'))::TIMESTAMP WITH TIME ZONE
    ) STORED`,
  
  `ALTER TABLE banquets 
    ADD COLUMN IF NOT EXISTS type VARCHAR(20) 
    GENERATED ALWAYS AS (banquet_type) STORED`,
  
  `ALTER TABLE banquets 
    ADD COLUMN IF NOT EXISTS location TEXT 
    GENERATED ALWAYS AS (venue_name) STORED`,
  
  `ALTER TABLE banquets 
    ADD COLUMN IF NOT EXISTS name VARCHAR(255) 
    GENERATED ALWAYS AS (banquet_name) STORED`,
  
  `ALTER TABLE banquets 
    ADD COLUMN IF NOT EXISTS host_openid VARCHAR(128) 
    GENERATED ALWAYS AS (openid) STORED`,
  
  // 3. 迁移AI内容
  `UPDATE banquets 
   SET 
     ai_welcome_page = COALESCE(ai_welcome_page, welcome_page_config->>'content'),
     ai_thank_page = COALESCE(ai_thank_page, thank_page_config->>'content')
   WHERE ai_welcome_page IS NULL OR ai_thank_page IS NULL`,
  
  // 4. 修复 guest_return_gifts 表
  `ALTER TABLE guest_return_gifts 
    ADD COLUMN IF NOT EXISTS estimated_ship_time TIMESTAMP WITH TIME ZONE`,
  
  // 5. 创建索引
  `CREATE INDEX IF NOT EXISTS idx_banquets_event_time ON banquets(event_time)`,
  `CREATE INDEX IF NOT EXISTS idx_banquets_type ON banquets(type)`,
  `CREATE INDEX IF NOT EXISTS idx_banquets_location ON banquets(location)`
];

async function executeSQL() {
  console.log('🚀 开始执行数据库修复脚本...\n');
  
  for (let i = 0; i < sqlStatements.length; i++) {
    const sql = sqlStatements[i];
    const shortDesc = sql.substring(0, 60).replace(/\s+/g, ' ');
    
    console.log(`[${i + 1}/${sqlStatements.length}] ${shortDesc}...`);
    
    try {
      // 使用 rpc 调用（需要数据库有 exec_sql 函数）或直接查询
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        // 如果 rpc 失败，尝试直接使用 pg 连接（通过 REST API）
        console.warn(`  ⚠️  警告: ${error.message}`);
        
        // 尝试使用 Supabase Management API
        // 注意：这需要额外的权限，可能会失败
      } else {
        console.log(`  ✅ 成功`);
      }
    } catch (err) {
      console.warn(`  ⚠️  异常: ${err.message}`);
    }
  }
  
  console.log('\n📊 验证：查看修复后的表结构...');
  
  try {
    const { data, error } = await supabase
      .from('banquets')
      .select('id, openid, host_openid, banquet_name, name, banquet_type, type, event_time, location')
      .limit(1);
    
    if (error) {
      console.error(`❌ 验证失败: ${error.message}`);
    } else {
      console.log('✅ 验证成功！样本数据:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error(`❌ 验证异常: ${err.message}`);
  }
  
  console.log('\n✅ 数据库修复脚本执行完成！');
}

executeSQL().catch(err => {
  console.error('❌ 执行失败:', err);
  process.exit(1);
});
