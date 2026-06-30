const path    = require('path');
const { spawn } = require('child_process');
const http    = require('http');

const NEXT_PORT = parseInt(process.env.NEXT_PORT || '3002', 10);
let nextStarted = false;
let nextReady   = false;  // true เมื่อ port เปิดรับ connection แล้ว

function startNextServer() {
  if (nextStarted) return;
  nextStarted = true;

  // ใช้ next start แทน standalone (รองรับทุก OS)
  const frontendDir = path.resolve(__dirname, '..', '..', 'frontend');
  const nextBin     = path.join(frontendDir, 'node_modules', '.bin', 'next');

  const child = spawn(nextBin, ['start', '--port', String(NEXT_PORT), '--hostname', '127.0.0.1'], {
    cwd: frontendDir,
    env: { ...process.env, PORT: String(NEXT_PORT), HOSTNAME: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (d) => {
    const text = d.toString();
    process.stdout.write(`[Next.js] ${text}`);
    if (text.includes('Ready') || text.includes('started') || text.includes('listening')) {
      nextReady = true;
      console.log(`[Next.js] Ready on port ${NEXT_PORT}`);
    }
  });
  child.stderr.on('data', (d) => process.stderr.write(`[Next.js] ${d}`));
  child.on('error', (e) => { console.error('[Next.js] Spawn error:', e.message); nextStarted = false; nextReady = false; });
  child.on('exit', (code) => { console.log('[Next.js] Exited:', code); nextStarted = false; nextReady = false; });

  // poll port จนพร้อม (ไม่รอ stdout message ซึ่งอาจไม่แน่นอน)
  pollReady();
}

function pollReady() {
  if (nextReady) return;
  http.get({ hostname: '127.0.0.1', port: NEXT_PORT, path: '/', timeout: 1000 }, () => {
    nextReady = true;
    console.log(`[Next.js] Port ${NEXT_PORT} is ready`);
  }).on('error', () => {
    setTimeout(pollReady, 1500);
  });
}

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

function sendLoadingPage(res) {
  if (res.headersSent) return;
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html><html><head><meta charset="utf-8">
<meta http-equiv="refresh" content="4">
<title>กำลังโหลดระบบ...</title>
<style>*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Sarabun',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(135deg,#e8f0ff 0%,#f0f4ff 100%)}
.card{background:#fff;border-radius:20px;padding:48px 40px;text-align:center;box-shadow:0 8px 40px rgba(29,106,229,.12);max-width:360px;width:90%}
.spinner{width:48px;height:48px;border:5px solid #dce6f9;border-top-color:#1d6ae5;border-radius:50%;animation:spin .9s linear infinite;margin:0 auto 24px}
h2{color:#1a2744;font-size:20px;font-weight:700;margin-bottom:8px}
p{color:#64748b;font-size:14px;line-height:1.6}
.dot{display:inline-block;animation:blink 1.4s infinite both}
.dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes blink{0%,80%,100%{opacity:0}40%{opacity:1}}</style></head>
<body><div class="card">
<div class="spinner"></div>
<h2>ระบบกำลังเริ่มต้น</h2>
<p>กรุณารอสักครู่<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span><br>หน้าจะรีเฟรชอัตโนมัติ</p>
</div></body></html>`);
}

async function nextProxy(req, res) {
  const targetPort = process.env.NODE_ENV === 'production' ? NEXT_PORT : 3000;

  // ถ้ายังไม่พร้อม → แสดง loading ทันที (ไม่รอ)
  if (!nextReady && process.env.NODE_ENV === 'production') {
    sendLoadingPage(res);
    return;
  }

  try {
    await proxyOnce(req, res, targetPort);
  } catch {
    nextReady = false; // mark ว่าไม่พร้อม ให้ poll ใหม่
    pollReady();
    sendLoadingPage(res);
  }
}

module.exports = { startNextServer, nextProxy };
