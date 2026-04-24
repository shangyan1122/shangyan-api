#!/bin/bash
# Railway 环境变量 - 一键导入格式
# 在 Railway 项目 → Variables → Bulk Import 中粘贴以下内容

cat << 'ENVIRONMENT_VARIABLES'
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
SILICONFLOW_TEXT_MODEL=Qwen/Qwen2.5-7B-Instruct
TENCENT_CLOUD_SECRET_ID=AKIDYx85pLcfldFckohLlwta3VjiSxJZcVCq
TENCENT_CLOUD_SECRET_KEY=fIl14spY3JSXfcNvFLDuOfhDWbS4UfcK
TENCENT_SMS_APP_ID=401108684
ADMIN_ALLOWED_PHONES=19503511949
WECHAT_APP_ID=wx5c588dece21c6a42
WECHAT_APP_SECRET=96004c6d0312b74d4fc34a12b4e75a19
WECHAT_MCH_ID=1109422913
ENVIRONMENT_VARIABLES

echo ""
echo "========================================="
echo "✅ 环境变量已显示"
echo "========================================="
echo ""
echo "请在 Railway 项目中执行以下操作："
echo ""
echo "1. 打开：https://railway.com/project/8e9f2f6c-eb39-4731-8460-d13ea7f55e0c"
echo "2. 点击你的服务"
echo "3. 点击 'Variables' 标签"
echo "4. 点击 'Bulk Import' 按钮"
echo "5. 复制上面的所有变量（从 NODE_ENV 到 WECHAT_MCH_ID）"
echo "6. 粘贴到导入框中"
echo "7. 点击 'Import' 确认"
echo "8. 点击 'Deploy Now' 部署"
echo ""
echo "部署完成后，复制服务 URL 并发给我！"
echo ""
echo "========================================="
