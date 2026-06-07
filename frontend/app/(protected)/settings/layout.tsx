'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Building2, Network, Shield, ChevronLeft, Settings, Users, Smartphone, CalendarX, Bell,
} from 'lucide-react';
import { USER_KEY } from '@/lib/api';

interface StoredUser { isSuperAdmin?: boolean; name?: string }

const MENU = [
  { href: '/settings/general',      label: 'ข้อมูลวิทยาลัย',    Icon: Building2  },
  { href: '/settings/organization', label: 'โครงสร้างองค์กร',  Icon: Network     },
  { href: '/settings/users',        label: 'จัดการผู้ใช้',      Icon: Users       },
  { href: '/settings/permissions',  label: 'สิทธิ์การใช้งาน',  Icon: Shield      },
  { href: '/settings/quick-menu',     label: 'เมนูด่วน (มือถือ)', Icon: Smartphone  },
  { href: '/settings/leave-types',    label: 'ประเภทการลา',       Icon: CalendarX   },
  { href: '/settings/notifications',  label: 'การแจ้งเตือน',      Icon: Bell        },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) { router.replace('/login'); return; }
    try {
      const u: StoredUser = JSON.parse(raw);
      if (!u.isSuperAdmin) { router.replace('/dashboard'); return; }
    } catch {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-48">
        <div
          className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: '#1d6ae5', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div className="flex gap-5 items-start">
      {/* Settings Sidebar */}
      <aside className="w-[184px] flex-shrink-0 sticky top-0">
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: '#ffffff', border: '1px solid #dce6f9' }}
        >
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ borderBottom: '1px solid #dce6f9' }}
          >
            <Settings className="w-3.5 h-3.5" style={{ color: '#4a6080' }} />
            <span className="text-sm font-semibold" style={{ color: '#1a2744' }}>การตั้งค่า</span>
          </div>

          <nav className="py-1.5">
            {MENU.map(({ href, label, Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors"
                  style={{
                    backgroundColor: active ? '#2979ff' : 'transparent',
                    color: active ? '#ffffff' : '#4a6080',
                    fontWeight: active ? 500 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.backgroundColor = '#f5f8ff';
                    if (!active) e.currentTarget.style.color = '#1a2744';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.backgroundColor = 'transparent';
                    if (!active) e.currentTarget.style.color = '#4a6080';
                  }}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="px-3 py-2.5" style={{ borderTop: '1px solid #dce6f9' }}>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-xs transition-colors hover:text-[#1d6ae5]"
              style={{ color: '#94a3b8' }}
            >
              <ChevronLeft className="w-3 h-3" /> กลับหน้าหลัก
            </Link>
          </div>
        </div>
      </aside>

      {/* Page content */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
