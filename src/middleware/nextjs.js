const path = require('path');
const http = require('http');

const frontendDir = path.resolve(__dirname, '..', '..', 'frontend');
const DEV_PORT = parseInt(process.env.NEXT_DEV_PORT || '3000', 10);

// ── Production: รัน Next แบบ in-process (ไม่ spawn เซิร์ฟเวอร์แยก/ไม่จับ port) ──
// เหมาะกับ Plesk Passenger ที่ restart แอปบ่อย — ไม่มี cold-start วนซ้ำ / ไม่มี orphan จับ port
let handle = null;
let nextReady = false;
let preparing = false;

async function initNext() {
  if (nextReady || preparing) return;
  preparing = true;
  try {
    // require next จาก frontend/node_modules (ไม่ได้อยู่ใน node_modules ของ backend)
    const next = require(path.join(frontendDir, 'node_modules', 'next'));
    const app  = next({ dev: false, dir: frontendDir });
    await app.prepare();
    handle = app.getRequestHandler();
    nextReady = true;
    preparing = false;
    console.log('[Next.js] in-process handler ready ✓');
  } catch (e) {
    preparing = false;
    console.error('[Next.js] init error:', e.message);
    setTimeout(initNext, 4000); // ลองใหม่ถ้าเตรียมไม่สำเร็จ
  }
}

function startNextServer() {
  if (process.env.NODE_ENV === 'production') initNext();
}

// ── Dev: proxy ไป next dev (localhost:3000) ตามเดิม ──
function proxyToDev(req, res) {
  const opts = {
    hostname: '127.0.0.1', port: DEV_PORT, path: req.url, method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${DEV_PORT}` }, timeout: 30000,
  };
  const pr = http.request(opts, (proxyRes) => {
    if (!res.headersSent) res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  pr.on('error', () => { if (!res.headersSent) { res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('dev server ยังไม่พร้อม (รัน next dev ที่ port 3000)'); } });
  pr.on('timeout', () => { pr.destroy(); });
  if (req.readable && !req.readableEnded) req.pipe(pr, { end: true }); else pr.end();
}

function sendLoadingPage(res) {
  if (res.headersSent) return;
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html><html><head><meta charset="utf-8">
<meta http-equiv="refresh" content="3">
<title>กำลังโหลดระบบ...</title>
<style>*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Sarabun',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(135deg,#e8f0ff,#f0f4ff)}
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

function nextProxy(req, res) {
  if (process.env.NODE_ENV !== 'production') return proxyToDev(req, res);
  if (handle) return handle(req, res);
  // ยังเตรียม Next ไม่เสร็จ (ช่วงเริ่มระบบไม่กี่วินาที) → แสดงหน้าโหลดแล้วรีเฟรชเอง
  if (!preparing) initNext();
  sendLoadingPage(res);
}

module.exports = { startNextServer, nextProxy };
