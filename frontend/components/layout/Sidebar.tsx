'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, CalendarCheck, ClipboardList, Monitor,
  Wrench, DoorOpen, PackageSearch, BarChart3, Car, CalendarDays, Megaphone,
  Lock, ChevronRight, Settings, Users, CalendarX, LogOut,
} from 'lucide-react';
import { TOKEN_KEY, USER_KEY } from '@/lib/api';

interface StoredUser {
  name: string; role: string; employeeId?: string; isSuperAdmin?: boolean; avatar?: string;
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'ผู้ดูแลระบบ', executive: 'ผู้บริหาร', teacher: 'ครู/อาจารย์', staff: 'เจ้าหน้าที่',
};
const ROLE_COLOR: Record<string, string> = {
  admin: 'bg-[#7c3aed]', executive: 'bg-[#dc2626]', teacher: 'bg-[#1d6ae5]', staff: 'bg-[#0d9068]',
};

const NAV_PHASE1: {
  href: string; label: string; Icon: React.FC<{className?: string}>;
  badge?: boolean; module?: string; modules?: string[]; adminOnly?: boolean; extraMatch?: string;
}[] = [
  { href: '/dashboard', label: 'หน้าหลัก',          Icon: LayoutDashboard },
  { href: '/duty',      label: 'เวรรับนักเรียน',    Icon: CalendarCheck,   module: 'DUTY'         },
  { href: '/worklog',   label: 'บันทึกปฏิบัติงาน', Icon: ClipboardList,   module: 'WORK_LOG'     },
  { href: '/equipment', label: 'ครุภัณฑ์',           Icon: Monitor,         module: 'EQUIPMENT'    },
  { href: '/helpdesk',  label: 'แจ้งซ่อม',           Icon: Wrench,          module: 'HELPDESK',    badge: true },
  { href: '/room',      label: 'จองห้องประชุม',      Icon: DoorOpen,        module: 'ROOM_BOOKING' },
  { href: '/lost-found/manage', label: 'ของหาย',     Icon: PackageSearch,   module: 'LOST_FOUND'   },
  { href: '/report',    label: 'รายงานภาพรวม',       Icon: BarChart3,       adminOnly: true        },
  { href: '/personnel', label: 'บุคลากร',             Icon: Users,           module: 'PERSONNEL'    },
  { href: '/leave',     label: 'ระบบการลา',           Icon: CalendarX,       module: 'LEAVE'        },
];

const NAV_PHASE2 = [
  { label: 'จองรถราชการ',    Icon: Car         },
  { label: 'ปฏิทินกิจกรรม', Icon: CalendarDays },
  { label: 'ประกาศข่าวสาร', Icon: Megaphone    },
];

interface SidebarProps { onClose?: () => void }

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser]                   = useState<StoredUser | null>(null);
  const [pendingRepairs, setPendingRepairs] = useState(0);
  const [allowedModules, setAllowedModules] = useState<string[] | null>(null);
  const [logoUrl, setLogoUrl]             = useState<string | null>(null);
  const [schoolName, setSchoolName]       = useState('Smart Campus');

  useEffect(() => {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) { try { setUser(JSON.parse(stored)); } catch { /* */ } }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    Promise.all([
      fetch('/api/settings/logo').then(r => r.json()).catch(() => ({})),
      fetch('/api/dashboard/summary', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/auth/my-modules',   { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([logo, summary, modules]) => {
      if (logo?.success) { setLogoUrl(logo.data?.logo_url ?? null); setSchoolName(logo.data?.school_name ?? 'Smart Campus'); }
      if (summary.success) setPendingRepairs(summary.data?.kpi?.pendingRepairs ?? 0);
      if (modules.success) setAllowedModules(modules.data?.modules ?? []);
      else setAllowedModules([]);
    }).catch(() => {
      setAllowedModules(NAV_PHASE1.map(n => n.module).filter((m): m is string => m !== undefined));
    });
  }, []);

  const canSeeItem = (item: typeof NAV_PHASE1[0]) => {
    if (!item.module && !item.modules && !item.adminOnly) return true;
    if (allowedModules === null) return true;
    if (item.adminOnly) {
      return user?.isSuperAdmin || user?.role === 'admin' || user?.role === 'executive';
    }
    if (item.modules) return item.modules.some((m) => allowedModules.includes(m));
    return item.module ? allowedModules.includes(item.module) : true;
  };

  function navItemStyle(active: boolean) {
    return {
      backgroundColor: active ? '#2979ff' : 'transparent',
      color: active ? '#ffffff' : 'rgba(255,255,255,0.55)',
    };
  }

  function navItemHover(e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, active: boolean) {
    if (!active) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)';
  }
  function navItemLeave(e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, active: boolean) {
    if (!active) e.currentTarget.style.backgroundColor = 'transparent';
  }

  return (
    <aside className="w-[220px] flex flex-col flex-shrink-0 h-full relative"
           style={{ backgroundColor: '#0f1e3c' }}>

      {/* Mobile close button */}
      {onClose && (
        <button onClick={onClose}
          className="md:hidden absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center z-10"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <ChevronRight className="w-4 h-4 text-white rotate-180" />
        </button>
      )}

      {/* Logo */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <img src={logoUrl} alt="logo" className="w-9 h-9 rounded-lg object-contain flex-shrink-0 bg-white/10" />
          ) : (
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                 style={{ backgroundColor: '#2979ff' }}>
              <span className="text-white text-[10px] font-bold tracking-tight">RETC</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-xs text-white leading-tight truncate">{schoolName}</p>
            <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>Smart Campus</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 no-scrollbar">
        <p className="px-4 mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
           style={{ color: 'rgba(255,255,255,0.3)' }}>Menu</p>
        <ul className="space-y-0.5 px-2">
          {NAV_PHASE1.filter(canSeeItem).map(({ href, label, Icon, badge, extraMatch }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
              || (!!extraMatch && (pathname === extraMatch || pathname.startsWith(extraMatch + '/')));
            return (
              <li key={href}>
                <Link href={href} onClick={onClose}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors"
                  style={navItemStyle(active)}
                  onMouseEnter={e => navItemHover(e, active)}
                  onMouseLeave={e => navItemLeave(e, active)}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 truncate">{label}</span>
                  {badge && pendingRepairs > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {pendingRepairs > 99 ? '99+' : pendingRepairs}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Settings link — admin/superAdmin only */}
        {(user?.isSuperAdmin || user?.role === 'admin') && (
          <>
            <p className="px-4 mt-4 mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
               style={{ color: 'rgba(255,255,255,0.3)' }}>ระบบ</p>
            <ul className="space-y-0.5 px-2">
              <li>
                <Link href="/settings/general" onClick={onClose}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors"
                  style={navItemStyle(pathname.startsWith('/settings'))}
                  onMouseEnter={e => navItemHover(e, pathname.startsWith('/settings'))}
                  onMouseLeave={e => navItemLeave(e, pathname.startsWith('/settings'))}>
                  <Settings className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 truncate">ตั้งค่าระบบ</span>
                </Link>
              </li>
            </ul>
          </>
        )}

        {/* Phase 2 */}
        <p className="px-4 mt-4 mb-1.5 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1"
           style={{ color: 'rgba(255,255,255,0.3)' }}>
          เพิ่มเติม <Lock className="w-2.5 h-2.5" />
        </p>
        <ul className="space-y-0.5 px-2 opacity-40 pointer-events-none select-none">
          {NAV_PHASE2.map(({ label, Icon }) => (
            <li key={label}>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px]"
                   style={{ color: 'rgba(255,255,255,0.55)' }}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                  เร็วๆ นี้
                </span>
              </div>
            </li>
          ))}
        </ul>
      </nav>

      {/* User info + logout */}
      {user && (
        <div className="px-3 py-3 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <Link href="/profile" onClick={onClose} className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-white/10 transition-colors">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                   style={{ backgroundColor: '#2979ff' }}>
                {user.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">{user.name}</p>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white ${ROLE_COLOR[user.role] ?? 'bg-gray-500'}`}>
                {ROLE_LABEL[user.role] ?? user.role}
              </span>
            </div>
            <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
          </Link>
          <button
            onClick={() => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); router.push('/login'); }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ color: 'rgba(255,100,100,0.9)', backgroundColor: 'rgba(255,255,255,0.05)' }}
          >
            <LogOut className="w-3.5 h-3.5" />
            ออกจากระบบ
          </button>
        </div>
      )}
    </aside>
  );
}
