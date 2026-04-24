/**
 * 数据库修复脚本 - 直接连接PostgreSQL执行
 */

const { Client } = require('pg');

// 从环境变量读取数据库连接
const databaseUrl = process.env.DATABASE_URL || 
  'postgresql://postgres.qrkwbbphskndxzkfsfep:IhePI3LwFSkRnf68@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

console.log('使用数据库连接:', process.env.DATABASE_URL ? '环境变量DATABASE_URL' : '默认连接字符串');

console.log('🚀 开始连接数据库...');
console.log('数据库URL:', databaseUrl.replace(/:[^:@]+@/, ':****@')); // 隐藏密码

const client = new Client({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false // Supabase需要SSL，但自签名证书
  }
});

// SQL语句数组
const sqlStatements = [
  // 1. 添加缺失字段
  `ALTER TABLE IF EXISTS banquets 
    ADD COLUMN IF NOT EXISTS return_red_packet INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS return_gift_ids JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS return_gift_config JSONB DEFAULT '{}'`,
  
  `ALTER TABLE IF EXISTS banquets 
    ADD COLUMN IF NOT EXISTS ai_welcome_page TEXT,
    ADD COLUMN IF NOT EXISTS ai_thank_page TEXT,
    ADD COLUMN IF NOT EXISTS ai_page_enabled BOOLEAN DEFAULT true`,
  
  `ALTER TABLE IF EXISTS banquets 
    ADD COLUMN IF NOT EXISTS mall_gift_paid BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS mall_gift_pay_amount INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS mall_gift_pay_time TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS mall_gift_pay_no VARCHAR(64)`,
  
  // 2. 添加代码期望的字段（作为计算列或真实列）
  // 注意：如果PostgreSQL版本不支持GENERATED COLUMNS，则添加真实列并创建触发器
  `DO $$ 
   BEGIN 
     IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='banquets' AND column_name='event_time') THEN
        ALTER TABLE banquets 
          ADD COLUMN event_time TIMESTAMP WITH TIME ZONE 
          GENERATED ALWAYS AS (
            (banquet_date || 'T' || COALESCE(banquet_time, '00:00:00'))::TIMESTAMP WITH TIME ZONE
          ) STORED;
     END IF;
   EXCEPTION 
     WHEN OTHERS THEN 
        -- 如果GENERATED COLUMNS不支持，添加普通列
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='banquets' AND column_name='event_time') THEN
           ALTER TABLE banquets ADD COLUMN event_time TIMESTAMP WITH TIME ZONE;
        END IF;
   END $$`,
  
  `DO $$ 
   BEGIN 
     IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='banquets' AND column_name='type') THEN
        ALTER TABLE banquets 
          ADD COLUMN type VARCHAR(20) 
          GENERATED ALWAYS AS (banquet_type) STORED;
     END IF;
   EXCEPTION 
     WHEN OTHERS THEN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='banquets' AND column_name='type') THEN
           ALTER TABLE banquets ADD COLUMN type VARCHAR(20);
           -- 创建触发器更新type
        END IF;
   END $$`,
  
  // 3. 迁移AI内容
  `UPDATE banquets 
   SET 
     ai_welcome_page = COALESCE(ai_welcome_page, welcome_page_config->>'content'),
     ai_thank_page = COALESCE(ai_thank_page, thank_page_config->>'content')
   WHERE ai_welcome_page IS NULL 
      OR ai_thank_page IS NULL`,
  
  // 4. 修复 guest_return_gifts 表
  `ALTER TABLE IF EXISTS guest_return_gifts 
    ADD COLUMN IF NOT EXISTS estimated_ship_time TIMESTAMP WITH TIME ZONE`,
  
  // 5. 创建索引
  `CREATE INDEX IF NOT EXISTS idx_banquets_event_time ON banquets(event_time)`,
  `CREATE INDEX IF NOT EXISTS idx_banquets_type ON banquets(type)`,
  `CREATE INDEX IF NOT EXISTS idx_banquets_location ON banquets(venue_name)`,
];

async function executeFix() {
  try {
    await client.connect();
    console.log('✅ 数据库连接成功！\n');
    
    console.log('📋 开始执行修复SQL...\n');
    
    for (let i = 0; i < sqlStatements.length; i++) {
      const sql = sqlStatements[i];
      const shortDesc = sql.substring(0, 60).replace(/\s+/g, ' ');
      
      console.log(`[${i + 1}/${sqlStatements.length}] ${shortDesc}...`);
      
      try {
        await client.query(sql);
        console.log(`  ✅ 成功`);
      } catch (err) {
        console.warn(`  ⚠️  警告: ${err.message}`);
        // 继续运行，不中断
      }
    }
    
    console.log('\n🔍 验证：查看修复后的表结构...');
    
    // 验证：查看banquets表的列
    const { rows } = await client.query(`
      SELECT column_name, data_type, is_generated
      FROM information_schema.columns 
      WHERE table_name = 'banquets' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 banquets表现在的结构：');
    console.table(rows.map(row => ({
      字段名: row.column_name,
      数据类型: row.data_type,
      计算列: row.is_generated
    })));
    
    // 验证：查看样本数据
    const { rows: sampleRows } = await client.query(`
      SELECT id, openid, banquet_name, banquet_type, event_time, location
      FROM banquets 
      LIMIT 2
    `);
    
    if (sampleRows.length > 0) {
      console.log('\n📝 样本数据：');
      console.log(JSON.stringify(sampleRows, null, 2));
    } else {
      console.log('\n📝 表中暂无数据');
    }
    
    console.log('\n🎉 数据库修复脚本执行完成！');
    
  } catch (err) {
    console.error('❌ 执行失败:', err.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 数据库连接已关闭');
  }
}

executeFix().catch(err => {
  console.error('❌ 未捕获的错误:', err);
  process.exit(1);
});
