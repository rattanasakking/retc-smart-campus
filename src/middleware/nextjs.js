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
function nextProxy(req, res) {
  const targetPort =
    process.env.NODE_ENV === 'production' ? NEXT_PORT : 3000;

  const options = {
    hostname: '127.0.0.1',
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${targetPort}` },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', () => {
    if (!res.headersSent) res.writeHead(503, { 'Content-Type': 'text/plain' });
    res.end('Next.js server is starting, please refresh in a moment.');
  });

  if (req.readable) {
    req.pipe(proxyReq, { end: true });
  } else {
    proxyReq.end();
  }
}

module.exports = { startNextServer, nextProxy };
