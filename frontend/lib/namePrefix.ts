// คำนำหน้าชื่อ — เก็บรวมอยู่ใน name (เช่น "นายสมชาย ใจดี") ตามรูปแบบเขียนภาษาไทย ไม่มีเว้นวรรค
// ฟอร์มแยกเป็น dropdown + ช่องชื่อ แล้วรวมกลับตอนบันทึก — ส่วนอื่นของระบบที่แสดง name จึงไม่ต้องแก้

export const NAME_PREFIXES = ['นาย', 'นาง', 'นางสาว'] as const;

// ตรวจ "นางสาว" ก่อน "นาง" เพราะขึ้นต้นเหมือนกัน
const DETECT_ORDER = ['นางสาว', 'นาง', 'นาย'];

export function splitNamePrefix(full: string): { prefix: string; rest: string } {
  const s = (full ?? '').trim();
  for (const p of DETECT_ORDER) {
    if (s.startsWith(p) && s.length > p.length) return { prefix: p, rest: s.slice(p.length).trim() };
  }
  return { prefix: '', rest: s };
}

export function joinNamePrefix(prefix: string, rest: string): string {
  const r = rest.trim();
  return prefix ? `${prefix}${r}` : r;
}

// ─── ชื่อ / นามสกุล ──────────────────────────────────────────────────────────
// name เก็บเป็นข้อความเดียว "คำนำหน้า+ชื่อ นามสกุล" — ฟอร์มแยกช่องแล้วรวมกลับด้วยเว้นวรรค 1 ช่อง
// แยกที่ช่องว่างแรก: ก่อนหน้า = ชื่อ, ที่เหลือทั้งหมด = นามสกุล

export function splitFirstLast(rest: string): { first: string; last: string } {
  const s = (rest ?? '').trim().replace(/\s+/g, ' ');
  const i = s.indexOf(' ');
  return i < 0 ? { first: s, last: '' } : { first: s.slice(0, i), last: s.slice(i + 1) };
}

// แยกชื่อเต็มเป็น 3 ส่วนสำหรับฟอร์ม
export function splitFullName(full: string): { prefix: string; first: string; last: string } {
  const { prefix, rest } = splitNamePrefix(full);
  return { prefix, ...splitFirstLast(rest) };
}

// รวม 3 ช่องจากฟอร์มกลับเป็น name ที่บันทึก
export function fullNameFromForm(prefix: string, first: string, last: string): string {
  const firstLast = [first.trim(), last.trim()].filter(Boolean).join(' ');
  return nameFromForm(prefix, firstLast);
}

// รวมค่าจากฟอร์ม (dropdown + ช่องชื่อ) เป็น name ที่บันทึก
// ถ้าเลือกคำนำหน้าแล้วยังพิมพ์คำนำหน้าซ้ำในช่องชื่อ (เช่น "นายสมชาย") → ตัดออก ไม่ให้เป็น "นายนายสมชาย"
// ไม่เลือกคำนำหน้า → ใช้ตามที่พิมพ์
export function nameFromForm(prefix: string, typed: string): string {
  if (!prefix) return typed.trim();
  const t = splitNamePrefix(typed);
  return joinNamePrefix(prefix, t.prefix ? t.rest : typed);
}
