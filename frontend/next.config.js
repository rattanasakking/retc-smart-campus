/** @type {import('next').NextConfig} */
const nextConfig = {
  // รัน Next แบบ in-process ผ่าน custom server (src/middleware/nextjs.js) — ไม่ใช้ standalone
  images: {
    domains: ['app.retc.ac.th', 'localhost'],
    unoptimized: true,
  },
  async rewrites() {
    const backend = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [
      { source: '/api/:path*',     destination: `${backend}/api/:path*` },
      { source: '/uploads/:path*', destination: `${backend}/uploads/:path*` },
    ];
  },
};

module.exports = nextConfig;
