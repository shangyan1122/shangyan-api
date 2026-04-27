#!/usr/bin/env node
/**
 * Railway 配置诊断脚本
 * 检查是否有多个服务、部署配置等
 */

const https = require('https');

const RAILWAY_TOKEN = process.env.RAILWAY_TOKEN || '4spznzypyhTnHQzA1LM21Wz7bYQEYwzE';
const PROJECT_ID = process.env.RAILWAY_PROJECT_ID || 'cfb5e3df-971e-4026-94fc-16d6e4a8c532';

console.log('🔍 Railway 配置诊断\n');
console.log('Project ID:', PROJECT_ID);
console.log('');

// GraphQL 查询获取项目信息
const query = `
{
  project(id: "${PROJECT_ID}") {
    id
    name
    services {
      edges {
        node {
          id
          name
          createdAt
        }
      }
    }
  }
}
`;

const options = {
  hostname: 'backboard.railway.app',
  path: '/graphql/v2',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': RAILWAY_TOKEN,
  },
};

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.errors) {
        console.error('❌ GraphQL 错误:', result.errors);
        return;
      }
      
      const project = result.data.project;
      console.log('✅ 项目信息:');
      console.log('   名称:', project.name);
      console.log('   ID:', project.id);
      console.log('');
      
      const services = project.services.edges;
      console.log(`📦 服务数量: ${services.length}\n`);
      
      if (services.length > 1) {
        console.log('⚠️  发现多个服务！这可能导致重复部署：');
        services.forEach(({ node }, index) => {
          console.log(`   ${index + 1}. ${node.name} (ID: ${node.id})`);
          console.log(`      创建时间: ${new Date(node.createdAt).toLocaleString('zh-CN')}`);
        });
        console.log('');
        console.log('💡 建议：删除多余的服务，只保留一个');
      } else if (services.length === 1) {
        console.log('✅ 只有 1 个服务，配置正常：');
        console.log(`   名称: ${services[0].node.name}`);
        console.log(`   ID: ${services[0].node.id}`);
      } else {
        console.log('⚠️  没有找到任何服务');
      }
      
    } catch (error) {
      console.error('❌ 解析错误:', error.message);
      console.error('原始数据:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ 请求错误:', error.message);
});

req.write(JSON.stringify({ query }));
req.end();

console.log('正在查询 Railway API...\n');
