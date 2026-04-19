FROM node:20-slim

WORKDIR /app

# 复制 package 文件并安装生产依赖（bcrypt 6.x 有预编译二进制，无需编译工具）
COPY server/package*.json ./
RUN npm ci --omit=dev

# 复制源代码和静态资源
COPY server/dist ./dist
COPY server/assets ./assets
COPY server/certs ./certs
COPY server/database ./database
COPY web-admin ./web-admin

# 暴露端口
EXPOSE 3000

# 运行
CMD ["node", "dist/main"]
