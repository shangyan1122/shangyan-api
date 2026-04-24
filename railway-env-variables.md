# Railway 环境变量配置清单

请在 Railway 新项目 (shangyan-api-new) 的 Variables 页面中，点击 "Bulk Import" 批量导入以下变量：

```
NODE_ENV=production
PORT=3000
JWT_SECRET=shangyan-admin-secret-key-2024
JWT_EXPIRES_IN=7d
MOCK_PAYMENT=false

# Supabase 配置
SUPABASE_URL=https://qrkwbbphskndxzkfsfep.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFya3diYnBoc2tuZHh6a2ZzZmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyODQ4NDgsImV4cCI6MjA5MDg2MDg0OH0.PZLu_w9Xq56_hu0ICzFtt0TdhCkAC78Uj3ANc3SgNwg
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFya3diYnBoc2tuZHh6a2ZzZmVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI4NDg0OCwiZXhwIjoxMDkwODYwODQ4fQ.ARIUCnl7VF3z6UugczoptN-TThOoocikAXXoh0r_Iq8
DATABASE_URL=postgresql://postgres.qrkwbbphskndxzkfsfep:IhePI3LwFSkRnf68@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres

# 硅基流动 AI
AI_PROVIDER=siliconflow
SILICONFLOW_API_KEY=sk-iucrdyhoftqmvnmtofvpkvbroattwxyzsjlpnkcvqkxqdqzy
SILICONFLOW_TEXT_MODEL=Qwen/Qwen2.5-7B-Instruct
SILICONFLOW_VISION_MODEL=Qwen/Qwen2-VL-7B-Instruct
SILICONFLOW_TEMPERATURE=0.7
SILICONFLOW_MAX_TOKENS=2000

# 腾讯云短信
TENCENT_CLOUD_SECRET_ID=AKIDYx85pLcfldFckohLlwta3VjiSxJZcVCq
TENCENT_CLOUD_SECRET_KEY=fIl14spY3JSXfcNvFLDuOfhDWbS4UfcK
TENCENT_SMS_APP_ID=401108684
TENCENT_SMS_APP_KEY=5aba9a5f98f583d01a432ff95287e734
TENCENT_SMS_LOGIN_TEMPLATE_ID=2628480
TENCENT_SMS_SIGN=登录验证码
TENCENT_SMS_REGION=ap-guangzhou

# 管理后台授权
ADMIN_ALLOWED_PHONES=19503511949

# 微信支付
WECHAT_APP_ID=wx5c588dece21c6a42
WECHAT_APP_SECRET=96004c6d0312b74d4fc34a12b4e75a19
WECHAT_MCH_ID=1109422913
WECHAT_PAY_API_KEY=69F6AE1559640FDECCCF0FDBEB3F30F7A32839CC
WECHAT_API_V3_KEY=34A44CB0440B95656589D02AAC51862C0DA49713
WECHAT_SERIAL_NO=34A44CB0440B95656589D02AAC51862C0DA49713
WECHAT_API_KEY=Lianger5819Lianger5819Lianger581
WECHAT_NOTIFY_URL=https://shangyan-nestjs-production.up.railway.app/api/wechat-pay/notify
WECHAT_CERT_PATH=assets/apiclient_cert.pem
WECHAT_KEY_PATH=assets/apiclient_key.pem
WECHAT_PFX_PATH=assets/apiclient_cert.p12

# Coze Supabase 配置（用于 AI 功能）
COZE_SUPABASE_URL=https://qrkwbbphskndxzkfsfep.supabase.co
COZE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFya3diYnBoc2tuZHh6a2ZzZmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyODQ4NDgsImV4cCI6MjA5MDg2MDg0OH0.PZLu_w9Xq56_hu0ICzFtt0TdhCkAC78Uj3ANc3SgNwg

# 阿里巴巴 1688
ALIBABA_APP_KEY=9677840
ALIBABA_APP_SECRET=qDmOKrVQVS
```

## 操作步骤：

1. 打开 Railway 新项目：https://railway.com/project/069397e4-0126-4554-9d48-45f6e426c17f
2. 点击 "New Service" → "GitHub Repo"
3. 选择仓库：`shangyan1122/shangyan-api`
4. 进入新创建的服务 → "Variables" 标签
5. 点击 "Bulk Import" 按钮
6. 复制上面的变量列表并粘贴
7. 点击 "Import" 确认
8. 等待部署完成
