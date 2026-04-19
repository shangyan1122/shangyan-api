const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8888;
const WEB_ADMIN_DIR = path.join(__dirname, 'web-admin');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let filePath = path.join(WEB_ADMIN_DIR, req.url === '/' ? 'index.html' : req.url);
  
  // SPA fallback
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(WEB_ADMIN_DIR, 'index.html');
  }
  
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`\n🎉 尚宴礼记管理后台已启动!`);
  console.log(`📂 访问地址: http://localhost:${PORT}/`);
  console.log(`\n按 Ctrl+C 停止服务\n`);
});
