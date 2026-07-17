import {
  LayoutDashboard, CalendarCheck, ClipboardList, Monitor, Wrench, DoorOpen,
  PackageSearch, BarChart3, Users, Contact, CalendarX, Award,
} from 'lucide-react';

export interface MainNavItem {
  href: string;
  label: string;
  Icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  badge?: boolean;
  module?: string;
  modules?: string[];
  adminOnly?: boolean;
  extraMatch?: string;
}

// เมนูหลัก (ลำดับเริ่มต้น) — ใช้ร่วมกันระหว่าง Sidebar และหน้าตั้งค่าเมนู
export const MAIN_NAV: MainNavItem[] = [
  { href: '/dashboard',         label: 'หน้าหลัก',          Icon: LayoutDashboard },
  { href: '/duty',              label: 'เวรรับนักเรียน',    Icon: CalendarCheck,   module: 'DUTY'         },
  { href: '/worklog',           label: 'บันทึกปฏิบัติงาน', Icon: ClipboardList,   module: 'WORK_LOG'     },
  { href: '/equipment',         label: 'ครุภัณฑ์',           Icon: Monitor,         module: 'EQUIPMENT'    },
  { href: '/helpdesk',          label: 'แจ้งซ่อม',           Icon: Wrench,          module: 'HELPDESK',    badge: true },
  { href: '/room',              label: 'จองห้องประชุม',      Icon: DoorOpen,        module: 'ROOM_BOOKING' },
  { href: '/lost-found/manage', label: 'ของหาย',             Icon: PackageSearch,   module: 'LOST_FOUND'   },
  { href: '/report',            label: 'รายงานภาพรวม',       Icon: BarChart3,       adminOnly: true        },
  { href: '/personnel',         label: 'บุคลากร',             Icon: Users,           module: 'PERSONNEL'    },
  { href: '/directory',         label: 'ทำเนียบบุคลากร',      Icon: Contact                                 },
  { href: '/leave',             label: 'ระบบการลา',           Icon: CalendarX,       module: 'LEAVE'        },
  { href: '/certificate',       label: 'เกียรติบัตร',         Icon: Award,           module: 'CERTIFICATE'  },
];

export interface MenuOrderCfg { href: string; visible: boolean }

// จัดเรียง MAIN_NAV ตามลำดับที่บันทึกไว้ + ตัดรายการที่ถูกซ่อน; รายการใหม่ที่ยังไม่มีในค่าที่บันทึกไว้จะต่อท้าย
export function applyMenuOrder(config: MenuOrderCfg[] | null): MainNavItem[] {
  if (!config || config.length === 0) return MAIN_NAV;
  const byHref = new Map(MAIN_NAV.map((n) => [n.href, n]));
  const seen = new Set<string>();
  const ordered: MainNavItem[] = [];
  for (const c of config) {
    const item = byHref.get(c.href);
    if (item && c.visible !== false) { ordered.push(item); }
    seen.add(c.href);
  }
  // รายการใหม่ที่ยังไม่เคยตั้งค่า → ต่อท้าย (แสดงไว้ก่อน)
  for (const n of MAIN_NAV) if (!seen.has(n.href)) ordered.push(n);
  return ordered;
}
