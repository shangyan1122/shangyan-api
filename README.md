# 尚宴礼记管理后台 - 部署指南

## 文件说明

```
deploy/
├── docker-compose.yml    # Docker 容器编排文件
├── nginx.conf           # Nginx 反向代理配置
├── deploy.sh            # 一键部署脚本
├── .env.example          # 环境变量模板
└── README.md             # 本文件
```

## 部署步骤

### 第一步：上传文件到服务器

将 `deploy` 文件夹上传到服务器 `/root/shangyan/` 目录

```bash
# 在本地电脑执行（需要有 scp 命令或使用 SFTP 工具）
scp -r ./deploy root@175.27.233.51:/root/shangyan/
```

### 第二步：SSH 登录服务器

```bash
ssh root@175.27.233.51
# 密码: Lianger5819...
```

### 第三步：进入部署目录

```bash
cd /root/shangyan/deploy
chmod +x deploy.sh
```

### 第四步：配置环境变量

```bash
cp .env.example .env
nano .env  # 编辑配置文件
```

### 第五步：执行部署

```bash
./deploy.sh
```

### 第六步：验证部署

```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 测试访问
curl https://admin.shangrite.cn/admin/
```

## 访问地址

- 管理后台: https://admin.shangrite.cn/admin/
- API接口: https://api.shangrite.cn/api/

## 后续维护

```bash
# 进入部署目录
cd /root/shangyan/deploy

# 查看日志
docker-compose logs -f server

# 重启服务
docker-compose restart

# 更新代码后重新部署
./deploy.sh
```

## 常见问题

### 1. 域名解析未生效
```bash
# 检查 DNS 解析
nslookup admin.shangrite.cn
```
需要等待 DNS 生效（通常 10 分钟内）

### 2. SSL 证书申请失败
```bash
# 手动申请证书
certbot --nginx -d admin.shangrite.cn
```

### 3. 容器启动失败
```bash
# 查看详细日志
docker-compose logs
```
# Build Sun Apr 19 15:11:10 CST 2026
