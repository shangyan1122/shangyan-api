FROM node:20-alpine

WORKDIR /app

# 复制 package 文件
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install --legacy-peer-deps

# 复制源代码
COPY server/ ./

# 构建
RUN npm run build

# 运行
WORKDIR /app
CMD ["node", "server/dist/main"]