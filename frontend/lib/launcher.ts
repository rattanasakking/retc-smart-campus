import { resizeSquareImage } from './image';

// หน้า "แอปทั้งหมด" — รวมทางเข้าโมดูลในระบบ + ลิงก์ระบบภายนอกที่ผู้ดูแลกำหนด

// ลำดับของ groups = ลำดับที่แสดงในหน้า /apps; id นี้แทนส่วน "ระบบในวิทยาลัย" (โมดูลในระบบ — ลบไม่ได้)
export const INTERNAL_GROUP_ID = '__internal';

export interface ExternalAppGroup { id: string; name: string; color: string }
export interface ExternalApp {
  id: string; name: string; desc: string; url: string;
  color: string; glyph: string; groupId: string | null;
  icon?: string;   // '/uploads/app-icons/...' — ว่าง = ใช้ตัวย่อ (glyph) บนพื้นสี
  roles: string[]; // ว่าง = ทุกบทบาทเห็น
}

// ไอคอนแอป: สี่เหลี่ยมจัตุรัส 128px PNG (คงพื้นโปร่งใส)
export const resizeIcon = (file: File) => resizeSquareImage(file, 128, 'image/png');
export interface ExternalAppsData { groups: ExternalAppGroup[]; apps: ExternalApp[] }

export const APP_ROLE_LABEL: Record<string, string> = {
  admin: 'ผู้ดูแลระบบ', executive: 'ผู้บริหาร', teacher: 'ครู/อาจารย์', staff: 'เจ้าหน้าที่',
};

// สี + คำอธิบายของโมดูลภายใน (key = href ใน MAIN_NAV)
export const INTERNAL_APP_META: Record<string, { color: string; bg: string; desc: string }> = {
  '/duty':              { color: '#1d6ae5', bg: '#eff4ff', desc: 'ตารางเวรและบันทึกเวรรับนักเรียน' },
  '/worklog':           { color: '#0d9068', bg: '#e6f9f0', desc: 'บันทึกและรายงานการปฏิบัติงาน' },
  '/equipment':         { color: '#1d6ae5', bg: '#e8f0fe', desc: 'ทะเบียนครุภัณฑ์ ยืม-คืน และ QR' },
  '/helpdesk':          { color: '#dc2626', bg: '#fef2f2', desc: 'แจ้งซ่อมและบำรุงรักษา (PM)' },
  '/room':              { color: '#b45309', bg: '#fffbeb', desc: 'จองห้องประชุมและอนุมัติการจอง' },
  '/lost-found/manage': { color: '#16a34a', bg: '#f0fdf4', desc: 'ประกาศและติดตามของหาย' },
  '/report':            { color: '#4a6080', bg: '#f1f5f9', desc: 'สรุปภาพรวมทุกระบบ' },
  '/personnel':         { color: '#0369a1', bg: '#e0f2fe', desc: 'ข้อมูลบุคลากรและโครงสร้างองค์กร' },
  '/directory':         { color: '#0e7490', bg: '#ecfeff', desc: 'ค้นหาเบอร์ติดต่อและหน่วยงาน' },
  '/leave':             { color: '#7e22ce', bg: '#f5f3ff', desc: 'ยื่นใบลาและติดตามการอนุมัติ' },
  '/certificate':       { color: '#c2410c', bg: '#fff7ed', desc: 'ออกและตรวจสอบเกียรติบัตร' },
};

// ─── ค่าส่วนตัวของผู้ใช้ (ปักหมุด/ซ่อน) — เก็บในเบราว์เซอร์ ───────────────────
// key ของแต่ละไทล์: 'in:<href>' สำหรับโมดูลภายใน, 'ex:<id>' สำหรับแอปภายนอก
export interface LauncherPrefs { pinned: string[]; hidden: string[] }

const PREFS_KEY = 'retc_launcher_prefs';

export function loadLauncherPrefs(): LauncherPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { pinned: Array.isArray(p.pinned) ? p.pinned : [], hidden: Array.isArray(p.hidden) ? p.hidden : [] };
    }
  } catch { /* */ }
  return { pinned: [], hidden: [] };
}

export function saveLauncherPrefs(p: LauncherPrefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* */ }
}

// ตัวย่อบนไทล์ เมื่อผู้ดูแลไม่ได้กำหนด glyph
export function glyphOf(name: string, glyph?: string) {
  if (glyph) return glyph;
  const words = name.trim().split(/[\s\-_.]+/).filter(Boolean);
  if (words.length >= 2 && /^[A-Za-z]/.test(words[0])) return (words[0][0] + words[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}
