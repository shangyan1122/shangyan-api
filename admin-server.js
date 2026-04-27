const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const WEB_ADMIN_DIR = path.join(__dirname, 'web-admin');
const API_HOST = 'web-production-201e9.up.railway.app';

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function serveStatic(req, res) {
  let filePath = path.join(WEB_ADMIN_DIR, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('404 - File Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

function proxyRequest(req, res) {
  const options = {
    hostname: API_HOST,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: API_HOST },
  };
  
  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  
  proxyReq.on('error', (e) => {
    res.writeHead(502);
    res.end(JSON.stringify({ code: 502, msg: 'API 请求失败' }));
  });
  
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => { proxyReq.write(body); proxyReq.end(); });
  } else {
    proxyReq.end();
  }
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/') || req.url.startsWith('/admin/')) {
    proxyRequest(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`API proxy target: https://${API_HOST}`);
});
