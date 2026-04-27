#!/usr/bin/env node
/**
 * 后台管理页面代理服务器
 * 功能：
 * 1. 提供静态文件服务（web-admin/）
 * 2. 代理 /api 请求到 Railway API
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = 8888;
const WEB_ADMIN_DIR = path.join(__dirname, 'web-admin');
const API_TARGET = 'shangyan-nestjs-production.up.railway.app';

// MIME 类型映射
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// 静态文件服务
function serveStaticFile(req, res) {
  let filePath = path.join(WEB_ADMIN_DIR, req.url === '/' ? 'index.html' : req.url);
  
  // 去除 query string
  filePath = filePath.split('?')[0];
  
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - File Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code, 'utf-8');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
}

// 代理 API 请求到 Railway
function proxyApiRequest(req, res) {
  const apiPath = req.url;
  
  const options = {
    hostname: API_TARGET,
    path: apiPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: API_TARGET,
    },
  };
  
  delete options.headers['host'];
  options.headers['host'] = API_TARGET;
  
  const proxyReq = https.request(options, (proxyRes) => {
    let body = '';
    proxyRes.on('data', (chunk) => {
      body += chunk;
    });
    proxyRes.on('end', () => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      res.end(body);
    });
  });
  
  proxyReq.on('error', (error) => {
    console.error('代理请求失败:', error);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad Gateway', message: error.message }));
  });
  
  // 如果有请求体，转发
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      proxyReq.write(body);
      proxyReq.end();
    });
  } else {
    proxyReq.end();
  }
}

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // 代理 API 请求
  if (req.url.startsWith('/api/')) {
    proxyApiRequest(req, res);
    return;
  }
  
  // 静态文件服务
  serveStaticFile(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🚀 后台管理代理服务器已启动！');
  console.log('');
  console.log('访问地址:');
  console.log(`  本地: http://localhost:${PORT}`);
  console.log('');
  console.log('API 代理:');
  console.log(`  ${API_TARGET}`);
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
