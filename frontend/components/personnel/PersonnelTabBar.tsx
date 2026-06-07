'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Network, CalendarX } from 'lucide-react';

const TABS = [
  {
    href: '/personnel',
    label: 'รายชื่อบุคลากร',
    Icon: Users,
    isActive: (p: string) => p === '/personnel',
  },
  {
    href: '/personnel/organization',
    label: 'โครงสร้างองค์กร',
    Icon: Network,
    isActive: (p: string) => p.startsWith('/personnel/organization'),
  },
  {
    href: '/leave',
    label: 'ระบบการลา',
    Icon: CalendarX,
    isActive: (p: string) => p.startsWith('/leave'),
  },
] as const;

export default function PersonnelTabBar() {
  const pathname = usePathname();

  return (
    <div className="bg-white rounded-xl" style={{ border: '1px solid #dce6f9' }}>
      <div className="flex overflow-x-auto">
        {TABS.map(({ href, label, Icon, isActive }) => {
          const active = isActive(pathname);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors flex-shrink-0"
              style={{
                borderBottomColor: active ? '#1d6ae5' : 'transparent',
                color: active ? '#1d6ae5' : '#4a6080',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = '#1a2744'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = '#4a6080'; }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
