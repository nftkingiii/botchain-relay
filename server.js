import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve('dist');
const port = Number(process.env.PORT || 3000);
const revision = process.env.APP_REVISION || process.env.RAILWAY_GIT_COMMIT_SHA || 'local';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://rpc.bohr.life; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
};

createServer(async (req, res) => {
  Object.entries(securityHeaders).forEach(([key, value]) => res.setHeader(key, value));
  const pathname = new URL(req.url || '/', 'http://localhost').pathname;
  if (pathname === '/healthz') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok', revision }));
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' }); res.end(); return;
  }
  const requested = resolve(root, `.${decodeURIComponent(pathname)}`);
  const safePath = requested === root || requested.startsWith(root + sep);
  let file = safePath ? requested : resolve(root, 'index.html');
  try {
    if (!(await stat(file)).isFile()) file = resolve(root, 'index.html');
  } catch { file = resolve(root, 'index.html'); }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'content-length': body.length });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' }); res.end('Application build unavailable. Run npm run build.');
  }
}).listen(port, '0.0.0.0', () => console.log(`Relay listening on 0.0.0.0:${port} (${revision})`));
