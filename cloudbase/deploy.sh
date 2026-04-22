#!/bin/bash
# 腾讯云 CloudBase 云托管部署脚本

set -e

echo "🚀 开始部署到腾讯云 CloudBase 云托管..."

# 1. 登录腾讯云（会打开浏览器扫码）
echo "📱 请登录腾讯云..."
tcb login

# 2. 创建环境（如果不存在）
ENV_ID="shangyan-prod"
echo "🔧 检查环境 $ENV_ID..."
tcb env:list || tcb env:create -n $ENV_ID

# 3. 部署云托管服务
echo "📦 部署云托管服务..."
tcb service:create --name shangyan-api --envId $ENV_ID || true

# 4. 构建并推送镜像
echo "🐳 构建 Docker 镜像..."
cd /Users/mac/CodeBuddy/Claw/shangyan-api

# 使用 CloudBase 容器镜像服务
tcb container:deploy \
  --serviceName shangyan-api \
  --envId $ENV_ID \
  --dockerfile ./cloudbase/Dockerfile \
  --containerPort 80 \
  --minNum 0 \
  --maxNum 10 \
  --cpu 0.25 \
  --mem 0.5 \
  --policyType cpu \
  --policyThreshold 60

echo "✅ 部署完成！"
echo ""
echo "📋 后续步骤："
echo "1. 登录腾讯云控制台查看服务状态"
echo "2. 在小程序代码中更新 API 地址"
echo "3. 测试接口是否正常"
