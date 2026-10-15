import { DatabaseSync } from 'node:sqlite';
import { chmodSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function transaction(db, operation) {
  db.exec('BEGIN IMMEDIATE');
  try { const value = operation(); db.exec('COMMIT'); return value; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}

export function openDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  try {
    if (path !== ':memory:') chmodSync(path, 0o600);
    db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA synchronous = FULL;');
    const version = db.prepare('PRAGMA user_version').get().user_version;
    if (version > 1) throw new Error('This database needs a newer Curio server.');
    transaction(db, () => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS courses (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), content TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', ever_published INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1);
        CREATE TABLE IF NOT EXISTS progress (user_id TEXT PRIMARY KEY REFERENCES users(id), content TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS auth_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
      `);
      // Migrate databases created before revisions existed without replacing rows.
      if (!db.prepare('PRAGMA table_info(courses)').all().some(column => column.name === 'revision')) db.exec('ALTER TABLE courses ADD COLUMN revision INTEGER NOT NULL DEFAULT 1');
      db.exec(`CREATE INDEX IF NOT EXISTS sessions_expires ON sessions(expires);
        CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id, expires);
        CREATE INDEX IF NOT EXISTS courses_owner ON courses(owner_id, updated_at DESC);
        CREATE INDEX IF NOT EXISTS courses_status ON courses(status, updated_at DESC);
        CREATE INDEX IF NOT EXISTS auth_limits_expires ON auth_limits(expires);
        PRAGMA user_version = 1;`);
    });
    return db;
  } catch (error) { db.close(); throw error; }
}
