import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fixture } from './api_helpers.js';
import { createApp } from '../server/app.js';
import { publicUrlFromEnvironment } from '../server/config.js';
import { courses } from '../src/data.js';
import { emptyCourse } from '../shared/course.js';
import { emptyProgress, completeLesson, toggleSavedCourse, writeLessonNote } from '../src/progress.js';

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
  assert.deepEqual(published.data, { status: 'published', fee: 0, revision: 2 });
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

test('production uses the Railway HTTPS domain, respects custom domains, and secures account writes', async t => {
  assert.equal(publicUrlFromEnvironment({ RAILWAY_PUBLIC_DOMAIN: 'curio.up.railway.app' }), 'https://curio.up.railway.app');
  assert.equal(publicUrlFromEnvironment({ PUBLIC_URL: 'https://custom.example', RAILWAY_PUBLIC_DOMAIN: 'curio.up.railway.app' }), 'https://custom.example');
  assert.throws(() => publicUrlFromEnvironment({ RAILWAY_PUBLIC_DOMAIN: 'https://curio.example/path' }), /hostname/);
  for (const publicUrl of ['http://curio.example', 'invalid', 'https://user:password@curio.example', 'https://curio.example/path']) {
    assert.throws(() => createApp({ databasePath: ':memory:', production: true, publicUrl }), /PUBLIC_URL/);
  }
  const { request } = await fixture(t, ':memory:', { production: true, publicUrl: publicUrlFromEnvironment({ RAILWAY_PUBLIC_DOMAIN: 'curio.up.railway.app' }) });
  const data = { name: 'Railway Student', email: 'railway@example.test', password: 'A unique railway test password!' };
  assert.equal((await request('/auth/register', { method: 'POST', origin: 'https://unrelated.example', data })).status, 403);
  const account = await request('/auth/register', { method: 'POST', origin: 'https://curio.up.railway.app', data });
  assert.equal(account.status, 201);
  assert.match(account.headers.get('set-cookie'), /; Secure/);
});

test('production starts before a public domain is generated and disables writes until configured', async t => {
  assert.equal(publicUrlFromEnvironment({}), undefined);
  const { request, register } = await fixture(t, ':memory:', { production: true });
  assert.equal((await request('/health')).data.status, 'ok');
  assert.equal((await request('/courses')).status, 200);
  assert.equal((await register()).status, 503);
  assert.equal((await request('/auth/logout', { method: 'POST', origin: 'https://unrelated.example', data: {} })).status, 503);
  assert.equal((await request('/session')).data.user, null);
});

test('private notes and saved courses sync across devices without leaking to another account', async t => {
  const { request, register } = await fixture(t);
  const owner = await register();
  let initial = toggleSavedCourse(emptyProgress(), 'numbers', 100);
  initial = writeLessonNote(initial, 'numbers', 0, 'Private student notes.', 100);
  await request('/progress', { method: 'PUT', cookie: owner.cookie, data: initial });
  const newer = writeLessonNote(toggleSavedCourse(initial, 'numbers', 200), 'numbers', 0, '', 200);
  await request('/progress', { method: 'PUT', cookie: owner.cookie, data: newer });
  await request('/progress', { method: 'PUT', cookie: owner.cookie, data: initial });
  const restored = (await request('/session', { cookie: owner.cookie })).data.progress;
  assert.equal(restored.savedCourses.numbers.saved, false);
  assert.equal(restored.notes['numbers:0'].text, '');
  const other = await register('other-student@example.test');
  const separate = (await request('/session', { cookie: other.cookie })).data.progress;
  assert.deepEqual(separate.notes, {});
  assert.deepEqual(separate.savedCourses, {});
  assert.equal((await request('/progress', { method: 'PUT', data: initial })).status, 401);
});
