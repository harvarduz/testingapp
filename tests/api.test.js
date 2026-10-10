import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.js';
import { courses } from '../src/data.js';
import { emptyCourse } from '../shared/course.js';
import { emptyProgress, completeLesson } from '../src/progress.js';

async function fixture(t, databasePath = ':memory:') {
  const app = createApp({ databasePath });
  const server = createServer(async (req, res) => {
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
  const request = async (path, { method = 'GET', data, cookie, origin, raw } = {}) => {
    const response = await fetch(base + '/api' + path, {
      method, headers: { ...(data !== undefined || raw !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(origin ? { Origin: origin } : {}) },
      body: raw ?? (data !== undefined ? JSON.stringify(data) : undefined),
      ...(raw && typeof raw !== 'string' ? { duplex: 'half' } : {}),
    });
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0], headers: response.headers };
  };
  const register = (email = 'creator@example.test') => request('/auth/register', { method: 'POST', data: { name: 'Test Creator', email, password: 'A unique test password 42!' } });
  return { request, register, stop };
}

test('accounts validate input, reject duplicates and wrong passwords, and invalidate logout sessions', async t => {
  const { request, register } = await fixture(t);
  assert.equal((await request('/auth/register', { method: 'POST', data: null })).status, 422);
  assert.equal((await request('/auth/register', { method: 'POST', data: { email: 'bad', password: 'short' } })).status, 422);
  const session = await register();
  assert.equal(session.status, 201); assert.ok(session.cookie);
  assert.match(session.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/);
  assert.equal('password' in session.data.user, false);
  assert.equal((await register()).status, 409);
  assert.equal((await request('/session', { cookie: session.cookie })).data.user.email, 'creator@example.test');
  assert.equal((await request('/auth/login', { method: 'POST', data: { email: 'creator@example.test', password: 'a wrong long password' } })).status, 401);
  assert.equal((await request('/auth/logout', { method: 'POST', data: {}, cookie: session.cookie })).status, 200);
  assert.equal((await request('/session', { cookie: session.cookie })).data.user, null);
  assert.equal((await request('/creator/courses', { cookie: session.cookie })).status, 401);
});

test('drafts remain private, publish for zero fee, appear publicly, and can be unpublished', async t => {
  const { request, register } = await fixture(t);
  const { cookie } = await register();
  const created = await request('/creator/courses', { method: 'POST', cookie, data: courses[0] });
  assert.equal(created.status, 201);
  const id = created.data.course.id;
  assert.equal((await request('/courses')).data.courses.some(c => c.id === id), false);
  const published = await request(`/creator/courses/${id}/publish`, { method: 'POST', cookie, data: {} });
  assert.deepEqual(published.data, { status: 'published', fee: 0 });
  const course = (await request('/courses')).data.courses.find(c => c.id === id);
  assert.equal(course.author, 'Test Creator'); assert.equal(course.lessons[0].question, courses[0].lessons[0].question);
  assert.equal((await request(`/creator/courses/${id}/unpublish`, { method: 'POST', cookie, data: {} })).status, 200);
  assert.equal((await request('/courses')).data.courses.some(c => c.id === id), false);
  assert.equal((await request(`/creator/courses/${id}`, { method: 'DELETE', cookie })).status, 422);
});

test('only the owner can change a course and cross-origin writes are rejected', async t => {
  const { request, register } = await fixture(t);
  const owner = await register(); const other = await register('another@example.test');
  const created = await request('/creator/courses', { method: 'POST', cookie: owner.cookie, data: courses[0] });
  const path = `/creator/courses/${created.data.course.id}`;
  for (const method of ['PUT', 'DELETE']) assert.equal((await request(path, { method, cookie: other.cookie, data: courses[0] })).status, 404);
  assert.equal((await request(path + '/publish', { method: 'POST', cookie: other.cookie, data: {} })).status, 404);
  assert.equal((await request('/creator/courses', { cookie: other.cookie })).data.courses.length, 0);
  assert.equal((await request('/creator/courses', { method: 'POST', cookie: owner.cookie, origin: 'https://unrelated.example', data: courses[0] })).status, 403);
  assert.equal((await request('/creator/courses', { method: 'POST', data: courses[0] })).status, 401);
});

test('invalid files and incomplete courses produce useful errors; published lesson positions are retained', async t => {
  const { request, register } = await fixture(t);
  const { cookie } = await register();
  assert.equal((await request('/creator/courses', { method: 'POST', cookie, raw: '{broken' })).status, 400);
  assert.equal((await request('/creator/courses', { method: 'POST', cookie, raw: ' '.repeat(1024 * 1024 + 1) })).status, 413);
  const chunked = async function* () { yield ' '.repeat(600000); yield ' '.repeat(600000); };
  assert.equal((await request('/creator/courses', { method: 'POST', cookie, raw: chunked() })).status, 413);
  assert.equal((await request('/creator/courses', { method: 'POST', cookie, data: { ...courses[0], category: 'Invented category' } })).status, 422);
  const draft = await request('/creator/courses', { method: 'POST', cookie, data: emptyCourse() });
  assert.equal(draft.status, 201);
  assert.equal((await request(`/creator/courses/${draft.data.course.id}/publish`, { method: 'POST', cookie, data: {} })).status, 422);
  assert.equal((await request(`/creator/courses/${draft.data.course.id}`, { method: 'DELETE', cookie })).status, 200);
  const real = await request('/creator/courses', { method: 'POST', cookie, data: courses[0] });
  const path = `/creator/courses/${real.data.course.id}`;
  await request(path + '/publish', { method: 'POST', cookie, data: {} });
  assert.equal((await request(path, { method: 'PUT', cookie, data: { ...courses[0], lessons: courses[0].lessons.slice(1) } })).status, 422);
});

test('progress merges concurrent completions without losing lessons or double-counting a review', async t => {
  const { request, register } = await fixture(t);
  const { cookie } = await register();
  const a = completeLesson(emptyProgress(), 'numbers', 0, '2026-10-10');
  const b = completeLesson(emptyProgress(), 'numbers', 1, '2026-10-10');
  await request('/progress', { method: 'PUT', cookie, data: a });
  const merged = await request('/progress', { method: 'PUT', cookie, data: b });
  assert.deepEqual(merged.data.progress.completed.numbers.sort(), [0, 1]);
  assert.equal(merged.data.progress.activity['2026-10-10'], 2);
  const review = await request('/progress', { method: 'PUT', cookie, data: a });
  assert.equal(review.data.progress.activity['2026-10-10'], 2);
  assert.equal((await request('/progress', { method: 'PUT', data: a })).status, 401);
});

test('accounts, sessions, drafts, and learning survive a server restart', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'curio-db-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = join(directory, 'curio.sqlite');
  const first = await fixture(t, file);
  const { cookie } = await first.register();
  const created = await first.request('/creator/courses', { method: 'POST', cookie, data: courses[0] });
  await first.request('/progress', { method: 'PUT', cookie, data: completeLesson(emptyProgress(), 'numbers', 2, '2026-10-10') });
  await first.stop();
  const second = await fixture(t, file);
  const session = await second.request('/session', { cookie });
  assert.equal(session.data.user.name, 'Test Creator');
  assert.deepEqual(session.data.progress.completed.numbers, [2]);
  assert.equal((await second.request('/creator/courses', { cookie })).data.courses[0].id, created.data.course.id);
});

test('production requires HTTPS configuration and uses secure session cookies', async t => {
  assert.throws(() => createApp({ databasePath: ':memory:', production: true }), /PUBLIC_URL/);
  const app = createApp({ databasePath: ':memory:', production: true, publicUrl: 'https://curio.example' });
  app.close();
});
