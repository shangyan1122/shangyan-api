#!/usr/bin/env node
/**
 * 反向代理服务器
 * - 静态文件: web-admin/
 * - API 代理: /admin/* → Railway
 * - API 代理: /api/* → Railway
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const httpProxy = require('http-proxy');

const PORT = 8080;
const WEB_ADMIN_DIR = path.join(__dirname, 'web-admin');
const TARGET_URL = 'https://web-production-201e9.up.railway.app';

// 创建代理实例
const proxy = httpProxy.createProxyServer({});

// 错误处理
proxy.on('error', (err, req, res) => {
  console.error('代理错误:', err.message);
  res.writeHead(502, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ code: 502, msg: 'API 请求失败', error: err.message }));
});

// MIME 类型
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// 静态文件服务
function serveStatic(req, res) {
  let filePath = path.join(WEB_ADMIN_DIR, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - File Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + err.code, 'utf-8');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
}

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} [${req.method}] ${req.url}`);
  
  // API 请求 → 代理到 Railway
  if (req.url.startsWith('/api/') || req.url.startsWith('/admin/')) {
    proxy.web(req, res, { target: TARGET_URL, changeOrigin: true });
    return;
  }
  
  // 静态文件
  serveStatic(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🚀 反向代理服务器已启动！');
  console.log('');
  console.log('访问地址:');
  console.log(`  http://localhost:${PORT}`);
  console.log('');
  console.log('API 代理:');
  console.log(`  目标: ${TARGET_URL}`);
  console.log('');
  console.log('按 Ctrl+C 停止服务器');
  console.log('');
});

process.on('SIGINT', () => {
  console.log('\n正在停止服务器...');
  server.close(() => {
    console.log('服务器已停止');
    process.exit(0);
  });
});
