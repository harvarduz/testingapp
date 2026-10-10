import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { categories, courses as builtInCourses } from '../src/data.js';
import { normalizeCourse, publicationIssues } from '../shared/course.js';
import { emptyProgress, readProgress, mergeProgress } from '../src/progress.js';

const deriveKey = promisify(scrypt);
const sessionDuration = 30 * 86400;
const hash = value => createHash('sha256').update(value).digest('hex');
const problem = (status, message) => Object.assign(new Error(message), { status });

export function createApp({ databasePath = './.data/curio.sqlite', publicUrl, production = false } = {}) {
  if (production && (!publicUrl || new URL(publicUrl).protocol !== 'https:')) throw new Error('Production requires PUBLIC_URL with your HTTPS deployment address.');
  if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec(`PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS courses (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), content TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', ever_published INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS progress (user_id TEXT PRIMARY KEY REFERENCES users(id), content TEXT NOT NULL);
  `);
  const authAttempts = new Map();
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
  const ownCourse = (id, user) => {
    const row = db.prepare('SELECT * FROM courses WHERE id = ? AND owner_id = ?').get(id, user.id);
    if (!row) throw problem(404, 'That course was not found in your workspace.');
    return row;
  };
  const send = (res, status, value) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(value));
  };
  const body = async req => {
    if (!req.headers['content-type']?.startsWith('application/json')) throw problem(415, 'Send JSON course data.');
    if (Number(req.headers['content-length']) > 1024 * 1024) throw problem(413, 'The file is too large. Use a course file smaller than 1 MB.');
    const chunks = await new Promise((resolve, reject) => {
      const parts = []; let size = 0;
      const cleanup = () => { req.off('data', receive); req.off('end', end); req.off('error', fail); req.off('aborted', abort); };
      const fail = error => { cleanup(); reject(error); };
      const abort = () => fail(problem(400, 'The upload was interrupted. Please try again.'));
      const end = () => { cleanup(); resolve(parts); };
      const receive = chunk => {
        size += chunk.length;
        if (size > 1024 * 1024) {
          fail(problem(413, 'The file is too large. Use a course file smaller than 1 MB.'));
          req.resume(); // Drain without destroying the socket before the error response.
        } else parts.push(chunk);
      };
      req.on('data', receive); req.once('end', end); req.once('error', fail); req.once('aborted', abort);
    });
    try { return JSON.parse(Buffer.concat(chunks).toString()); }
    catch { throw problem(400, 'This is not valid JSON. Check the course file and try again.'); }
  };
  const normalize = input => {
    try { return normalizeCourse(input, categories.slice(1)); }
    catch (error) { throw problem(422, error.message); }
  };
  const issueSession = (user, res) => {
    const token = randomBytes(32).toString('hex');
    db.prepare('DELETE FROM sessions WHERE expires <= ?').run(Date.now());
    db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(hash(token), user.id, Date.now() + sessionDuration * 1000);
    res.setHeader('Set-Cookie', cookie(token));
    return { user: { id: user.id, name: user.name, email: user.email }, progress: getProgress(user) };
  };
  const checkAuthRate = (req, email) => {
    // Socket addresses cannot be spoofed through arbitrary forwarded headers.
    // On Railway, require an additional edge rate limit for large public launches.
    const key = req.socket.remoteAddress + (email ? ':' + hash(email) : '');
    const now = Date.now();
    for (const [ip, entry] of authAttempts) if (entry.reset < now) authAttempts.delete(ip);
    const entry = authAttempts.get(key) || { count: 0, reset: now + 600000 };
    entry.count++; authAttempts.set(key, entry);
    if (entry.count > (email ? 20 : 300)) throw problem(429, 'Too many sign-in attempts. Try again in a few minutes.');
  };

  const handle = async (req, res) => {
    const path = new URL(req.url, 'http://internal').pathname;
    if (!path.startsWith('/api/')) return false;
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    try {
      if (!['GET', 'HEAD'].includes(req.method)) {
        const expectedOrigin = publicUrl ? new URL(publicUrl).origin : `http://${req.headers.host}`;
        if (req.headers.origin && req.headers.origin !== expectedOrigin) throw problem(403, 'This request came from a different website. Refresh Curio and try again.');
        if (req.headers['sec-fetch-site'] === 'cross-site') throw problem(403, 'Cross-site requests are not allowed.');
      }
      if (req.method === 'GET' && path === '/api/health') { send(res, 200, { status: 'ok', publishing: 'free-limited-time' }); return true; }
      if (req.method === 'GET' && path === '/api/courses') {
        const published = db.prepare("SELECT c.*, u.name AS author FROM courses c JOIN users u ON c.owner_id = u.id WHERE c.status = 'published' ORDER BY c.updated_at DESC").all();
        send(res, 200, { courses: [...builtInCourses, ...published.map(publicCourse)], categories }); return true;
      }
      if (req.method === 'GET' && path === '/api/session') {
        const user = sessionUser(req); send(res, 200, { user, progress: user ? getProgress(user) : null }); return true;
      }
      if (req.method === 'POST' && ['/api/auth/register', '/api/auth/login'].includes(path)) {
        checkAuthRate(req);
        const input = await body(req);
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
          const key = await deriveKey(password, salt, 64);
          const user = { id: randomBytes(16).toString('hex'), name, email };
          try { db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?)').run(user.id, name, email, `${salt}:${key.toString('hex')}`, new Date().toISOString()); }
          catch (error) { if (error.errcode === 2067 || error.message.includes('UNIQUE constraint')) throw problem(409, 'An account with this email already exists. Sign in instead.'); throw error; }
          send(res, 201, issueSession(user, res)); return true;
        }
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        // Derive even for an unknown email to reduce timing differences.
        const [salt, expected] = user?.password.split(':') || ['00000000000000000000000000000000', '00'.repeat(64)];
        const key = await deriveKey(password, salt, 64);
        if (!user || !timingSafeEqual(key, Buffer.from(expected, 'hex'))) throw problem(401, 'Email or password is incorrect.');
        send(res, 200, issueSession(user, res)); return true;
      }
      if (req.method === 'POST' && path === '/api/auth/logout') {
        const token = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith('curio_session='))?.slice(14);
        if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(hash(token));
        res.setHeader('Set-Cookie', cookie('')); send(res, 200, { ok: true }); return true;
      }
      if (req.method === 'PUT' && path === '/api/progress') {
        const user = requireUser(req); const input = await body(req);
        const normalized = readProgress({ getItem: () => JSON.stringify(input) });
        const merged = mergeProgress(getProgress(user), normalized);
        db.prepare('INSERT INTO progress VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET content = excluded.content').run(user.id, JSON.stringify(merged));
        send(res, 200, { progress: merged }); return true;
      }
      if (path === '/api/creator/courses') {
        const user = requireUser(req);
        if (req.method === 'GET') {
          const rows = db.prepare('SELECT * FROM courses WHERE owner_id = ? ORDER BY updated_at DESC').all(user.id);
          send(res, 200, { courses: rows.map(row => ({ ...publicCourse({ ...row, author: user.name }), status: row.status, everPublished: Boolean(row.ever_published) })) }); return true;
        }
        if (req.method === 'POST') {
          if (db.prepare('SELECT COUNT(*) AS count FROM courses WHERE owner_id = ?').get(user.id).count >= 50) throw problem(422, 'You can keep up to 50 courses in your workspace.');
          const content = normalize(await body(req)); const id = 'community-' + randomBytes(12).toString('hex');
          db.prepare('INSERT INTO courses (id, owner_id, content, updated_at) VALUES (?, ?, ?, ?)').run(id, user.id, JSON.stringify(content), new Date().toISOString());
          send(res, 201, { course: { ...content, id, status: 'draft', everPublished: false } }); return true;
        }
      }
      const match = path.match(/^\/api\/creator\/courses\/([a-z0-9-]+)(?:\/(publish|unpublish))?$/);
      if (match) {
        const user = requireUser(req); const row = ownCourse(match[1], user);
        if (req.method === 'PUT' && !match[2]) {
          const content = normalize(await body(req));
          if (row.ever_published && content.lessons.length < JSON.parse(row.content).lessons.length) throw problem(422, 'Previously published lessons cannot be removed, so students keep their saved progress.');
          const issues = row.status === 'published' ? publicationIssues(content) : [];
          if (issues.length) throw problem(422, issues[0]);
          db.prepare('UPDATE courses SET content = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(content), new Date().toISOString(), row.id);
          send(res, 200, { course: { ...content, id: row.id, status: row.status, everPublished: Boolean(row.ever_published) } }); return true;
        }
        if (req.method === 'POST' && match[2]) {
          const publishing = match[2] === 'publish';
          if (publishing) {
            const issues = publicationIssues(JSON.parse(row.content));
            if (issues.length) throw problem(422, issues[0]);
          }
          db.prepare('UPDATE courses SET status = ?, ever_published = MAX(ever_published, ?), updated_at = ? WHERE id = ?').run(publishing ? 'published' : 'draft', publishing ? 1 : 0, new Date().toISOString(), row.id);
          send(res, 200, { status: publishing ? 'published' : 'draft', fee: 0 }); return true;
        }
        if (req.method === 'DELETE' && !match[2]) {
          if (row.ever_published) throw problem(422, 'Unpublish this course instead. Its lessons are retained for students’ saved progress.');
          db.prepare('DELETE FROM courses WHERE id = ?').run(row.id); send(res, 200, { ok: true }); return true;
        }
      }
      throw problem(404, 'This endpoint does not exist.');
    } catch (error) {
      if (!error.status) console.error('API request failed:', error.message);
      send(res, error.status || 500, { error: error.status ? error.message : 'Something went wrong. Try again in a moment.' });
    }
    return true;
  };
  return { handle, close: () => db.close() };
}
