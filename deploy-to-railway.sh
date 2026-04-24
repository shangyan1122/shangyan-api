#!/bin/bash
# 尚宴礼记 API - 自动部署到 Railway

set -e  # 任何命令失败就退出

echo "========================================="
echo "尚宴礼记 API - Railway 自动部署"
echo "========================================="

# 1. 检查 Railway Token
if [ -z "$RAILWAY_TOKEN" ]; then
    echo "❌ 错误：未设置 RAILWAY_TOKEN 环境变量"
    echo ""
    echo "请先获取 Railway API Token："
    echo "1. 访问 https://railway.com/account/tokens"
    echo "2. 创建新 Token（名称：codebuddy，权限：Full Access）"
    echo "3. 复制完整 Token"
    echo "4. 运行：export RAILWAY_TOKEN='你的Token'"
    echo "5. 重新运行此脚本"
    exit 1
fi

echo "✅ RAILWAY_TOKEN 已设置"

# 2. 设置变量
PROJECT_ID="8e9f2f6c-eb39-4731-8460-d13ea7f55e0c"
API_ENDPOINT="https://backboard.railway.app/graphql"

echo ""
echo "📋 项目 ID: $PROJECT_ID"
echo "🌐 API 端点: $API_ENDPOINT"
echo ""

# 3. 测试 API Token
echo "🔍 测试 API Token..."
RESPONSE=$(curl -s -X POST "$API_ENDPOINT" \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ me { id name } }"}')

if echo "$RESPONSE" | grep -q "errors"; then
    echo "❌ Token 无效或权限不足"
    echo "$RESPONSE" | python3 -m json.tool
    exit 1
fi

echo "✅ Token 有效"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# 4. 获取项目信息
echo "📦 获取项目信息..."
PROJECT_RESPONSE=$(curl -s -X POST "$API_ENDPOINT" \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ project(id: \\\"$PROJECT_ID\\\") { id name } }\"}")

echo "$PROJECT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$PROJECT_RESPONSE"
echo ""

# 5. 提示用户手动操作
echo "========================================="
echo "⚠️  需要你手动完成以下步骤："
echo "========================================="
echo ""
echo "1. 打开 Railway 项目："
echo "   https://railway.com/project/$PROJECT_ID"
echo ""
echo "2. 点击 'New Service' → 选择 'GitHub Repo'"
echo ""
echo "3. 选择仓库：shangyan1122/shangyan-api"
echo ""
echo "4. 进入创建的服务 → 'Variables' 标签"
echo ""
echo "5. 点击 'Bulk Import'，复制粘贴以下变量："
echo ""
echo "--- 复制开始 ---"

cat << 'ENVVARS'
NODE_ENV=production
PORT=3000
JWT_SECRET=shangyan-admin-secret-key-2024
JWT_EXPIRES_IN=7d
MOCK_PAYMENT=false
SUPABASE_URL=https://qrkwbbphskndxzkfsfep.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFya3diYnBoc2tuZHh6a2ZzZmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyODQ4NDgsImV4cCI6MjA5MDg2MDg0OH0.PZLu_w9Xq56_hu0ICzFtt0TdhCkAC78Uj3ANc3SgNwg
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFya3diYnBoc2tuZHh6a2ZzZmVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI4NDg0OCwiZXhwIjoxMDkwODYwODQ4fQ.ARIUCnl7VF3z6UugczoptN-TThOoocikAXXoh0r_Iq8
DATABASE_URL=postgresql://postgres.qrkwbbphskndxzkfsfep:IhePI3LwFSkRnf68@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
AI_PROVIDER=siliconflow
SILICONFLOW_API_KEY=sk-iucrdyhoftqmvnmtofvpkvbroattwxyzsjlpnkcvqkxqdqzy
TENCENT_CLOUD_SECRET_ID=AKIDYx85pLcfldFckohLlwta3VjiSxJZcVCq
TENCENT_CLOUD_SECRET_KEY=fIl14spY3JSXfcNvFLDuOfhDWbS4UfcK
TENCENT_SMS_APP_ID=401108684
ADMIN_ALLOWED_PHONES=19503511949
WECHAT_APP_ID=wx5c588dece21c6a42
WECHAT_APP_SECRET=96004c6d0312b74d4fc34a12b4e75a19
WECHAT_MCH_ID=1109422913
ENVVARS

echo "--- 复制结束 ---"
echo ""
echo "6. 点击 'Import' 确认"
echo ""
echo "7. 进入 'Deployments' 标签，点击 'Deploy Now'"
echo ""
echo "8. 等待部署完成（约 3-5 分钟）"
echo ""
echo "9. 复制服务 URL（格式：https://xxx.up.railway.app）并发给我"
echo ""
echo "========================================="
echo "✅ 脚本执行完成！"
echo "========================================="
