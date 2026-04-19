# 数据库迁移说明

## 运行迁移

```bash
# 使用 psql 直接执行
psql $DATABASE_URL -f 001_admin_phone_authorized.sql

# 或在 Supabase 控制台中执行 SQL
```

## 更新内容

### admins 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| phone | VARCHAR(20) | 手机号（唯一） |
| name | VARCHAR(100) | 管理员名称 |
| role | VARCHAR(50) | 角色：admin/super_admin |
| status | VARCHAR(20) | 状态：active/disabled |
| last_login_at | TIMESTAMP | 最后登录时间 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### admin_operation_logs 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| admin_id | UUID | 管理员ID |
| action | VARCHAR(100) | 操作类型 |
| target_type | VARCHAR(50) | 操作对象类型 |
| target_id | VARCHAR(100) | 操作对象ID |
| details | JSONB | 详细信息 |
| ip_address | VARCHAR(50) | IP地址 |
| user_agent | TEXT | 用户代理 |
| created_at | TIMESTAMP | 操作时间 |
