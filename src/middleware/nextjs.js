const path = require('path');
const fs   = require('fs');
const { spawn } = require('child_process');
const http = require('http');

const NEXT_PORT = parseInt(process.env.NEXT_PORT || '3002', 10);
let nextStarted = false;

function startNextServer() {
  if (nextStarted) return;
  const serverPath = path.resolve(
    __dirname, '..', '..', 'frontend', '.next', 'standalone', 'server.js'
  );
  if (!fs.existsSync(serverPath)) {
    console.warn('[Next.js] Standalone build not found — run: npm run build:frontend');
    return;
  }
  nextStarted = true;
  const child = spawn(process.execPath, [serverPath], {
    env: { ...process.env, PORT: String(NEXT_PORT), HOSTNAME: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => process.stdout.write(`[Next.js] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[Next.js] ${d}`));
  child.on('error', (e) => { console.error('[Next.js] Spawn error:', e.message); nextStarted = false; });
  child.on('exit', (code) => { console.log('[Next.js] Exited:', code); nextStarted = false; });
  console.log(`[Next.js] Standalone started on port ${NEXT_PORT}`);
}

// Proxy a request to Next.js (production: standalone port, dev: 3000)
function proxyOnce(req, res, targetPort) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `127.0.0.1:${targetPort}` },
    };
    const proxyReq = http.request(options, (proxyRes) => {
      if (!res.headersSent) res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
      resolve();
    });
    proxyReq.on('error', reject);
    if (req.readable && !req.readableEnded) {
      req.pipe(proxyReq, { end: true });
    } else {
      proxyReq.end();
    }
  });
}

async function nextProxy(req, res) {
  const targetPort = process.env.NODE_ENV === 'production' ? NEXT_PORT : 3000;
  const maxRetries = 15;
  const delay = 1000; // 1 วินาที

  for (let i = 0; i < maxRetries; i++) {
    try {
      await proxyOnce(req, res, targetPort);
      return;
    } catch {
      if (i < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  // ถ้าครบ retry แล้วยังไม่ได้ → แสดงหน้า loading
  if (!res.headersSent) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  }
  res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="3">
<title>กำลังโหลด...</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f0f4ff}
.box{text-align:center;padding:40px;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08)}
h2{color:#1a2744;margin:0 0 8px}p{color:#64748b;margin:0 0 16px}
.spinner{width:40px;height:40px;border:4px solid #dce6f9;border-top-color:#1d6ae5;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px}
@keyframes spin{to{transform:rotate(360deg)}}</style></head>
<body><div class="box"><div class="spinner"></div>
<h2>ระบบกำลังเริ่มต้น</h2><p>กรุณารอสักครู่ หน้าจะรีเฟรชอัตโนมัติ...</p></div></body></html>`);
}

module.exports = { startNextServer, nextProxy };
