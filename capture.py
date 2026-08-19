import http.server
import json

class handler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(length)
        with open('script-dump.js', 'wb') as f:
            f.write(post_data)
        self.send_response(200)
        self.end_headers()
        print('DUMP WRITTEN!')

if __name__ == '__main__':
    print("Starting server...")
    http.server.HTTPServer(('', 4000), handler).serve_forever()
