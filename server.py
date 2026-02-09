import http.server
import socketserver
from pathlib import Path

class UTF8Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # UTF-8エンコーディングを明示的に設定
        if self.path.endswith('.html'):
            self.send_header('Content-Type', 'text/html; charset=utf-8')
        elif self.path.endswith('.js'):
            self.send_header('Content-Type', 'application/javascript; charset=utf-8')
        elif self.path.endswith('.json'):
            self.send_header('Content-Type', 'application/json; charset=utf-8')
        elif self.path.endswith('.css'):
            self.send_header('Content-Type', 'text/css; charset=utf-8')
        super().end_headers()

PORT = 8080

print(f"Server running at http://localhost:{PORT}/")
print("Press Ctrl+C to stop")

with socketserver.TCPServer(("", PORT), UTF8Handler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")
