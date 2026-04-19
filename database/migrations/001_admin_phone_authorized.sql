-- ===========================================
-- 管理员表结构更新
-- 添加状态、登录时间等字段
-- ===========================================

-- 确保 admins 表存在
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'admin',
    status VARCHAR(20) DEFAULT 'active',
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_admins_phone ON admins(phone);
CREATE INDEX IF NOT EXISTS idx_admins_status ON admins(status);

-- 添加备注说明
COMMENT ON TABLE admins IS '管理员表';
COMMENT ON COLUMN admins.phone IS '手机号（登录账号）';
COMMENT ON COLUMN admins.name IS '管理员名称';
COMMENT ON COLUMN admins.role IS '角色: admin(普通管理员), super_admin(超级管理员)';
COMMENT ON COLUMN admins.status IS '状态: active(正常), disabled(禁用)';
COMMENT ON COLUMN admins.last_login_at IS '最后登录时间';

-- ===========================================
-- 管理员操作日志表
-- ===========================================

CREATE TABLE IF NOT EXISTS admin_operation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admins(id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_operation_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_operation_logs(created_at DESC);

COMMENT ON TABLE admin_operation_logs IS '管理员操作日志';
