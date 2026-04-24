// 尚宴礼记 API - Railway 自动部署脚本
// 使用 Node.js 调用 Railway API

const https = require('https');
const fs = require('fs');

// Railway API 配置
const RAILWAY_API = 'https://backboard.railway.app/graphql';
let RAILWAY_TOKEN = process.env.RAILWAY_TOKEN || '';

// GraphQL 请求封装
function graphql(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query, variables });
    
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RAILWAY_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    const req = https.request(RAILWAY_API, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.errors) {
            reject(new Error(JSON.stringify(json.errors, null, 2)));
          } else {
            resolve(json.data);
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// 主函数
async function main() {
  console.log('='.repeat(60));
  console.log('尚宴礼记 API - Railway 自动部署');
  console.log('='.repeat(60));
  
  // 1. 检查 Token
  if (!RAILWAY_TOKEN) {
    console.error('\n❌ 错误：未设置 RAILWAY_TOKEN 环境变量\n');
    console.log('请按以下步骤操作：\n');
    console.log('1. 访问：https://railway.com/account/tokens');
    console.log('2. 点击 "Create Token"');
    console.log('3. 名称：codebuddy');
    console.log('4. 权限：Full Access');
    console.log('5. 点击 "Create"');
    console.log('6. 复制完整 Token');
    console.log('7. 运行：export RAILWAY_TOKEN="你的Token"');
    console.log('8. 重新运行此脚本：node deploy-to-railway.js\n');
    process.exit(1);
  }
  
  console.log('\n✅ RAILWAY_TOKEN 已设置');
  
  try {
    // 2. 验证 Token
    console.log('🔍 验证 Token...');
    const me = await graphql('{ me { id name } }');
    console.log(`✅ Token 有效 - 用户：${me.me.name} (${me.me.id})`);
    
    // 3. 提示手动操作
    console.log('\n' + '='.repeat(60));
    console.log('⚠️  需要你手动完成以下步骤：');
    console.log('='.repeat(60) + '\n');
    
    console.log('1. 打开 Railway 项目：');
    console.log('   https://railway.com/project/8e9f2f6c-eb39-4731-8460-d13ea7f55e0c\n');
    
    console.log('2. 点击 "New Service" → 选择 "GitHub Repo"');
    console.log('   仓库：shangyan1122/shangyan-api\n');
    
    console.log('3. 进入创建的服务 → "Variables" 标签');
    console.log('   点击 "Bulk Import"，复制粘贴环境变量\n');
    
    console.log('4. 环境变量列表已保存到：');
    console.log('   /Users/mac/CodeBuddy/Claw/shangyan-api/railway-env-variables.md\n');
    
    console.log('5. 添加完环境变量后，点击 "Deploy Now"');
    console.log('   等待部署完成（约 3-5 分钟）\n');
    
    console.log('6. 部署完成后，复制服务 URL（格式：https://xxx.up.railway.app）');
    console.log('   并发给我验证\n');
    
    console.log('='.repeat(60));
    console.log('✅ 准备完成！请在 Railway Web 界面完成配置。');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ 错误：', error.message);
    process.exit(1);
  }
}

main();
