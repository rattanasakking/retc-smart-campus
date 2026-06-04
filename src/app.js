const express = require('express');
const cors    = require('cors');
const path    = require('path');
const session = require('express-session');
const passport = require('./config/passport');

const app = express();

// ─── CORS ────────────────────────────────────────────────────────────────────
// รองรับหลาย origin โดยแยกด้วย comma ใน ALLOWED_ORIGINS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // รับ request ที่ไม่มี origin (mobile apps, curl, Postman) และ origins ที่ whitelist ไว้
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);

// ─── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Session (ใช้เฉพาะ OAuth state verification) ──────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'retc-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 10 * 60 * 1000, // 10 นาที (พอสำหรับ OAuth flow)
  },
}));
app.use(passport.initialize());
app.use(passport.session());

// ─── Static files ────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/duty',      require('./routes/duty'));
app.use('/api/worklog',   require('./routes/worklog'));
app.use('/api/equipment', require('./routes/equipment'));
app.use('/api/helpdesk',   require('./routes/helpdesk'));
app.use('/api/room',       require('./routes/room'));
app.use('/api/lostfound',  require('./routes/lostfound'));
app.use('/api/settings',   require('./routes/settings'));
app.use('/api/report',     require('./routes/report'));

// ─── Health check (Plesk monitoring / uptime check) ──────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV || 'development', ts: new Date().toISOString() });
});

// ─── 404 for unknown API paths ────────────────────────────────────────────────
app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, message: 'ไม่พบ API endpoint นี้' });
});

// ─── Next.js ─────────────────────────────────────────────────────────────────
// ในโหมด production: serve static assets โดยตรง + proxy dynamic pages ไป standalone
// ในโหมด development: proxy ทั้งหมดไป next dev server (localhost:3000)
const { startNextServer, nextProxy } = require('./middleware/nextjs');

app.use('/_next/static', express.static(
  path.join(__dirname, '..', 'frontend', '.next', 'static')
));
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

if (process.env.NODE_ENV === 'production') {
  startNextServer();
}

app.get('*', (req, res) => nextProxy(req, res));

// ─── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${status}:`, err.message);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);
  res.status(status).json({ success: false, message: err.message || 'Internal Server Error' });
});

module.exports = app;
