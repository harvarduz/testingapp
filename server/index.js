import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { createApp } from './app.js';
import { publicUrlFromEnvironment } from './config.js';

const development = process.argv.includes('--dev');
const production = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || (development ? 5173 : process.argv.includes('--preview') ? 4173 : 3000));
const databasePath = process.env.CURIO_DATA_DIR ? resolve(process.env.CURIO_DATA_DIR, 'curio.sqlite') : resolve('.data/curio.sqlite');
const publicUrl = publicUrlFromEnvironment(process.env);
const app = createApp({ databasePath, publicUrl, production });
if (production && !publicUrl) console.warn('No public domain configured. Serving the website and health checks with API writes disabled. Generate a Railway public domain or set PUBLIC_URL, then redeploy.');
const vite = development ? await (await import('vite')).createServer({ server: { middlewareMode: true }, appType: 'spa' }) : null;
const dist = resolve('dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (production) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  }
  if (await app.handle(req, res)) return;
  if (vite) { vite.middlewares(req, res); return; }
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://internal').pathname);
    const filename = resolve(dist, '.' + path);
    if (filename !== dist && !filename.startsWith(dist + '/')) { res.writeHead(403); res.end('Forbidden'); return; }
    let asset = filename;
    try { if (!(await stat(asset)).isFile()) asset = resolve(dist, 'index.html'); }
    catch { if (extname(path)) { res.writeHead(404); res.end('Not found'); return; } asset = resolve(dist, 'index.html'); }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end('Method not allowed'); return; }
    const content = await readFile(asset);
    res.writeHead(200, { 'Content-Type': types[extname(asset)] || 'application/octet-stream', 'Cache-Control': asset.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch { res.writeHead(500); res.end('Website unavailable. Run npm run build first.'); }
});
server.listen(port, '0.0.0.0', () => console.log(`Curio ${development ? 'development' : 'application'} listening on port ${port}`));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
  server.close(async () => { await vite?.close(); app.close(); process.exit(0); });
});
