const path = require('path');
const fs   = require('fs');

// ตัวช่วยกลางสำหรับบันทึกไฟล์ที่ส่งมาเป็น data URL (base64) → /uploads/<folder>/...
//
// ทำไมต้องตรวจ: ไฟล์ใน /uploads เปิดได้จากโดเมนเดียวกับระบบ ถ้ายอมให้บันทึก .html / .svg
// ไฟล์นั้นจะรันสคริปต์ในชื่อเว็บเราได้ (stored XSS) — จึง
//   1) รับเฉพาะชนิดไฟล์ที่อนุญาต และตั้งนามสกุลจากชนิดที่ตรวจแล้วเท่านั้น (ไม่ใช้ชื่อไฟล์จากผู้ใช้)
//   2) ตรวจ "ลายเซ็น" ต้นไฟล์ (magic bytes) ว่าตรงกับชนิดที่อ้างจริง
//   3) จำกัดขนาด
const TYPES = {
  'image/png':       { ext: 'png',  magic: (b) => b.length > 8 && b.readUInt32BE(0) === 0x89504e47 },
  'image/jpeg':      { ext: 'jpg',  magic: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/webp':      { ext: 'webp', magic: (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
  'image/gif':       { ext: 'gif',  magic: (b) => b.length > 6 && b.toString('ascii', 0, 4) === 'GIF8' },
  'application/pdf': { ext: 'pdf',  magic: (b) => b.length > 5 && b.toString('ascii', 0, 5) === '%PDF-' },
};
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const IMAGE_OR_PDF = [...IMAGE_TYPES, 'application/pdf'];

// status 400 → ตัวจัดการ error กลาง (app.js) ตอบ 400 พร้อมข้อความนี้ให้เอง
class UploadError extends Error {
  constructor(message) { super(message); this.status = 400; }
}

const isDataUrl = (v) => typeof v === 'string' && v.startsWith('data:');

/**
 * บันทึก data URL ลง uploads/<folder>/ แล้วคืน URL (/uploads/<folder>/<name>)
 * @param {string} dataUrl  'data:image/png;base64,...'
 * @param {object} opt
 * @param {string} opt.folder   โฟลเดอร์ย่อยใน uploads (เช่น 'rooms')
 * @param {string} opt.prefix   คำนำหน้าชื่อไฟล์ (เช่น 'room')
 * @param {string[]} [opt.types=IMAGE_TYPES]  ชนิดไฟล์ที่ยอมรับ
 * @param {number} [opt.maxMB=8]  (body ของ request จำกัด 10 MB อยู่แล้ว — base64 ≈ 7.5 MB ไฟล์จริง)
 * @param {string} [opt.label='รูปภาพ']  ใช้ในข้อความแจ้งผู้ใช้
 */
function saveDataUrl(dataUrl, { folder, prefix, types = IMAGE_TYPES, maxMB = 8, label = 'รูปภาพ' }) {
  const m = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(typeof dataUrl === 'string' ? dataUrl : '');
  const mime = m && m[1].toLowerCase();
  const allowed = mime && types.includes(mime) && TYPES[mime];
  if (!allowed) throw new UploadError(`${label}ต้องเป็นไฟล์ ${types.map((t) => TYPES[t].ext.toUpperCase()).join(', ')}`);

  const buffer = Buffer.from(m[2], 'base64');
  if (buffer.length > maxMB * 1024 * 1024) throw new UploadError(`${label}ต้องมีขนาดไม่เกิน ${maxMB} MB`);
  if (!allowed.magic(buffer)) throw new UploadError(`${label}ไม่ใช่ไฟล์ ${allowed.ext.toUpperCase()} ที่ถูกต้อง`);

  const name = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${allowed.ext}`;
  const dir  = path.join(__dirname, '..', '..', 'uploads', folder);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), buffer);
  return `/uploads/${folder}/${name}`;
}

module.exports = { saveDataUrl, isDataUrl, UploadError, IMAGE_TYPES, IMAGE_OR_PDF };
