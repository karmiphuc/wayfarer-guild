# Dev static server with caching disabled (browsers otherwise cache ES modules and you test stale code).
#   python3 v2/tools/serve.py 8766 .      (run from the repo root, then open http://localhost:8766/v2/?new)
#   ?new wipes the save and starts a fresh village.
import http.server, sys, functools
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()
    def log_message(self, *a): pass
root = sys.argv[2] if len(sys.argv) > 2 else '.'
http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1])), functools.partial(H, directory=root)).serve_forever()
