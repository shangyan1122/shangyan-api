#!/bin/bash

# ============================================
# 尚宴礼记 - 腾讯云服务器一键部署脚本
# 服务器: Ubuntu 22.04
# IP: 175.27.233.51
# 域名: shangrite.cn
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   尚宴礼记 API - 腾讯云部署脚本     ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}请使用 root 用户运行此脚本${NC}"
    echo -e "${YELLOW}提示: sudo su${NC}"
    exit 1
fi

echo -e "${GREEN}[1/8] 更新系统软件包...${NC}"
apt update && apt upgrade -y

echo -e "\n${GREEN}[2/8] 安装基础软件...${NC}"
apt install -y curl wget git nginx certbot python3-certbot-nginx ufw

echo -e "\n${GREEN}[3/8] 安装 Node.js 18...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
node -v
npm -v

echo -e "\n${GREEN}[4/8] 安装 PM2 进程管理器...${NC}"
npm install -g pm2
pm2 install pm2-logrotate

echo -e "\n${GREEN}[5/8] 创建部署用户...${NC}"
if ! id -u deploy &>/dev/null; then
    useradd -m -s /bin/bash deploy
    echo "deploy:Shangyan2024!" | chpasswd
    usermod -aG sudo deploy
    echo "deploy ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers
fi

echo -e "\n${GREEN}[6/8] 配置防火墙...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo -e "\n${GREEN}[7/8] 创建应用目录...${NC}"
mkdir -p /var/www/shangyan-api
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled

echo -e "\n${GREEN}[8/8] 配置完成！${NC}"
echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}   下一步操作（需要手动执行）${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo "1. 切换到 deploy 用户:"
echo "   su - deploy"
echo ""
echo "2. 拉取代码:"
echo "   git clone https://github.com/shangyan1122/shangyan-api.git /var/www/shangyan-api"
echo ""
echo "3. 进入目录并安装依赖:"
echo "   cd /var/www/shangyan-api/server"
echo "   npm install"
echo ""
echo "4. 创建 .env 文件:"
echo "   nano /var/www/shangyan-api/server/.env"
echo "   (复制下面提供的配置内容)"
echo ""
echo "5. 构建并启动:"
echo "   npm run build"
echo "   pm2 start dist/main.js --name shangyan-api"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "6. 配置 Nginx:"
echo "   sudo nano /etc/nginx/sites-available/api.shangrite.cn"
echo "   (复制下面提供的 Nginx 配置)"
echo ""
echo "7. 申请 SSL 证书:"
echo "   sudo certbot --nginx -d api.shangrite.cn"
echo ""
echo -e "${GREEN}========================================${NC}"
