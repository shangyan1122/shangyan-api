# 尚宴礼记 API Dockerfile
FROM node:20-alpine

WORKDIR /app

# 安装 pnpm 和构建依赖
RUN npm install -g pnpm && apk add --no-cache python3 make g++

# 复制 package 文件和 lockfile 并安装所有依赖
COPY server/package*.json ./
COPY server/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 复制源代码并构建
COPY server/tsconfig*.json ./
COPY server/nest-cli.json ./
COPY server/src ./src
RUN npm run build

# 移除开发依赖（使用 pnpm）
RUN pnpm install --prod --frozen-lockfile

# 复制微信支付证书（如不存在则构建继续）
# 注意：COPY 不支持 shell 重定向，需确保文件存在或使用 .dockerignore
COPY server/certs ./certs

# 复制数据库初始化脚本
COPY server/database ./database

# 复制后台管理页面
COPY web-admin ./web-admin

# 暴露端口（与应用监听端口一致）
EXPOSE 3000

# 设置环境变量
ENV PORT=3000
ENV NODE_ENV=production

# 运行
CMD ["node", "dist/main"]
