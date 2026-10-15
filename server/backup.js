import { DatabaseSync, backup } from 'node:sqlite';
import { chmodSync, existsSync, linkSync, mkdirSync, openSync, closeSync, fsyncSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export function inspectDatabase(filename) {
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    const integrity = db.prepare('PRAGMA integrity_check').all();
    if (integrity.length !== 1 || Object.values(integrity[0])[0] !== 'ok') throw new Error('Database integrity check failed.');
    if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Database foreign-key check failed.');
    // Reject an empty/wrong SQLite file as well as physically corrupt backups.
    for (const table of ['users', 'sessions', 'courses', 'progress']) db.prepare(`SELECT 1 FROM ${table} LIMIT 1`).get();
    return { integrity: 'ok', schemaVersion: db.prepare('PRAGMA user_version').get().user_version };
  } finally { db.close(); }
}

export async function backupDatabase(source, destination) {
  const input = resolve(source), output = resolve(destination);
  for (const directory of ['dist', 'public']) {
    const web = resolve(directory);
    if (output === web || output.startsWith(web + '/')) throw new Error('Keep database backups outside public web directories.');
  }
  if (!existsSync(input)) throw new Error('The source database does not exist.');
  if (input === output || existsSync(output)) throw new Error('Choose a new backup filename; existing files are never overwritten.');
  mkdirSync(dirname(output), { recursive: true, mode: 0o700 });
  const temporary = `${output}.${randomBytes(8).toString('hex')}.partial`;
  const fd = openSync(temporary, 'wx', 0o600); closeSync(fd);
  let db;
  try {
    db = new DatabaseSync(input, { readOnly: true });
    // SQLite's online backup includes committed WAL data without copying a
    // live database file underneath a writer.
    await backup(db, temporary);
    const report = inspectDatabase(temporary);
    chmodSync(temporary, 0o600);
    const saved = openSync(temporary, 'r'); try { fsyncSync(saved); } finally { closeSync(saved); }
    linkSync(temporary, output); // Atomic publication, fails if output appeared.
    return report;
  } finally {
    db?.close();
    for (const file of [temporary, temporary + '-wal', temporary + '-shm']) {
      try { unlinkSync(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [destination] = process.argv.slice(2);
  if (!destination) { console.error('Usage: npm run db:backup -- /private/path/new-backup.sqlite'); process.exitCode = 1; }
  else {
    const source = resolve(process.env.CURIO_DATA_DIR || '.data', 'curio.sqlite');
    try { console.log(JSON.stringify({ backup: 'verified', ...await backupDatabase(source, destination) })); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
