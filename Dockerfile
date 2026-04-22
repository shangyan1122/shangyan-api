FROM node:20-alpine

WORKDIR /app

# 安装构建依赖（Alpine 需要 python3/make/g++ 编译 native 模块）
RUN apk add --no-cache python3 make g++

# 复制 package 文件并安装所有依赖
COPY server/package*.json ./
RUN npm ci

# 复制源代码并构建
COPY server/tsconfig*.json ./
COPY server/nest-cli.json ./
COPY server/src ./src
RUN npm run build

# 移除开发依赖
RUN npm prune --omit=dev

# 复制微信支付证书
COPY server/certs ./certs

# 复制数据库初始化脚本
COPY server/database ./database

# 复制后台管理页面
COPY web-admin ./web-admin

# 暴露端口
EXPOSE 80

# 运行（强制监听80端口，兼容云托管健康检查）
ENV PORT=80
CMD ["node", "dist/main"]
