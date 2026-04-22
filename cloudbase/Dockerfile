# 腾讯云 CloudBase 云托管 Dockerfile
FROM node:20-alpine

# 安装必要的系统依赖
RUN apk add --no-cache python3 make g++

WORKDIR /app

# 复制 package 文件
COPY server/package*.json ./
RUN npm ci

# 复制源代码
COPY server/dist ./dist
COPY server/certs ./certs
COPY server/database ./database
COPY web-admin ./web-admin

# CloudBase 云托管默认端口是 80 或 8080
ENV PORT=80
EXPOSE 80

# 运行
CMD ["node", "dist/main"]
