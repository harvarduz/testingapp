import { scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { transaction } from './database.js';
import { problem } from './http.js';
const derive = promisify(scrypt);

export function passwordHasher(concurrency = 4) {
  let active = 0;
  return async (password, salt) => {
    if (active >= concurrency) throw problem(503, 'Sign-in is busy. Please try again shortly.', 'AUTH_BUSY', { retryAfter: 1 });
    active++;
    try { return await derive(password, salt, 64); }
    finally { active--; }
  };
}

export function authLimiter(db, { windowMs = 600000, ipLimit = 300, accountLimit = 20 } = {}) {
  return (key, account = false) => transaction(db, () => {
    const now = Date.now();
    db.prepare('DELETE FROM auth_limits WHERE expires <= ?').run(now);
    const entry = db.prepare('SELECT count, expires FROM auth_limits WHERE key = ?').get(key);
    const limit = account ? accountLimit : ipLimit;
    if (entry && entry.count >= limit) return Math.max(1, Math.ceil((entry.expires - now) / 1000));
    db.prepare('INSERT INTO auth_limits VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1').run(key, now + windowMs);
    return null;
  });
}
