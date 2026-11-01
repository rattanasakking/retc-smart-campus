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

// รวมค่าจากฟอร์ม (dropdown + ช่องชื่อ) เป็น name ที่บันทึก
// ถ้าเลือกคำนำหน้าแล้วยังพิมพ์คำนำหน้าซ้ำในช่องชื่อ (เช่น "นายสมชาย") → ตัดออก ไม่ให้เป็น "นายนายสมชาย"
// ไม่เลือกคำนำหน้า → ใช้ตามที่พิมพ์
export function nameFromForm(prefix: string, typed: string): string {
  if (!prefix) return typed.trim();
  const t = splitNamePrefix(typed);
  return joinNamePrefix(prefix, t.prefix ? t.rest : typed);
}
