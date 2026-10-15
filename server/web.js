import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { requestId } from './http.js';

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };
export function createWebsiteServer({ app, production = false, vite = null, directory = resolve('dist') }) {
  const dist = resolve(directory);
  const server = createServer(async (req, res) => {
    const id = requestId(res);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cache-Control', 'no-store');
    if (production) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
    }
    try {
      if (await app.handle(req, res)) return;
      if (vite) { vite.middlewares(req, res); return; }
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end('Method not allowed'); return; }
      let path;
      try { path = decodeURIComponent(new URL(req.url, 'http://internal').pathname); }
      catch { res.writeHead(400); res.end('Invalid URL'); return; }
      if (path.includes('\0')) { res.writeHead(400); res.end('Invalid URL'); return; }
      let asset = resolve(dist, '.' + path);
      if (asset !== dist && !asset.startsWith(dist + '/')) { res.writeHead(403); res.end('Forbidden'); return; }
      let metadata;
      try { metadata = await stat(asset); }
      catch (error) { if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error; }
      if (!metadata?.isFile()) {
        if (extname(path)) { res.writeHead(404); res.end('Not found'); return; }
        asset = resolve(dist, 'index.html'); metadata = await stat(asset);
      }
      const etag = `W/"${metadata.size}-${metadata.mtimeMs}"`;
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', asset.startsWith(dist + '/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
      res.setHeader('Content-Type', types[extname(asset)] || 'application/octet-stream');
      if (req.headers['if-none-match']?.split(',').map(value => value.trim()).includes(etag)) { res.writeHead(304); res.end(); return; }
      res.setHeader('Content-Length', metadata.size);
      if (req.method === 'HEAD') { res.writeHead(200); res.end(); return; }
      await pipeline(createReadStream(asset), res);
    } catch (error) {
      if (res.destroyed || req.aborted) return;
      console.error(JSON.stringify({ event: 'http_error', requestId: id, method: req.method, status: 500 }));
      if (res.headersSent) { res.destroy(); return; }
      res.removeHeader('Content-Length'); res.removeHeader('ETag'); res.setHeader('Cache-Control', 'no-store');
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Website unavailable. Please try again shortly.');
    }
  });
  server.headersTimeout = 15000;
  server.requestTimeout = 30000;
  server.keepAliveTimeout = 5000;
  server.maxRequestsPerSocket = 1000;
  return server;
}
