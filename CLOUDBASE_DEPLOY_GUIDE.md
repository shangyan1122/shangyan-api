# 腾讯云 CloudBase 云托管部署指南

## 📦 部署包信息

- **文件名**: `cloudbase-deploy.zip`
- **大小**: 1.8MB
- **位置**: `/Users/mac/CodeBuddy/Claw/shangyan-api/cloudbase-deploy.zip`

## 🚀 部署步骤

### 1. 登录腾讯云控制台
打开 https://console.cloud.tencent.com/tcb/env/shangyanliji-d3gqga5yk22ed0cd4/cloudrun

### 2. 新建服务
点击「新建服务」按钮

### 3. 选择部署方式
- 选择「本地代码」
- 上传 `cloudbase-deploy.zip` 文件

### 4. 配置服务
| 配置项 | 值 |
|-------|-----|
| 服务名称 | `shangyan-api` |
| Dockerfile 路径 | `cloudbase/Dockerfile` |
| 容器端口 | `80` |
| 最小实例数 | `0` |
| 最大实例数 | `10` |
| CPU | `0.25` 核 |
| 内存 | `0.5` GB |
| 扩缩容策略 | CPU 使用率 > 60% |

### 5. 环境变量（可选）
如需配置环境变量，添加以下变量：
```
NODE_ENV=production
PORT=80
```

### 6. 开始部署
点击「开始部署」按钮，等待部署完成

## 🔍 部署后验证

### 查看服务状态
部署完成后，在控制台查看：
- 服务运行状态
- 公网访问地址
- 日志输出

### 测试 API
```bash
# 健康检查
curl https://<你的服务域名>/api/health

# 登录测试
curl -X POST https://<你的服务域名>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"code":"test"}'
```

## 📝 更新小程序配置

部署成功后，获取 CloudBase 分配的公网域名，然后：

1. 修改 `.env.local` 文件：
```
PROJECT_DOMAIN=https://<你的服务域名>
```

2. 重新构建小程序：
```bash
cd /Users/mac/CodeBuddy/Claw/shangyan-miniprogram
pnpm build:weapp
```

3. 在微信小程序后台配置服务器域名

## 🔧 故障排查

### 服务启动失败
- 查看控制台日志
- 检查 Dockerfile 配置
- 确认端口映射正确（容器内 80 端口）

### API 访问 404
- 检查健康检查端点 `/api/health`
- 确认后端路由配置正确

### 后台管理页面 404
- 确认 `web-admin` 目录已正确打包
- 检查 `main.ts` 中静态文件服务配置

## 📚 相关文件

- `cloudbase/Dockerfile` - Docker 镜像配置
- `cloudbase/container.config.json` - 容器配置
- `server/src/main.ts` - 已适配 CloudBase 端口配置

## 💡 注意事项

1. **免费额度**：CloudBase 体验版有免费资源额度
2. **冷启动**：最小实例数为 0 时，首次访问会有冷启动延迟
3. **自动扩缩容**：根据 CPU 使用率自动扩容（最大 10 实例）
4. **无需备案**：小程序内调用 CloudBase 服务无需 ICP 备案

## 🆘 需要帮助？

- 腾讯云文档：https://docs.cloudbase.net/
- 云托管文档：https://docs.cloudbase.net/run/
