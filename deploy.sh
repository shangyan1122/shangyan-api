#!/bin/bash

# ============================================
# 尚宴礼记 - 一键部署脚本
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   尚宴礼记管理后台 - 一键部署脚本    ${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}请使用 root 用户运行此脚本${NC}"
    echo -e "${YELLOW}提示: sudo su${NC}"
    exit 1
fi

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "\n${GREEN}[1/7] 检查 Docker 环境...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker 未安装，正在安装...${NC}"
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
    echo -e "${GREEN}Docker 安装完成${NC}"
else
    echo -e "${GREEN}Docker 已安装: $(docker --version)${NC}"
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Docker Compose 未安装，正在安装...${NC}"
    curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}Docker Compose 安装完成${NC}"
else
    echo -e "${GREEN}Docker Compose 已安装${NC}"
fi

echo -e "\n${GREEN}[2/7] 创建必要目录...${NC}"
mkdir -p ssl
mkdir -p web-admin/dist
mkdir -p server

echo -e "\n${GREEN}[3/7] 备份旧文件（如有）...${NC}"
[ -f .env ] && cp .env .env.backup.$(date +%Y%m%d%H%M%S)
[ -d web-admin/dist ] && [ "$(ls -A web-admin/dist)" ] && mv web-admin/dist web-admin/dist.backup.$(date +%Y%m%d%H%M%S)

echo -e "\n${GREEN}[4/7] 创建环境变量文件...${NC}"
if [ ! -f .env ]; then
    cat > .env << 'EOF'
# Supabase 配置
SUPABASE_URL=https://your-supabase-url.supabase.co
SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=postgresql://postgres:your-password@host:5432/postgres

# JWT 密钥（请修改为随机字符串）
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# 微信支付配置
WECHAT_APPID=your-wechat-appid
WECHAT_SECRET=your-wechat-secret
WECHAT_MCHID=your-merchant-id
WECHAT_APIKEY=your-api-key

# Sentry 错误监控（可选）
SENTRY_DSN=

# TOS 对象存储配置
TOS_ENDPOINT=your-endpoint
TOS_REGION=your-region
TOS_ACCESS_KEY=your-access-key
TOS_SECRET_KEY=your-secret-key
TOS_BUCKET=your-bucket
EOF
    echo -e "${YELLOW}请编辑 .env 文件，填入你的配置信息${NC}"
    echo -e "${YELLOW}然后重新运行此脚本: ./deploy.sh${NC}"
    exit 0
fi

echo -e "\n${GREEN}[5/7] 构建并启动容器...${NC}"
docker-compose down 2>/dev/null || true
docker-compose up -d --build

echo -e "\n${GREEN}[6/7] 等待服务启动...${NC}"
sleep 10

# 检查容器状态
if docker ps | grep -q shangyan-server; then
    echo -e "${GREEN}后端服务启动成功${NC}"
else
    echo -e "${RED}后端服务启动失败，查看日志:${NC}"
    docker-compose logs server
    exit 1
fi

echo -e "\n${GREEN}[7/7] 申请 SSL 证书...${NC}"
echo -e "${YELLOW}正在使用 Let's Encrypt 申请 SSL 证书...${NC}"

# 临时启动 Nginx 用于验证
docker run -d --name nginx-temp -p 80:80 -p 443:443 \
    -v "$PWD/nginx.conf":/etc/nginx/conf.d/default.conf:ro \
    -v "$PWD/ssl":/etc/nginx/ssl:ro \
    nginx:alpine

# 安装 certbot
apt-get update -qq
apt-get install -y -qq certbot python3-certbot-nginx

# 申请证书（同时支持两个域名）
certbot --nginx -d admin.shangrite.cn -d api.shangrite.cn --non-interactive --agree-tos -m admin@shangrite.cn || {
    echo -e "${YELLOW}证书申请失败，请手动申请或检查域名解析${NC}"
    echo -e "${YELLOW}申请命令: certbot --nginx -d admin.shangrite.cn${NC}"
}

# 停止临时容器
docker stop nginx-temp 2>/dev/null || true
docker rm nginx-temp 2>/dev/null || true

# 重新启动正式服务
docker-compose restart

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}   部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n${GREEN}访问地址:${NC}"
echo -e "  管理后台: https://admin.shangrite.cn/admin/"
echo -e "  API接口:  https://api.shangrite.cn/api/"
echo -e "\n${GREEN}常用命令:${NC}"
echo -e "  查看日志: docker-compose logs -f"
echo -e "  重启服务: docker-compose restart"
echo -e "  停止服务: docker-compose stop"
echo -e "  更新部署: ./deploy.sh"
echo -e "\n${YELLOW}请记得编辑 .env 文件配置你的 Supabase 和微信支付信息${NC}"
echo -e "${GREEN}========================================${NC}"
