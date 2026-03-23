#!/usr/bin/env python3
"""
Simple HTTP server to serve the k-alternatives demo with TSPLIB files
"""

import http.server
import socketserver
import os
import json

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers to allow local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_GET(self):
        # Handle requests for TSPLIB files
        if self.path.startswith('/tsplib/'):
            file_path = self.path[1:]  # Remove leading /
            if os.path.exists(file_path):
                self.send_response(200)
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                with open(file_path, 'r') as f:
                    self.wfile.write(f.read().encode())
                return
            else:
                self.send_error(404, f"File not found: {file_path}")
                return
        
        # Handle default requests
        super().do_GET()

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    print(f"🚀 Starting k-alternatives demo server")
    print(f"📍 Directory: {os.getcwd()}")
    print(f"🌐 Server running at: http://localhost:{PORT}")
    print(f"📊 Open your browser and navigate to: http://localhost:{PORT}/index.html")
    print(f"🔧 Press Ctrl+C to stop the server")
    
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 Server stopped")
            httpd.shutdown()
