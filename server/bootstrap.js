import { chownSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Railway mounts fresh volumes as root. Give Node ownership before dropping
// privileges; HTTP requests and SQLite always run as the unprivileged user.
if (process.getuid?.() === 0) {
  const directory = resolve(process.env.CURIO_DATA_DIR || '/data');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chownSync(directory, 1000, 1000);
  process.setgid(1000);
  process.setuid(1000);
}
await import('./index.js');
