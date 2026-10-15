import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { openDatabase, transaction } from './database.js';
import { problem, requestId, readBody, send } from './http.js';
import { authLimiter, passwordHasher } from './auth.js';
import { categories, courses as builtInCourses } from '../src/data.js';
import { normalizeCourse, publicationIssues } from '../shared/course.js';
import { emptyProgress, readProgress, mergeProgress } from '../src/progress.js';

const sessionDuration = 30 * 86400;
const hash = value => createHash('sha256').update(value).digest('hex');

export function createApp({ databasePath = './.data/curio.sqlite', publicUrl, production = false, authPolicy, passwordConcurrency = 4 } = {}) {
  let publicOrigin;
  if (publicUrl) {
    let address;
    try { address = new URL(publicUrl); }
    catch { throw new Error('PUBLIC_URL must be a valid website address.'); }
    if (production && (address.protocol !== 'https:' || address.username || address.password || address.pathname !== '/' || address.search || address.hash)) {
      throw new Error('Production PUBLIC_URL must be the HTTPS origin of your website.');
    }
    publicOrigin = address.origin;
  }
  const db = openDatabase(databasePath);
  const limitAuth = authLimiter(db, authPolicy);
  const deriveKey = passwordHasher(passwordConcurrency);
  let closed = false;
  const cookie = token => `curio_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token ? sessionDuration : 0}${production ? '; Secure' : ''}`;
  const sessionUser = req => {
    const token = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith('curio_session='))?.slice(14);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    return db.prepare('SELECT u.id, u.name, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires > ?').get(hash(token), Date.now()) || null;
  };
  const requireUser = req => {
    const user = sessionUser(req);
    if (!user) throw problem(401, 'Sign in to manage your courses.');
    return user;
  };
  const getProgress = user => {
    const row = db.prepare('SELECT content FROM progress WHERE user_id = ?').get(user.id);
    return row ? JSON.parse(row.content) : { ...emptyProgress(), name: user.name };
  };
  const publicCourse = row => ({ ...JSON.parse(row.content), id: row.id, author: row.author, community: true });
  const privateCourse = row => ({ ...JSON.parse(row.content), id: row.id, status: row.status, everPublished: Boolean(row.ever_published), revision: row.revision, updatedAt: row.updated_at });
  const tag = revision => `"rev-${revision}"`;
  const requireRevision = (req, row) => {
    if (!req.headers['if-match']) throw problem(428, 'Reload this course before changing it. A version is required to protect your work.', 'REVISION_REQUIRED');
    if (req.headers['if-match'] !== tag(row.revision)) throw problem(412, 'This course changed in another tab or device. Your work has not been overwritten. Load the latest version before saving or publishing.', 'COURSE_CONFLICT', { currentRevision: row.revision });
  };
  const ownCourse = (id, user) => {
    const row = db.prepare('SELECT * FROM courses WHERE id = ? AND owner_id = ?').get(id, user.id);
    if (!row) throw problem(404, 'That course was not found in your workspace.');
    return row;
  };
  const normalize = input => {
    try { return normalizeCourse(input, categories.slice(1)); }
    catch (error) { throw problem(422, error.message); }
  };
  const issueSession = (user, res, passwordRecord) => {
    const token = randomBytes(32).toString('hex');
    const payload = transaction(db, () => {
      if (passwordRecord) db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?)').run(user.id, user.name, user.email, passwordRecord, new Date().toISOString());
      db.prepare('DELETE FROM sessions WHERE expires <= ?').run(Date.now());
      db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(hash(token), user.id, Date.now() + sessionDuration * 1000);
      const otherSessions = db.prepare('SELECT token FROM sessions WHERE user_id = ? AND token != ? ORDER BY expires DESC, token').all(user.id, hash(token));
      for (const old of otherSessions.slice(19)) db.prepare('DELETE FROM sessions WHERE token = ?').run(old.token);
      return { user: { id: user.id, name: user.name, email: user.email }, progress: getProgress(user) };
    });
    res.setHeader('Set-Cookie', cookie(token));
    return payload;
  };

  const checkAuthRate = (req, email) => {
    // Do not trust user-controlled forwarding headers. Account limits also work
    // across IPs; the database retains active windows across server restarts.
    const key = email ? `account:${hash(email)}` : `ip:${hash(req.socket.remoteAddress || 'unknown')}`;
    const retryAfter = limitAuth(key, Boolean(email));
    if (retryAfter) throw problem(429, 'Too many sign-in attempts. Try again in a few minutes.', 'RATE_LIMITED', { retryAfter });
  };

  const handle = async (req, res) => {
    let path;
    try { path = new URL(req.url, 'http://internal').pathname; }
    catch { return false; }
    if (!path.startsWith('/api/')) return false;
    const id = requestId(res);
    const method = req.method === 'HEAD' ? 'GET' : req.method;
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    try {
      if (!['GET', 'HEAD'].includes(req.method)) {
        if (production && !publicOrigin) throw problem(503, 'Accounts and publishing are not available yet. Please try again shortly.');
        const expectedOrigin = publicOrigin || `http://${req.headers.host}`;
        if (req.headers.origin && req.headers.origin !== expectedOrigin) throw problem(403, 'This request came from a different website. Refresh Curio and try again.');
        if (req.headers['sec-fetch-site'] === 'cross-site') throw problem(403, 'Cross-site requests are not allowed.');
      }
      if (method === 'GET' && path === '/api/health') {
        try { for (const table of ['users', 'sessions', 'courses', 'progress']) db.prepare(`SELECT 1 FROM ${table} LIMIT 1`).get(); }
        catch { throw problem(503, 'The data service is unavailable.', 'DATABASE_UNAVAILABLE', { retryAfter: 5 }); }
        send(res, 200, { status: 'ok', publishing: 'free-limited-time', database: 'ready' }); return true;
      }
      if (method === 'GET' && path === '/api/courses') {
        const published = db.prepare("SELECT c.*, u.name AS author FROM courses c JOIN users u ON c.owner_id = u.id WHERE c.status = 'published' ORDER BY c.updated_at DESC").all();
        send(res, 200, { courses: [...builtInCourses, ...published.map(publicCourse)], categories }); return true;
      }
      if (method === 'GET' && path === '/api/session') {
        const user = sessionUser(req); send(res, 200, { user, progress: user ? getProgress(user) : null }); return true;
      }
      if (req.method === 'POST' && ['/api/auth/register', '/api/auth/login'].includes(path)) {
        checkAuthRate(req);
        const input = await readBody(req);
        if (!input || typeof input !== 'object' || Array.isArray(input)) throw problem(422, 'Enter your account details.');
        const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
        const password = input.password;
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw problem(422, 'Enter a valid email address.');
        checkAuthRate(req, email);
        if (typeof password !== 'string' || password.length < 10 || password.length > 128) throw problem(422, 'Use a password from 10 to 128 characters.');
        if (path.endsWith('register')) {
          const name = typeof input.name === 'string' ? input.name.trim() : '';
          if (name.length < 2 || name.length > 32) throw problem(422, 'Use a name from 2 to 32 characters.');
          const salt = randomBytes(16).toString('hex');
          const key = await deriveKey(password, salt);
          const user = { id: randomBytes(16).toString('hex'), name, email };
          try { send(res, 201, issueSession(user, res, `${salt}:${key.toString('hex')}`)); }
          catch (error) { if (error.errcode === 2067 || error.message.includes('UNIQUE constraint')) throw problem(409, 'An account with this email already exists. Sign in instead.'); throw error; }
          return true;
        }
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        // Derive even for an unknown email to reduce timing differences.
        const [salt, expected] = user?.password.split(':') || ['00000000000000000000000000000000', '00'.repeat(64)];
        const key = await deriveKey(password, salt);
        if (!user || !timingSafeEqual(key, Buffer.from(expected, 'hex'))) throw problem(401, 'Email or password is incorrect.');
        send(res, 200, issueSession(user, res)); return true;
      }
      if (req.method === 'POST' && path === '/api/auth/logout') {
        const token = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith('curio_session='))?.slice(14);
        if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(hash(token));
        res.setHeader('Set-Cookie', cookie('')); send(res, 200, { ok: true }); return true;
      }
      if (req.method === 'PUT' && path === '/api/progress') {
        requireUser(req);
        const input = await readBody(req, { limit: 4 * 1024 * 1024 });
        if (!input || typeof input !== 'object' || Array.isArray(input)) throw problem(422, 'Send a learning progress object.', 'INVALID_PROGRESS');
        const normalized = readProgress({ getItem: () => JSON.stringify(input) });
        const merged = transaction(db, () => {
          const user = requireUser(req); // Recheck after the asynchronous upload.
          const value = mergeProgress(getProgress(user), normalized);
          const serialized = JSON.stringify(value);
          if (Buffer.byteLength(serialized) > 4 * 1024 * 1024) throw problem(413, 'Your learning history has reached the sync size limit. Your previously saved data is unchanged.', 'PROGRESS_LIMIT');
          db.prepare('INSERT INTO progress VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET content = excluded.content').run(user.id, serialized);
          return value;
        });
        send(res, 200, { progress: merged }); return true;
      }
      if (path === '/api/creator/courses') {
        const user = requireUser(req);
        if (method === 'GET') {
          const rows = db.prepare('SELECT * FROM courses WHERE owner_id = ? ORDER BY updated_at DESC').all(user.id);
          send(res, 200, { courses: rows.map(row => ({ ...privateCourse(row), author: user.name })) }); return true;
        }
        if (req.method === 'POST') {
          const content = normalize(await readBody(req));
          const created = transaction(db, () => {
            const current = requireUser(req);
            if (db.prepare('SELECT COUNT(*) AS count FROM courses WHERE owner_id = ?').get(current.id).count >= 50) throw problem(422, 'You can keep up to 50 courses in your workspace.');
            const courseId = 'community-' + randomBytes(12).toString('hex');
            db.prepare('INSERT INTO courses (id, owner_id, content, updated_at) VALUES (?, ?, ?, ?)').run(courseId, current.id, JSON.stringify(content), new Date().toISOString());
            return ownCourse(courseId, current);
          });
          res.setHeader('ETag', tag(created.revision));
          send(res, 201, { course: privateCourse(created) }); return true;
        }
      }
      const match = path.match(/^\/api\/creator\/courses\/([a-z0-9-]+)(?:\/(publish|unpublish))?$/);
      if (match) {
        const user = requireUser(req);
        const initial = ownCourse(match[1], user);
        if (method === 'GET' && !match[2]) {
          res.setHeader('ETag', tag(initial.revision));
          send(res, 200, { course: privateCourse(initial) }); return true;
        }
        if (req.method === 'PUT' && !match[2]) {
          requireRevision(req, initial);
          const content = normalize(await readBody(req));
          const saved = transaction(db, () => {
            const row = ownCourse(match[1], requireUser(req));
            requireRevision(req, row); // Version may have changed during upload.
            if (row.ever_published && content.lessons.length < JSON.parse(row.content).lessons.length) throw problem(422, 'Previously published lessons cannot be removed, so students keep their saved progress.');
            const issues = row.status === 'published' ? publicationIssues(content) : [];
            if (issues.length) throw problem(422, issues[0]);
            db.prepare('UPDATE courses SET content = ?, updated_at = ?, revision = revision + 1 WHERE id = ?').run(JSON.stringify(content), new Date().toISOString(), row.id);
            return ownCourse(row.id, user);
          });
          res.setHeader('ETag', tag(saved.revision));
          send(res, 200, { course: privateCourse(saved) }); return true;
        }
        if (req.method === 'POST' && match[2]) {
          const publishing = match[2] === 'publish';
          const saved = transaction(db, () => {
            const row = ownCourse(match[1], requireUser(req));
            requireRevision(req, row);
            if (publishing) {
              const issues = publicationIssues(JSON.parse(row.content));
              if (issues.length) throw problem(422, issues[0]);
            }
            db.prepare('UPDATE courses SET status = ?, ever_published = MAX(ever_published, ?), updated_at = ?, revision = revision + 1 WHERE id = ?').run(publishing ? 'published' : 'draft', publishing ? 1 : 0, new Date().toISOString(), row.id);
            return ownCourse(row.id, user);
          });
          res.setHeader('ETag', tag(saved.revision));
          send(res, 200, { status: saved.status, fee: 0, revision: saved.revision }); return true;
        }
        if (req.method === 'DELETE' && !match[2]) {
          transaction(db, () => {
            const row = ownCourse(match[1], requireUser(req));
            requireRevision(req, row);
            if (row.ever_published) throw problem(422, 'Unpublish this course instead. Its lessons are retained for students’ saved progress.');
            db.prepare('DELETE FROM courses WHERE id = ?').run(row.id);
          });
          send(res, 200, { ok: true }); return true;
        }
      }
      const allowed = path === '/api/health' || path === '/api/courses' || path === '/api/session' ? 'GET, HEAD'
        : /^\/api\/auth\/(login|register|logout)$/.test(path) ? 'POST'
        : path === '/api/progress' ? 'PUT'
        : path === '/api/creator/courses' ? 'GET, HEAD, POST'
        : match ? match[2] ? 'POST' : 'GET, HEAD, PUT, DELETE' : null;
      if (allowed) { res.setHeader('Allow', allowed); throw problem(405, 'This method is not supported for this endpoint.', 'METHOD_NOT_ALLOWED'); }
      throw problem(404, 'This endpoint does not exist.');
    } catch (error) {
      const unavailable = !error.status && /database is (?:locked|busy)/i.test(error.message);
      const status = error.status || (unavailable ? 503 : 500);
      const code = error.status ? error.code || `HTTP_${status}` : unavailable ? 'DATABASE_BUSY' : 'INTERNAL_ERROR';
      if (error.retryAfter || unavailable) res.setHeader('Retry-After', error.retryAfter || 1);
      if (status >= 500) console.error(JSON.stringify({ event: 'api_error', requestId: id, method: req.method, path, status, code }));
      send(res, status, { error: error.status ? error.message : unavailable ? 'Saving is busy. Please try again shortly.' : 'Something went wrong. Try again in a moment.', code, requestId: id, ...(error.currentRevision ? { currentRevision: error.currentRevision } : {}) });
    }
    return true;
  };
  return { handle, close: () => { if (!closed) { closed = true; db.close(); } } };
}
