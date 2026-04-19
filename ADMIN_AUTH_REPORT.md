# 管理后台登录功能检查报告

## 📅 日期：2026年4月17日

---

## ✅ 检查结果汇总

| 功能 | 状态 | 说明 |
|------|------|------|
| 手机号+验证码登录 | ✅ 已实现 | 前端+后端完整 |
| 腾讯云短信服务 | ✅ 已对接 | 可配置真实短信 |
| 授权手机号验证 | ✅ 已实现 | 白名单机制 |
| 验证码安全机制 | ✅ 已实现 | 5分钟过期、5次尝试限制 |
| 数据库表结构 | ✅ 已更新 | 添加状态、登录时间等字段 |

---

## 📦 新增/修改的文件

### 后端 (shangyan-api/server)

| 文件 | 说明 |
|------|------|
| `src/common/services/tencent-sms.service.ts` | **新增** 腾讯云短信服务 |
| `src/common/common.module.ts` | 更新，添加短信服务 |
| `src/modules/admin-auth/admin-auth.service.ts` | **重构** 添加授权验证+短信对接 |
| `src/modules/admin-auth/admin-auth.module.ts` | 更新模块依赖 |

### 配置文件

| 文件 | 说明 |
|------|------|
| `.env` | 更新，添加短信和授权配置 |
| `.env.sms.example` | **新增** 短信配置示例 |

### 数据库

| 文件 | 说明 |
|------|------|
| `database/migrations/001_admin_phone_authorized.sql` | **新增** 管理员表结构更新 |

---

## 🔧 腾讯云短信配置

### 1. 获取配置信息

1. 访问 [腾讯云短信控制台](https://console.cloud.tencent.com/smsv2)
2. 创建应用 → 获取 `App ID` 和 `App Key`
3. 创建模板 → 获取 `Template ID`
4. 申请签名 → 获取 `Sign`

### 2. 配置模板

短信模板内容：
```
【尚宴礼记】您的登录验证码是 ${1}，5分钟内有效。如非本人操作，请忽略。
```

### 3. 环境变量配置

在 `.env` 文件中填入：
```bash
# 腾讯云密钥（从访问管理 -> API密钥管理 获取）
TENCENT_CLOUD_SECRET_ID=your-secret-id
TENCENT_CLOUD_SECRET_KEY=your-secret-key

# 短信应用
TENCENT_SMS_APP_ID=1400xxxxxx
TENCENT_SMS_APP_KEY=your-app-key
TENCENT_SMS_LOGIN_TEMPLATE_ID=1234567
TENCENT_SMS_SIGN=尚宴礼记
```

---

## 🔐 授权手机号配置

### 配置方式

在 `.env` 文件中配置：
```bash
# 多个号码用逗号分隔
ADMIN_ALLOWED_PHONES=13800138000,13900139000,13700000001
```

### 安全特性

| 特性 | 说明 |
|------|------|
| 白名单验证 | 登录前验证手机号是否在授权列表 |
| 验证码过期 | 5分钟后自动失效 |
| 尝试次数限制 | 验证码错误5次后失效 |
| 发送频率限制 | 同一手机号60秒内不能重复发送 |
| 模拟模式 | 未配置短信时自动使用模拟发送（开发模式） |

---

## 🗄️ 数据库表结构

### admins 表

```sql
CREATE TABLE admins (
    id UUID PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'admin',
    status VARCHAR(20) DEFAULT 'active',
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 运行迁移

```bash
cd shangyan-api/database/migrations
psql $DATABASE_URL -f 001_admin_phone_authorized.sql
```

---

## 🚀 部署检查清单

### Railway 部署环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `JWT_SECRET` | JWT密钥 | `your-secret-key` |
| `ADMIN_ALLOWED_PHONES` | 授权手机号 | `13800138000,13900139000` |
| `TENCENT_CLOUD_SECRET_ID` | 腾讯云 SecretId | `AKIDxxxxxxxx` |
| `TENCENT_CLOUD_SECRET_KEY` | 腾讯云 SecretKey | `xxxxxxxx` |
| `TENCENT_SMS_APP_ID` | 短信 App ID | `1400xxxxxx` |
| `TENCENT_SMS_APP_KEY` | 短信 App Key | `xxxxxxxx` |
| `TENCENT_SMS_LOGIN_TEMPLATE_ID` | 登录模板 ID | `1234567` |
| `TENCENT_SMS_SIGN` | 短信签名 | `尚宴礼记` |
| `SUPABASE_URL` | Supabase 地址 | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务密钥 | `eyJxxx` |

---

## 📱 前端登录流程

```
1. 用户输入手机号
   ↓
2. 点击"获取验证码"
   ↓
3. 后端验证手机号是否授权
   ↓
4. 发送短信验证码（腾讯云）
   ↓
5. 用户输入6位验证码
   ↓
6. 后端验证：
   - 验证码是否正确
   - 是否过期
   - 尝试次数是否超限
   ↓
7. 验证通过 → 生成JWT Token
   ↓
8. 前端保存Token，跳转到首页
```

---

## 🔒 安全建议

1. **生产环境务必配置授权手机号**
   - 不要在生产环境使用空的白名单（允许所有手机号）

2. **短信验证码安全**
   - 验证码长度：6位数字
   - 有效期：5分钟
   - 尝试次数：最多5次
   - 发送间隔：60秒

3. **日志监控**
   - 记录所有登录尝试
   - 监控异常登录行为

4. **定期轮换**
   - 定期更换 JWT 密钥
   - 定期检查授权手机号列表

---

## 🧪 测试建议

### 本地测试

1. 配置 `.env` 中的短信参数（或使用模拟模式）
2. 启动后端服务
3. 访问管理后台登录页
4. 测试完整登录流程

### 生产部署前检查

- [ ] 腾讯云短信配置完整
- [ ] 授权手机号列表已配置
- [ ] 数据库迁移已执行
- [ ] JWT 密钥已更换为强密码
- [ ] Supabase 密钥已配置
