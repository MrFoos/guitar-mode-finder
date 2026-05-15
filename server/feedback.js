const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT         = 3001;
const LOG_FILE     = '/var/log/gmf-feedback/feedback.jsonl';
const ALLOWED_ORIGIN = 'https://guitarmodefinder.com';
const MAX_BODY     = 10_000;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method !== 'POST' || req.url !== '/') {
    res.writeHead(404); res.end(); return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > MAX_BODY) { req.destroy(); }
  });

  req.on('end', () => {
    let data;
    try { data = JSON.parse(body); } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'invalid json' }));
      return;
    }

    const message = String(data.message || '').trim().slice(0, 2000);
    if (!message) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'message required' }));
      return;
    }

    const entry = JSON.stringify({
      ts:      new Date().toISOString(),
      type:    String(data.type    || '').slice(0, 50),
      message,
      email:   String(data.email   || '').slice(0, 200),
      ip:      req.headers['x-real-ip'] || req.socket.remoteAddress,
    });

    try {
      fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
      fs.appendFileSync(LOG_FILE, entry + '\n');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      console.error('Failed to write feedback:', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'server error' }));
      return;
    }

    notify(JSON.parse(entry)).catch(e => console.error('Resend error:', e.message));
  });
});

async function notify(entry) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const typeLabel = entry.type || 'general';
  const replyLine = entry.email ? `Reply-to: ${entry.email}` : 'No reply address given';
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'feedback@guitarmodefinder.com',
      to:   'gardenhagen@gmail.com',
      subject: `[GMF] New feedback: ${typeLabel}`,
      text: [
        `Type:    ${typeLabel}`,
        `Message: ${entry.message}`,
        replyLine,
        `Time:    ${entry.ts}`,
      ].join('\n'),
    }),
  });
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`gmf-feedback listening on 127.0.0.1:${PORT}`);
});
