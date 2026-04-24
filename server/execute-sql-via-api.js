#!/usr/bin/env node
/**
 * 通过 Supabase Management API 执行 SQL
 * 使用提供的数据库凭证
 */

const https = require('https')

// Supabase 项目信息
const PROJECT_REF = 'qrkwbbphskndxzkfsfep'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFya3diYnBoc2tuZHh6a2ZzZmVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI4NDg0OCwiZXhwIjoxMDkwODYwODQ4fQ.ARIUCnl7VF3z6UugczoptN-TThOoocikAXXoh0r_Iq8'

// 读取迁移 SQL
const fs = require('fs')
const path = require('path')
const sqlPath = path.join(__dirname, '../database/migrations/002_create_guest_return_gifts.sql')
const sql = fs.readFileSync(sqlPath, 'utf8')

console.log('📦 准备执行迁移...')
console.log('   Project:', PROJECT_REF)
console.log('   SQL 长度:', sql.length, '字符\n')

// 使用 Supabase SQL API
async function executeSQL() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      query: sql
    })

    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${PROJECT_REF}/sql`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    console.log('🌐 发送请求到 Supabase Management API...')
    
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        console.log('📥 响应状态:', res.statusCode)
        console.log('📥 响应数据:', data.substring(0, 500))
        
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(data)
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', (e) => {
      console.error('❌ 请求失败:', e.message)
      reject(e)
    })

    req.write(postData)
    req.end()
  })
}

// 主函数
async function main() {
  try {
    await executeSQL()
    console.log('\n✅ SQL 执行成功！')
    console.log('   guest_return_gifts 表已创建')
  } catch (error) {
    console.error('\n❌ SQL 执行失败:', error.message)
    console.log('\n📋 请手动执行以下 SQL：')
    console.log('   1. 登录 https://supabase.com/dashboard')
    console.log('   2. 选择项目:', PROJECT_REF)
    console.log('   3. 打开 SQL Editor')
    console.log('   4. 复制粘贴 SQL 并执行\n')
  }
}

main()
