FROM node:20-alpine

# 安装必要的系统依赖
RUN apk add --no-cache python3 make g++

WORKDIR /app

# 复制 package 文件
COPY server/package*.json ./
RUN npm ci --only=production

# 复制源代码
COPY server/dist ./dist
COPY server/assets ./assets
COPY server/certs ./certs
COPY server/database ./database

# 暴露端口
EXPOSE 3000

# 运行
CMD ["node", "dist/main"]
