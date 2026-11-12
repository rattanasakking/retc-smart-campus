const path = require('path');
const fs   = require('fs');

// บันทึกรูปโปรไฟล์จาก data URL → /uploads/avatars/...
// รับเฉพาะ PNG / JPG / WebP / GIF — ไม่รับ SVG/HTML ฯลฯ เพราะไฟล์ใน /uploads เปิดได้จากโดเมนเดียวกับระบบ
// (ไฟล์ที่ฝังสคริปต์จะกลายเป็นช่องโหว่ XSS) · นามสกุลไฟล์มาจากชนิดไฟล์ที่ตรวจแล้วเท่านั้น
const MIME_EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
const MAX_BYTES = 5 * 1024 * 1024;

class AvatarError extends Error {}

function saveAvatarImage(dataUrl) {
  const m = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(typeof dataUrl === 'string' ? dataUrl : '');
  const ext = m && MIME_EXT[m[1]];
  if (!ext) throw new AvatarError('รูปโปรไฟล์ต้องเป็นไฟล์ PNG, JPG, WebP หรือ GIF');
  const buffer = Buffer.from(m[2], 'base64');
  if (buffer.length > MAX_BYTES) throw new AvatarError('รูปโปรไฟล์ต้องไม่เกิน 5 MB');

  const name = `avatar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const dir  = path.join(__dirname, '..', '..', 'uploads', 'avatars');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), buffer);
  return `/uploads/avatars/${name}`;
}

module.exports = { saveAvatarImage, AvatarError };
