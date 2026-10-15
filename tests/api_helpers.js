import { createServer } from 'node:http';
import { createApp } from '../server/app.js';

export async function fixture(t, databasePath = ':memory:', options = {}) {
  const app = createApp({ databasePath, ...options });
  const server = createServer(async (req, res) => {
    if (options.onRequest) options.onRequest(req);
    if (!await app.handle(req, res)) { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let stopped = false;
  const stop = async () => {
    if (stopped) return;
    stopped = true;
    await new Promise(resolve => server.close(resolve)); app.close();
  };
  t.after(stop);
  const revisions = new Map();
  const request = async (path, { method = 'GET', data, cookie, origin, raw, headers = {}, automaticRevision = true } = {}) => {
    const courseId = path.match(/^\/creator\/courses\/([a-z0-9-]+)/)?.[1];
    const version = automaticRevision && !['GET', 'HEAD'].includes(method) && courseId && revisions.get(courseId);
    const response = await fetch(base + '/api' + path, {
      method, headers: { ...(data !== undefined || raw !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(origin ? { Origin: origin } : {}), ...(version ? { 'If-Match': `"rev-${version}"` } : {}), ...headers },
      body: raw ?? (data !== undefined ? JSON.stringify(data) : undefined),
      ...(raw && typeof raw !== 'string' ? { duplex: 'half' } : {}),
    });
    const result = method === 'HEAD' ? null : await response.json();
    if (result?.course?.revision) revisions.set(result.course.id, result.course.revision);
    if (response.ok && result?.revision && courseId) revisions.set(courseId, result.revision);
    return { status: response.status, data: result, cookie: response.headers.get('set-cookie')?.split(';')[0], headers: response.headers };
  };
  const register = (email = 'creator@example.test') => request('/auth/register', { method: 'POST', data: { name: 'Test Creator', email, password: 'A unique test password 42!' } });
  return { request, register, stop, base, app };
}
