#!/usr/bin/env python3
"""
反向代理服务器
- 静态文件服务: web-admin/
- API 代理: /admin/* 和 /api/* → Railway
"""

import http.server
import http.client
import socketserver
import urllib.parse
from pathlib import Path
import mimetypes

PORT = 8080
WEB_ADMIN_DIR = Path(__file__).parent / 'web-admin'
TARGET_HOST = 'web-production-201e9.up.railway.app'
TARGET_PORT = 443  # HTTPS

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # API 请求 → 代理到 Railway
        if self.path.startswith('/api/') or self.path.startswith('/admin/'):
            self.proxy_request('GET')
            return
        
        # 静态文件
        super().do_GET()
    
    def do_POST(self):
        if self.path.startswith('/api/') or self.path.startswith('/admin/'):
            self.proxy_request('POST')
            return
        
        self.send_error(404)
    
    def do_PUT(self):
        if self.path.startswith('/api/') or self.path.startswith('/admin/'):
            self.proxy_request('PUT')
            return
        
        self.send_error(404)
    
    def do_DELETE(self):
        if self.path.startswith('/api/') or self.path.startswith('/admin/'):
            self.proxy_request('DELETE')
            return
        
        self.send_error(404)
    
    def proxy_request(self, method):
        """代理请求到 Railway"""
        try:
            # 创建 HTTPS 连接
            conn = http.client.HTTPSConnection(TARGET_HOST, TARGET_PORT)
            
            # 读取请求体
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length > 0 else None
            
            # 发送请求
            conn.request(method, self.path, body=body, headers=dict(self.headers))
            
            # 获取响应
            res = conn.getresponse()
            
            # 发送响应头
            self.send_response(res.status)
            for key, value in res.getheaders():
                if key.lower() not in ('transfer-encoding', 'connection'):
                    self.send_header(key, value)
            self.end_headers()
            
            # 发送响应体
            self.wfile.write(res.read())
            conn.close()
            
        except Exception as e:
            print(f'代理错误: {e}')
            self.send_error(502, f'代理请求失败: {e}')
    
    def translate_path(self, path):
        """重写路径转换，指向 web-admin/ 目录"""
        path = path.split('?', 1)[0]
        path = path.split('#', 1)[0]
        path = path.strip('/')
        
        if not path:
            path = 'index.html'
        
        return str(WEB_ADMIN_DIR / path)
    
    def log_message(self, format, *args):
        """自定义日志格式"""
        print(f'{self.log_date_time_string()} [{method}] {self.path}')

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    """支持多线程的 HTTP 服务器"""
    daemon_threads = True

if __name__ == '__main__':
    with ThreadedHTTPServer(('', PORT), ProxyHandler) as httpd:
        print(f'''
🚀 反向代理服务器已启动！

访问地址:
  http://localhost:{PORT}

API 代理:
  目标: https://{TARGET_HOST}

按 Ctrl+C 停止
''')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\n正在停止服务器...')
            httpd.shutdown()
            print('服务器已停止')
