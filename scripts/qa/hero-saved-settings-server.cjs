// Serve ignored saved-rep fixtures only on loopback. No account writes or
// externally reachable fixture endpoint are required for this regression.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = process.cwd(), publicRoot = path.join(root, 'public');
http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1:3005').pathname;
  const match = pathname.match(/^\/skin-preview\/([a-z_]+)\/homepage$/);
  if (match) {
    const file = path.join(root, '.local/saved-settings', match[1] + '.html');
    if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
    const document = fs.readFileSync(file, 'utf8').replaceAll('&', '&amp;').replaceAll('"', '&quot;');
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(`<html><head><meta charset="utf-8"></head><body style="margin:0"><iframe style="width:100%;height:100vh;border:0" sandbox="allow-scripts" allow="autoplay" srcdoc="${document}"></iframe></body></html>`);
    return;
  }
  const file = path.resolve(publicRoot, '.' + pathname);
  if (!file.startsWith(publicRoot + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
  const types = { '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
  res.setHeader('content-type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(3005, '127.0.0.1', () => console.log('Saved-settings fixtures: http://127.0.0.1:3005 (loopback only)'));
