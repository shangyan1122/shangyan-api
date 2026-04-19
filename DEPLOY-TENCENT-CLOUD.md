# 尚宴礼记 - 腾讯云部署指南

## 📋 部署信息

| 项目 | 值 |
|------|-----|
| 服务器IP | 175.27.233.51 |
| 域名 | shangrite.cn |
| API地址 | https://api.shangrite.cn |

---

## 🚀 部署步骤

### 第一步：服务器初始化（在本地执行）

```bash
# 1. 将部署脚本上传到服务器
scp /Users/mac/CodeBuddy/Claw/shangyan-api/tencent-deploy.sh root@175.27.233.51:/root/

# 2. SSH 连接到服务器
ssh root@175.27.233.51

# 3. 运行部署脚本
chmod +x /root/tencent-deploy.sh
/root/tencent-deploy.sh
```

### 第二步：配置域名解析

在腾讯云 DNS 解析控制台添加：

```
记录类型    主机记录    记录值              TTL
A          api        175.27.233.51      600
```

### 第三步：部署应用（在服务器执行）

```bash
# 1. 切换到 deploy 用户
su - deploy

# 2. 创建目录并拉取代码
mkdir -p /var/www/shangyan-api
cd /var/www/shangyan-api
git clone https://github.com/shangyan1122/shangyan-api.git .

# 3. 安装依赖
cd server
npm install

# 4. 创建 .env 配置文件
# 复制 .env.production 内容到 .env
nano .env
```

### 第四步：配置 Nginx + SSL

```bash
# 1. 配置 Nginx
sudo cp /var/www/shangyan-api/server/nginx.conf /etc/nginx/sites-available/api.shangrite.cn
sudo ln -sf /etc/nginx/sites-available/api.shangrite.cn /etc/nginx/sites-enabled/
sudo nginx -t

# 2. 申请 SSL 证书
sudo certbot --nginx -d api.shangrite.cn

# 3. 重启 Nginx
sudo systemctl reload nginx
```

### 第五步：启动服务

```bash
# 1. 构建项目
cd /var/www/shangyan-api/server
npm run build

# 2. 创建数据目录
mkdir -p /var/www/shangyan-api/server/data

# 3. 使用 PM2 启动
pm2 start dist/main.js --name shangyan-api

# 4. 配置开机自启
pm2 save
pm2 startup

# 5. 查看状态
pm2 status
pm2 logs shangyan-api
```

### 第六步：验证部署

```bash
# 测试 API 是否正常
curl https://api.shangrite.cn/api/health

# 预期返回
{"status":"ok","timestamp":"..."}
```

---

## 🔧 常用命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs shangyan-api

# 重启服务
pm2 restart shangyan-api

# 更新代码后重新部署
cd /var/www/shangyan-api
git pull
cd server
npm install
npm run build
pm2 restart shangyan-api

# Nginx 相关
sudo nginx -t              # 检查配置
sudo systemctl reload nginx  # 重载配置
sudo systemctl restart nginx # 重启 Nginx

# SSL 证书自动续期 (certbot 自动配置)
sudo certbot renew --dry-run
```

---

## 🐛 故障排查

### 1. 服务启动失败
```bash
pm2 logs shangyan-api --err
# 查看错误日志
```

### 2. 端口被占用
```bash
lsof -i :3000
# 杀死占用进程或修改 .env 中的 PORT
```

### 3. SSL 证书申请失败
```bash
# 检查域名解析
nslookup api.shangrite.cn

# 检查防火墙
sudo ufw status

# 手动申请证书
sudo certbot certonly --webroot -w /var/www/html -d api.shangrite.cn
```

### 4. 数据库连接错误
```bash
# 检查 SQLite 文件
ls -la /var/www/shangyan-api/server/data/

# 重新初始化
rm -f /var/www/shangyan-api/server/data/shangyan.db
```

---

## 📱 微信小程序配置

### 开发阶段
在微信开发者工具中：
1. 点击右上角"详情"
2. 勾选"不校验合法域名、web-view(业务域名)、TLS版本以及HTTPS证书"

### 正式上线（ICP备案完成后）
1. 登录微信公众平台
2. 开发管理 → 开发设置 → 服务器域名
3. 添加 `https://api.shangrite.cn` 为合法域名
4. 小程序代码中配置正确的 API 地址
5. 去掉开发者工具中的"不校验"选项

---

## ⚠️ 重要提醒

1. **立即修改 JWT_SECRET**：部署后请生成新的随机密钥
2. **微信 AppID**：确认使用的是真实的微信小程序 AppID
3. **ICP备案**：域名备案通过后才能在微信配置合法域名
4. **数据备份**：定期备份 `/var/www/shangyan-api/server/data/` 目录

---

## 📞 技术支持

如有问题，请检查：
1. `pm2 logs shangyan-api` - 应用日志
2. `sudo tail -f /var/log/nginx/api.shangrite.cn.access.log` - 访问日志
3. `sudo tail -f /var/log/nginx/api.shangrite.cn.error.log` - 错误日志
