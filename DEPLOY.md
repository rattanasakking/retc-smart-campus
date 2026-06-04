# วิธี Deploy บน Plesk

## 1. Upload ไฟล์

อัปโหลดทั้ง project ผ่าน File Manager หรือ Git
ยกเว้น: `node_modules/`, `frontend/node_modules/`, `uploads/`, `.env`

## 2. ตั้งค่า Plesk Node.js

| ค่า | ตัวอย่าง |
|-----|---------|
| Application Root | `/retc-smart-campus` |
| Startup File | `app.js` |
| Document Root | `/retc-smart-campus/public` |
| Node.js Version | `>= 18` |
| Mode | `production` |

## 3. Environment Variables (ใส่ใน Plesk → Node.js → Environment Variables)

```
DATABASE_URL=mysql://retc_apps:Retc@101101!@localhost/retc_apps
JWT_SECRET=retc-secret-key-2568
JWT_EXPIRE=7d
SESSION_SECRET=retc-session-2568
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://app.retc.ac.th
ALLOWED_ORIGINS=https://app.retc.ac.th

LINE_CLIENT_ID=2010231836
LINE_CLIENT_SECRET=[ดู LINE Developers Console]
LINE_CALLBACK_URL=https://app.retc.ac.th/api/auth/line/callback

GOOGLE_CLIENT_ID=[ดู Google Cloud Console]
GOOGLE_CLIENT_SECRET=[ดู Google Cloud Console]
GOOGLE_CALLBACK_URL=https://app.retc.ac.th/api/auth/google/callback

LINE_NOTIFY_TOKEN=
NEXT_PORT=3002
```

## 4. Run Commands (ใน Plesk → "Run Node.js commands" หรือ SSH)

```bash
# ติดตั้ง dependencies และ generate Prisma client
npm install

# Build Next.js frontend
npm run build:frontend

# Copy static assets ไปยัง standalone (ทำหลัง build เสมอ)
cp -r frontend/.next/static frontend/.next/standalone/.next/static
cp -r frontend/public frontend/.next/standalone/public

# Apply database migrations
npm run deploy:migrate

# Seed ข้อมูลเริ่มต้น (ครั้งแรกเท่านั้น)
node prisma/seed.js
```

## 5. สร้าง uploads/ folders

```bash
mkdir -p uploads/logo uploads/duty uploads/worklog
mkdir -p uploads/equipment uploads/helpdesk uploads/lostfound uploads/avatars
```

## 6. Restart Node.js

กด **Restart** ใน Plesk → Node.js

## 7. ตรวจสอบ

เข้า `https://app.retc.ac.th/api/health` ควรได้:
```json
{"status":"ok","env":"production","ts":"..."}
```

---

## LINE Developers — Callback URL ที่ต้องเพิ่ม

- `https://app.retc.ac.th/api/auth/line/callback`

## Google Cloud Console — Authorized redirect URIs

- `https://app.retc.ac.th/api/auth/google/callback`

---

## Troubleshooting

| ปัญหา | แนวทางแก้ |
|-------|----------|
| OAuth ไม่ทำงาน | ตรวจสอบ Callback URL ใน LINE/Google console ตรงกับ env |
| Next.js ไม่ขึ้น | รัน `npm run build:frontend` และ copy static/public ก่อน restart |
| DB connection failed | ตรวจสอบ `DATABASE_URL` และ allow remote connection ใน MySQL |
| Session error | ตรวจสอบ `SESSION_SECRET` ใน env |
