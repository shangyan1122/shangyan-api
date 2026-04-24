#!/usr/bin/env node
/**
 * 迁移脚本：创建 guest_return_gifts 表
 * 使用方法：node server/database/run-migration-002.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// 从环境变量或 .env 文件读取配置
require('dotenv').config({ path: path.join(__dirname, '../../.env') })

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 缺少 SUPABASE_SERVICE_ROLE_KEY 环境变量')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function runMigration() {
  console.log('🚀 开始执行迁移：创建 guest_return_gifts 表')
  
  const sqlPath = path.join(__dirname, 'migrations/002_create_guest_return_gifts.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')
  
  // 分割成独立的 SQL 语句
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
  
  console.log(`📝 找到 ${statements.length} 条 SQL 语句`)
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    console.log(`\n⏳ 执行语句 ${i + 1}/${statements.length}...`)
    console.log(`   ${stmt.substring(0, 100)}...`)
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: stmt + ';' })
      
      if (error) {
        // 如果 rpc 不存在，尝试直接执行
        console.warn('⚠️  RPC 执行失败，尝试直接使用 supabase...')
        console.error('错误:', error.message)
        
        // 对于 CREATE TABLE 等 DDL，我们需要使用 supabase.sql()
        // 但 @supabase/supabase-js 不支持直接执行 DDL
        // 需要使用 supabase.rpc() 或直接在数据库中执行
        throw new Error('需要使用 supabase-db 或直接在数据库中执行此迁移')
      }
      
      console.log('✅ 执行成功')
    } catch (err) {
      console.error(`❌ 执行失败: ${err.message}`)
      
      // 如果是 "already exists" 类型的错误，继续执行
      if (err.message.includes('already exists')) {
        console.log('⚠️  对象已存在，继续执行...')
        continue
      }
      
      // 其他错误，询问是否继续
      console.error('请检查错误后重试，或手动在数据库中执行此 SQL')
      process.exit(1)
    }
  }
  
  console.log('\n🎉 迁移完成！guest_return_gifts 表已创建')
}

runMigration().catch(console.error)
