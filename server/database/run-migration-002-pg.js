#!/usr/bin/env node
/**
 * 迁移脚本（使用 pg 驱动）：创建 guest_return_gifts 表
 * 
 * 使用方法：
 * 1. 安装依赖：cd server && npm install pg
 * 2. 设置环境变量：DATABASE_URL=postgresql://...
 * 3. 运行脚本：node server/database/run-migration-002-pg.js
 */

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

// 读取 .env 文件
function loadEnv() {
  const envPath = path.join(__dirname, '../../.env')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const [key, ...values] = line.split('=')
      if (key && values.length > 0) {
        process.env[key.trim()] = values.join('=').trim()
      }
    })
    console.log('✅ 已加载 .env 文件')
  }
}

loadEnv()

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_CONNECTION_STRING

if (!DATABASE_URL) {
  console.error('❌ 缺少 DATABASE_URL 环境变量')
  console.error('请设置 Railway 数据库连接字符串')
  process.exit(1)
}

async function runMigration() {
  const client = new Client({ connectionString: DATABASE_URL })
  
  try {
    await client.connect()
    console.log('✅ 数据库连接成功')
    
    const sqlPath = path.join(__dirname, 'migrations/002_create_guest_return_gifts.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    console.log('📝 开始执行迁移脚本...')
    console.log('   ', sqlPath)
    
    // 执行整个 SQL 脚本
    await client.query(sql)
    
    console.log('\n✅ 迁移执行成功！')
    console.log('   guest_return_gifts 表已创建')
    
  } catch (error) {
    console.error('\n❌ 迁移执行失败:', error.message)
    console.error('详细错误:', error)
    process.exit(1)
  } finally {
    await client.end()
    console.log('\n🔌 数据库连接已关闭')
  }
}

runMigration().catch(console.error)
