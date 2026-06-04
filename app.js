require('dotenv').config();
const app = require('./src/app');

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = '0.0.0.0'; // ต้อง bind 0.0.0.0 สำหรับ Plesk

const server = app.listen(PORT, HOST, () => {
  console.log(`[${new Date().toISOString()}] RETC Smart Campus API`);
  console.log(`  → http://${HOST}:${PORT}`);
  console.log(`  → ENV: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown สำหรับ Plesk / PM2
const shutdown = (signal) => {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
  // Force exit หลัง 10 วินาที ถ้า connections ยังค้างอยู่
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

module.exports = app;
