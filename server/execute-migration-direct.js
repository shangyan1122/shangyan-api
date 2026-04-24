#!/usr/bin/env node
/**
 * 直接连接 Supabase PostgreSQL 执行迁移
 * 使用你提供的数据库凭证
 */

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const PROJECT_REF = 'qrkwbbphskndxzkfsfep'

// Supabase 数据库连接配置
// 格式：postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
const config = {
  host: `db.${PROJECT_REF}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Lianger5819', // 你提供的密码
  ssl: {
    rejectUnauthorized: false // Supabase 需要 SSL
  }
}

async function executeMigration() {
  const client = new Client(config)
  
  try {
    console.log('🔌 正在连接 Supabase 数据库...')
    console.log('   Host:', config.host)
    console.log('   User:', config.user)
    
    await client.connect()
    console.log('✅ 数据库连接成功！\n')
    
    // 读取迁移 SQL
    const sqlPath = path.join(__dirname, '../database/migrations/002_create_guest_return_gifts.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    console.log('📝 开始执行迁移...')
    console.log('   SQL 文件:', sqlPath)
    console.log('   文件大小:', sql.length, '字节\n')
    
    // 执行 SQL
    await client.query(sql)
    
    console.log('\n✅ 迁移执行成功！')
    console.log('   guest_return_gifts 表已创建')
    console.log('   相关索引和触发器也已创建\n')
    
    // 验证表是否创建成功
    console.log('🔍 验证表创建...')
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'guest_return_gifts'
    `)
    
    if (result.rows.length > 0) {
      console.log('✅ 验证成功：guest_return_gifts 表已存在\n')
    } else {
      console.log('⚠️  验证失败：表可能未创建\n')
    }
    
  } catch (error) {
    console.error('\n❌ 执行失败:', error.message)
    console.error('   详细错误:', error)
    process.exit(1)
  } finally {
    await client.end()
    console.log('🔌 数据库连接已关闭')
  }
}

// 执行
console.log('🚀 尚宴礼记数据库迁移工具\n')
executeMigration().catch(console.error)
