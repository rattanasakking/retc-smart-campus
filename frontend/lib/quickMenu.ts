import {
  Monitor, Wrench, CalendarCheck2, ArrowLeftRight,
  DoorOpen, CalendarCheck, PackageSearch, HeadphonesIcon,
  Users, CalendarX,
} from 'lucide-react';

export interface QuickMenuItem {
  key:     string;
  href:    string;
  label:   string;
  Icon:    React.FC<{ className?: string; style?: React.CSSProperties }>;
  color:   string;
  bg:      string;
  module?: string;
}

export const ALL_QUICK_ITEMS: QuickMenuItem[] = [
  { key: 'equipment',    href: '/equipment',         label: 'ครุภัณฑ์',        Icon: Monitor,          color: '#1d6ae5', bg: '#eff4ff', module: 'EQUIPMENT'    },
  { key: 'repair',       href: '/helpdesk/new',       label: 'แจ้งซ่อม',        Icon: Wrench,           color: '#dc2626', bg: '#fef2f2', module: 'HELPDESK'     },
  { key: 'pm',           href: '/helpdesk/pm',         label: 'PM บำรุงรักษา',  Icon: CalendarCheck2,   color: '#7c3aed', bg: '#f3e8ff', module: 'HELPDESK'     },
  { key: 'borrow',       href: '/equipment/borrows',   label: 'ยืม-คืน',        Icon: ArrowLeftRight,   color: '#0d9068', bg: '#e6f9f0', module: 'EQUIPMENT'    },
  { key: 'room',         href: '/room',                label: 'จองห้องประชุม',  Icon: DoorOpen,         color: '#b45309', bg: '#fffbeb', module: 'ROOM_BOOKING' },
  { key: 'duty',         href: '/duty',                label: 'เวรรับนักเรียน', Icon: CalendarCheck,    color: '#1d6ae5', bg: '#eff4ff', module: 'DUTY'         },
  { key: 'lost',         href: '/lost-found',          label: 'ของหาย',          Icon: PackageSearch,    color: '#16a34a', bg: '#f0fdf4', module: 'LOST_FOUND'  },
  { key: 'helpdesk',     href: '/helpdesk',             label: 'Helpdesk',         Icon: HeadphonesIcon,   color: '#4a6080', bg: '#f5f8ff', module: 'HELPDESK'    },
  { key: 'personnel',    href: '/personnel',            label: 'บุคลากร',          Icon: Users,            color: '#0369a1', bg: '#e0f2fe', module: 'PERSONNEL'   },
  { key: 'leave',        href: '/leave',                label: 'ระบบการลา',       Icon: CalendarX,        color: '#7e22ce', bg: '#f5f3ff', module: 'LEAVE'        },
];

const STORAGE_KEY = 'retc_quick_menu';

export interface QuickMenuConfig { key: string; visible: boolean }

export function loadQuickMenuConfig(): QuickMenuConfig[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as QuickMenuConfig[];
  } catch { /* */ }
  // default: first 8 items visible
  return ALL_QUICK_ITEMS.map((item, i) => ({ key: item.key, visible: i < 8 }));
}

export function saveQuickMenuConfig(config: QuickMenuConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function getVisibleItems(config: QuickMenuConfig[], allowedModules: string[] | null): QuickMenuItem[] {
  const map = new Map(config.map((c) => [c.key, c.visible]));
  return ALL_QUICK_ITEMS
    .filter((item) => {
      const visibleInConfig = map.get(item.key) !== false; // default visible
      const allowedByModule = !item.module || !allowedModules || allowedModules.includes(item.module);
      return visibleInConfig && allowedByModule;
    })
    .sort((a, b) => {
      const ai = config.findIndex((c) => c.key === a.key);
      const bi = config.findIndex((c) => c.key === b.key);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
}
