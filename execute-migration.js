#!/usr/bin/env node
/**
 * 通过Supabase Management API执行SQL迁移
 * 需要：SUPABASE_PROJECT_REF, SUPABASE_MANAGEMENT_API_KEY
 */

const https = require('https')

// 配置（从 .env 读取）
const SUPABASE_URL = 'https://qrkwbbphskndxzkfsfep.supabase.co'
const SUPABASE_PROJECT_REF = 'qrkwbbphskndxzkfsfep'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFya3diYnBoc2tuZHh6a2ZzZmVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI4NDg0OCwiZXhwIjoxMDkwODYwODQ4fQ.ARIUCnl7VF3z6UugczoptN-TThOoocikAXXoh0r_Iq8'

// 读取迁移SQL
const fs = require('fs')
const path = require('path')
const sqlPath = path.join(__dirname, 'server/database/migrations/002_create_guest_return_gifts.sql')
const sql = fs.readFileSync(sqlPath, 'utf8')

console.log('📦 准备执行迁移...')
console.log('   Project Ref:', SUPABASE_PROJECT_REF)
console.log('   SQL 长度:', sql.length, '字符')

// 方法1：尝试使用 Supabase SQL Endpoint
// 注意：这个端点需要特殊的认证
async function executeViaSupabaseSQL() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      query: sql
    })

    const options = {
      hostname: 'qrkwbbphskndxzkfsfep.supabase.co',
      port: 443,
      path: '/pg',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        console.log('响应状态:', res.statusCode)
        console.log('响应数据:', data)
        if (res.statusCode === 200) {
          resolve(data)
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', (e) => reject(e))
    req.write(postData)
    req.end()
  })
}

// 方法2：执行分割的SQL语句（使用 Supabase RPC）
async function executeViaRPC() {
  // 分割SQL语句
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`\n📝 找到 ${statements.length} 条 SQL 语句`)
  console.log('⚠️  无法通过 Supabase JS 客户端直接执行 DDL')
  console.log('   需要使用 Supabase Dashboard 或 Management API')
  
  return { success: false, method: 'rpc-blocked' }
}

// 主函数
async function main() {
  console.log('\n🚀 开始执行迁移...\n')

  try {
    // 尝试方法1
    console.log('方法1：尝试 Supabase SQL Endpoint...')
    try {
      await executeViaSupabaseSQL()
      console.log('✅ 迁移执行成功！')
      return
    } catch (e1) {
      console.log('❌ 方法1失败:', e1.message)
    }

    // 尝试方法2
    console.log('\n方法2：检查 RPC 方法...')
    const result = await executeViaRPC()
    
    if (!result.success) {
      console.log('\n❌ 无法自动执行迁移')
      console.log('\n📋 请手动执行以下步骤：')
      console.log('   1. 登录 Supabase Dashboard')
      console.log('   2. 打开 SQL Editor')
      console.log('   3. 复制粘贴以下 SQL 并执行：')
      console.log('\n========== SQL 开始 ==========')
      console.log(sql)
      console.log('========== SQL 结束 ==========\n')
    }
  } catch (error) {
    console.error('\n❌ 执行失败:', error.message)
    process.exit(1)
  }
}

main()
