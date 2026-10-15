import test from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, statSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fixture } from './api_helpers.js';
import { courses } from '../src/data.js';
import { emptyProgress, completeLesson, mergeProgress } from '../src/progress.js';
import { openDatabase } from '../server/database.js';
import { backupDatabase, inspectDatabase } from '../server/backup.js';
import { createWebsiteServer } from '../server/web.js';
import { createApp } from '../server/app.js';
import { readBody, send } from '../server/http.js';
import { createServer } from 'node:http';

function directory(t) {
  const path = mkdtempSync(join(tmpdir(), 'curio-backend-'));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  return path;
}
function partialUpload(base, path, cookie, version) {
  let finish;
  const response = new Promise((resolve, reject) => {
    const req = httpRequest(base + '/api' + path, { method: 'PUT', headers: { Cookie: cookie, 'Content-Type': 'application/json', ...(version ? { 'If-Match': `"rev-${version}"` } : {}) } }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(Buffer.concat(chunks).toString()) }));
    });
    req.on('error', reject); req.write('{');
    finish = input => req.end(JSON.stringify(input).slice(1));
  });
  return { response, finish };
}

test('course revisions reject stale saves, stale publication and missing versions without leaking private content', async t => {
  const { register, request } = await fixture(t);
  const { cookie } = await register();
  const created = (await request('/creator/courses', { method: 'POST', cookie, data: courses[0] })).data.course;
  const path = `/creator/courses/${created.id}`;
  assert.equal(created.revision, 1);
  const first = await request(path, { method: 'PUT', cookie, data: { ...courses[0], title: 'The newer title' }, headers: { 'If-Match': '"rev-1"' } });
  assert.equal(first.status, 200); assert.equal(first.data.course.revision, 2);
  for (const [suffix, method] of [['', 'PUT'], ['/publish', 'POST'], ['', 'DELETE']]) {
    const stale = await request(path + suffix, { method, cookie, data: method === 'PUT' ? courses[0] : undefined, headers: { 'If-Match': '"rev-1"' } });
    assert.equal(stale.status, 412); assert.equal(stale.data.code, 'COURSE_CONFLICT');
    assert.equal(stale.data.currentRevision, 2);
    assert.equal(stale.headers.get('x-request-id'), stale.data.requestId);
  }
  assert.equal((await request(path, { method: 'PUT', cookie, data: courses[0], automaticRevision: false })).status, 428);
  const latest = await request(path, { cookie });
  assert.equal(latest.data.course.title, 'The newer title'); assert.equal(latest.headers.get('etag'), '"rev-2"');
  const other = await register('other@example.test');
  assert.equal((await request(path, { cookie: other.cookie })).status, 404);
  assert.equal((await request('/courses')).data.courses.some(c => c.id === created.id), false);
});

test('a save uploaded while another request publishes cannot overwrite the newly published version', async t => {
  let received;
  const started = new Promise(resolve => { received = resolve; });
  const { register, request, base } = await fixture(t, ':memory:', { onRequest: req => { if (req.method === 'PUT') req.once('data', received); } });
  const { cookie } = await register();
  const created = (await request('/creator/courses', { method: 'POST', cookie, data: courses[0] })).data.course;
  const path = `/creator/courses/${created.id}`;
  const pending = partialUpload(base, path, cookie, 1); await started;
  assert.equal((await request(path + '/publish', { method: 'POST', cookie, data: {} })).status, 200);
  pending.finish({ ...courses[0], title: 'Stale upload', lessons: courses[0].lessons.slice(1) });
  assert.equal((await pending.response).status, 412);
  const result = (await request(path, { cookie })).data.course;
  assert.equal(result.status, 'published'); assert.equal(result.lessons.length, courses[0].lessons.length);
  assert.equal(result.title, courses[0].title);
});

test('revoking a session during a progress upload prevents the later write', async t => {
  let received;
  const started = new Promise(resolve => { received = resolve; });
  const { register, request, base } = await fixture(t, ':memory:', { onRequest: req => { if (req.method === 'PUT') req.once('data', received); } });
  const { cookie } = await register();
  const pending = partialUpload(base, '/progress', cookie); await started;
  await request('/auth/logout', { method: 'POST', cookie, data: {} });
  pending.finish(completeLesson(emptyProgress(), 'numbers', 0));
  assert.equal((await pending.response).status, 401);
  const login = await request('/auth/login', { method: 'POST', data: { email: 'creator@example.test', password: 'A unique test password 42!' } });
  assert.deepEqual(login.data.progress.completed, {});
});

test('parallel progress writes retain independent completions and reject malformed roots', async t => {
  const { register, request } = await fixture(t);
  const { cookie } = await register();
  const replies = await Promise.all(Array.from({ length: 7 }, (_, i) => request('/progress', { method: 'PUT', cookie, data: completeLesson(emptyProgress(), 'numbers', i, '2026-10-15') })));
  assert.ok(replies.every(reply => reply.status === 200));
  const saved = (await request('/session', { cookie })).data.progress;
  assert.deepEqual(saved.completed.numbers.sort(), [0, 1, 2, 3, 4, 5, 6]); assert.equal(saved.activity['2026-10-15'], 7);
  for (const data of [null, [], 'wrong']) assert.equal((await request('/progress', { method: 'PUT', cookie, data })).status, 422);
  assert.deepEqual((await request('/session', { cookie })).data.progress.completed, saved.completed);
});

test('merged notes remain bounded across devices and a legitimate note collection can exceed the course-upload limit', async t => {
  const a = emptyProgress(), b = emptyProgress();
  for (let i = 0; i < 500; i++) {
    a.notes[`course-${i}:0`] = { text: 'First device', updatedAt: i };
    b.notes[`course-${i + 500}:0`] = { text: 'Second device', updatedAt: 1000 + i };
  }
  const merged = mergeProgress(a, b);
  assert.equal(Object.keys(merged.notes).length, 500); assert.ok(merged.notes['course-999:0']);
  const { register, request } = await fixture(t); const { cookie } = await register();
  const progress = emptyProgress();
  for (let i = 0; i < 500; i++) progress.notes[`course-${i}:0`] = { text: 'Useful notes. '.repeat(200).slice(0, 2000), updatedAt: i };
  for (let i = 0; i < 500; i++) progress.practiceAttempts[`answer-${i}`] = { courseId: 'numbers', lessonIndex: 0, questionIndex: 0, correct: true, answeredAt: i };
  assert.ok(Buffer.byteLength(JSON.stringify(progress)) > 1024 * 1024);
  assert.equal((await request('/progress', { method: 'PUT', cookie, data: progress })).status, 200);
});

test('auth limits survive restart and return machine-readable retry information', async t => {
  const file = join(directory(t), 'curio.sqlite');
  const first = await fixture(t, file, { authPolicy: { ipLimit: 2, accountLimit: 20 } });
  const login = { method: 'POST', data: { email: 'unknown@example.test', password: 'a wrong long password' } };
  assert.equal((await first.request('/auth/login', login)).status, 401);
  assert.equal((await first.request('/auth/login', login)).status, 401);
  await first.stop();
  const second = await fixture(t, file, { authPolicy: { ipLimit: 2, accountLimit: 20 } });
  const limited = await second.request('/auth/login', login);
  assert.equal(limited.status, 429); assert.equal(limited.data.code, 'RATE_LIMITED');
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
  assert.equal(limited.data.requestId, limited.headers.get('x-request-id'));
  assert.equal((await second.request('/health')).status, 200);
});

test('expensive password work is bounded while health requests remain available', async t => {
  const { request } = await fixture(t, ':memory:', { passwordConcurrency: 1 });
  const replies = await Promise.all(Array.from({ length: 8 }, (_, i) => request('/auth/login', { method: 'POST', data: { email: `user${i}@example.test`, password: 'a wrong long password' } })));
  assert.ok(replies.some(reply => reply.status === 503 && reply.data.code === 'AUTH_BUSY'));
  assert.ok(replies.some(reply => reply.status === 401));
  assert.equal((await request('/health')).data.database, 'ready');
});

test('legacy schema migration preserves content, ownership, sessions and completion data', async t => {
  const file = join(directory(t), 'legacy.sqlite');
  const legacy = new DatabaseSync(file);
  legacy.exec(`CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, password TEXT, created_at TEXT);
    CREATE TABLE sessions (token TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), expires INTEGER);
    CREATE TABLE courses (id TEXT PRIMARY KEY, owner_id TEXT REFERENCES users(id), content TEXT, status TEXT, ever_published INTEGER, updated_at TEXT);
    CREATE TABLE progress (user_id TEXT PRIMARY KEY REFERENCES users(id), content TEXT);
    INSERT INTO users VALUES ('owner', 'Original Creator', 'original@example.test', 'not-a-login-fixture', '2026-10-01');
    INSERT INTO sessions VALUES ('old-session', 'owner', 9999999999999);`);
  legacy.prepare('INSERT INTO courses VALUES (?, ?, ?, ?, ?, ?)').run('original-course', 'owner', JSON.stringify(courses[0]), 'published', 1, '2026-10-01');
  legacy.prepare('INSERT INTO progress VALUES (?, ?)').run('owner', JSON.stringify(completeLesson(emptyProgress(), 'numbers', 0)));
  legacy.close();
  const db = openDatabase(file);
  assert.equal(db.prepare('PRAGMA user_version').get().user_version, 1);
  assert.equal(db.prepare('SELECT * FROM courses').get().revision, 1);
  assert.equal(db.prepare('SELECT count(*) AS total FROM sessions').get().total, 1);
  assert.equal(JSON.parse(db.prepare('SELECT content FROM progress').get().content).completed.numbers[0], 0);
  db.close();
  const reopened = openDatabase(file); assert.equal(reopened.prepare('SELECT owner_id FROM courses').get().owner_id, 'owner'); reopened.close();
});

test('online backups include committed WAL data, are private, restore successfully, and never overwrite files', async t => {
  const dir = directory(t), source = join(dir, 'curio.sqlite'), target = join(dir, 'backup.sqlite');
  const app = await fixture(t, source); const { cookie } = await app.register();
  await app.request('/progress', { method: 'PUT', cookie, data: completeLesson(emptyProgress(), 'numbers', 0) });
  const created = (await app.request('/creator/courses', { method: 'POST', cookie, data: courses[0] })).data.course;
  const before = readFileSync(source);
  const report = await backupDatabase(source, target);
  await assert.rejects(backupDatabase(source, join(process.cwd(), 'dist', 'backup.sqlite')), /public web directories/);
  assert.equal(statSync(source).mode & 0o777, 0o600);
  assert.equal(report.integrity, 'ok'); assert.equal(statSync(target).mode & 0o777, 0o600);
  assert.deepEqual(readFileSync(source), before);
  await assert.rejects(backupDatabase(source, target), /never overwritten/);
  const restored = await fixture(t, target);
  assert.equal((await restored.request('/session', { cookie })).data.progress.completed.numbers[0], 0);
  assert.equal((await restored.request('/creator/courses', { cookie })).data.courses[0].id, created.id);
  const wrong = join(dir, 'empty.sqlite'); const db = new DatabaseSync(wrong); db.close();
  assert.throws(() => inspectDatabase(wrong), /no such table/);
});

test('health reports a closed database as unavailable and HEAD/method responses follow HTTP semantics', async t => {
  const { request, app } = await fixture(t);
  const head = await request('/health', { method: 'HEAD' }); assert.equal(head.status, 200); assert.equal(head.data, null);
  const wrong = await request('/session', { method: 'POST', data: {} }); assert.equal(wrong.status, 405); assert.equal(wrong.headers.get('allow'), 'GET, HEAD');
  app.close();
  const unhealthy = await request('/health'); assert.equal(unhealthy.status, 503); assert.equal(unhealthy.data.code, 'DATABASE_UNAVAILABLE');
});

test('static serving handles malformed URLs, missing assets, conditional responses and streamed files', async t => {
  const dir = directory(t); mkdirSync(join(dir, 'assets')); writeFileSync(join(dir, 'index.html'), '<!doctype html><h1>Curio test</h1>'); writeFileSync(join(dir, 'assets', 'main.js'), 'console.log("test")');
  const app = createApp({ databasePath: ':memory:' });
  const server = createWebsiteServer({ app, directory: dir, production: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); app.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base + '/%ZZ')).status, 400);
  assert.equal((await fetch(base + '/%00')).status, 400);
  assert.equal((await fetch(base + '/assets/missing.js')).status, 404);
  const main = await fetch(base + '/assets/main.js'); assert.equal(await main.text(), 'console.log("test")');
  assert.match(main.headers.get('cache-control'), /immutable/);
  assert.equal((await fetch(base + '/assets/main.js', { headers: { 'If-None-Match': main.headers.get('etag') } })).status, 304);
  const head = await fetch(base, { method: 'HEAD' }); assert.equal(await head.text(), ''); assert.ok(Number(head.headers.get('content-length')) > 0);
  assert.equal((await fetch(base + '/lesson/any')).status, 200);
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
  assert.equal(server.requestTimeout, 30000); assert.equal(server.headersTimeout, 15000);
});

test('new logins retain the current session, bound older sessions and discard expired records', async t => {
  const file = join(directory(t), 'sessions.sqlite');
  const { register, request } = await fixture(t, file, { authPolicy: { accountLimit: 100 } });
  const first = await register();
  let current;
  for (let i = 0; i < 21; i++) current = await request('/auth/login', { method: 'POST', data: { email: 'creator@example.test', password: 'A unique test password 42!' } });
  assert.equal(current.status, 200);
  assert.equal((await request('/session', { cookie: current.cookie })).data.user.id, first.data.user.id);
  assert.equal((await request('/session', { cookie: first.cookie })).data.user, null);
  const db = new DatabaseSync(file);
  assert.equal(db.prepare('SELECT count(*) AS total FROM sessions').get().total, 20);
  db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run('expired-session', first.data.user.id, 1);
  await request('/auth/login', { method: 'POST', data: { email: 'creator@example.test', password: 'A unique test password 42!' } });
  assert.equal(db.prepare('SELECT count(*) AS total FROM sessions WHERE expires <= ?').get(Date.now()).total, 0);
  db.close();
});


test('a partial JSON upload reaches its deadline without blocking another request', async t => {
  const server = createServer(async (req, res) => {
    if (req.url === '/health') { res.end('ok'); return; }
    try { await readBody(req, { timeout: 40 }); send(res, 200, { ok: true }); }
    catch (error) { send(res, error.status, { code: error.code }); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const pending = partialUpload(base, '/slow', '');
  assert.equal(await (await fetch(base + '/health')).text(), 'ok');
  const result = await pending.response;
  assert.equal(result.status, 408); assert.equal(result.data.code, 'UPLOAD_TIMEOUT');
  pending.finish({});
});
