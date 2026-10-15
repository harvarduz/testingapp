import { resolve } from 'node:path';
import { createApp } from './app.js';
import { publicUrlFromEnvironment } from './config.js';
import { createWebsiteServer } from './web.js';

const development = process.argv.includes('--dev');
const production = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || (development ? 5173 : process.argv.includes('--preview') ? 4173 : 3000));
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a number from 1 to 65535.');
const databasePath = process.env.CURIO_DATA_DIR ? resolve(process.env.CURIO_DATA_DIR, 'curio.sqlite') : resolve('.data/curio.sqlite');
const publicUrl = publicUrlFromEnvironment(process.env);
const app = createApp({ databasePath, publicUrl, production });
if (production && !publicUrl) console.warn('No public domain configured. Serving the website and health checks with API writes disabled. Generate a Railway public domain or set PUBLIC_URL, then redeploy.');
const vite = development ? await (await import('vite')).createServer({ server: { middlewareMode: true }, appType: 'spa' }) : null;
const server = createWebsiteServer({ app, vite, production });
server.listen(port, '0.0.0.0', () => console.log(`Curio ${development ? 'development' : 'application'} listening on port ${port}`));
let stopping = false;
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
  if (stopping) return;
  stopping = true;
  // Drain accepted requests before closing SQLite. Bound the drain so a slow
  // connection cannot keep an obsolete Railway deployment alive indefinitely.
  const force = setTimeout(() => { server.closeAllConnections(); }, 10000);
  force.unref();
  server.close(async () => {
    clearTimeout(force);
    try { await vite?.close(); app.close(); process.exitCode = 0; }
    catch { process.exitCode = 1; }
  });
  server.closeIdleConnections();
});
