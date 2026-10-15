import { randomBytes } from 'node:crypto';

export const problem = (status, message, code, extra = {}) => Object.assign(new Error(message), { status, code, ...extra });
export function requestId(res) {
  if (res.hasHeader('X-Request-Id')) return res.getHeader('X-Request-Id');
  const id = randomBytes(12).toString('hex');
  res.setHeader('X-Request-Id', id);
  return id;
}
export function send(res, status, value) {
  if (res.destroyed || res.writableEnded) return;
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(res.req.method === 'HEAD' ? undefined : JSON.stringify(value));
}
export async function readBody(req, { limit = 1024 * 1024, timeout = 15000 } = {}) {
  const tooLarge = () => problem(413, limit === 1024 * 1024 ? 'The file is too large. Use a course file smaller than 1 MB.' : 'Your learning data is too large to sync in one request.', 'BODY_TOO_LARGE');
  if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') { req.resume(); throw problem(415, 'Send JSON data.', 'JSON_REQUIRED'); }
  if (Number(req.headers['content-length']) > limit) { req.resume(); throw tooLarge(); }
  const chunks = await new Promise((resolve, reject) => {
    const parts = []; let size = 0;
    const cleanup = () => { clearTimeout(timer); req.off('data', receive); req.off('end', end); req.off('error', fail); req.off('aborted', abort); };
    const fail = error => { cleanup(); reject(error); };
    const abort = () => fail(problem(400, 'The upload was interrupted. Please try again.', 'UPLOAD_INTERRUPTED'));
    const end = () => { cleanup(); resolve(parts); };
    const receive = chunk => {
      size += chunk.length;
      if (size > limit) { fail(tooLarge()); req.resume(); } else parts.push(chunk);
    };
    const timer = setTimeout(() => { fail(problem(408, 'The upload took too long. Please try again.', 'UPLOAD_TIMEOUT')); req.resume(); }, timeout);
    timer.unref();
    req.on('data', receive); req.once('end', end); req.once('error', fail); req.once('aborted', abort);
    if (req.aborted) abort();
  });
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw problem(400, 'This is not valid JSON. Check the file and try again.', 'INVALID_JSON'); }
}
