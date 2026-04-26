# 尚宴礼记 API Dockerfile
FROM node:20-alpine

WORKDIR /app

# 安装构建依赖（Alpine 需要 python3/make/g++ 编译 native 模块）
RUN apk add --no-cache python3 make g++

# 复制 package 文件并安装所有依赖
COPY package*.json ./
RUN npm ci

# 复制源代码并构建
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY src ./src
RUN npm run build

# 移除开发依赖
RUN npm prune --omit=dev

# 复制微信支付证书（如果存在）
COPY certs ./certs 2>/dev/null || true

# 复制数据库初始化脚本（如果存在）
COPY database ./database 2>/dev/null || true

# 复制后台管理页面（如果存在）
COPY web-admin ./web-admin 2>/dev/null || true

# 暴露端口（与应用监听端口一致）
EXPOSE 3000

# 设置环境变量
ENV PORT=3000
ENV NODE_ENV=production

# 运行
CMD ["node", "dist/main"]
