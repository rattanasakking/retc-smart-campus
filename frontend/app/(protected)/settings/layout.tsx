'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Building2, Network, Shield, ChevronLeft, Settings, Users, Smartphone, CalendarX, Bell, ListOrdered, Link2, LayoutGrid,
} from 'lucide-react';
import { USER_KEY } from '@/lib/api';

interface StoredUser { isSuperAdmin?: boolean; name?: string }

const MENU = [
  { href: '/settings/general',      label: 'ข้อมูลวิทยาลัย',    Icon: Building2  },
  { href: '/settings/organization', label: 'โครงสร้างองค์กร',  Icon: Network     },
  { href: '/settings/users',        label: 'จัดการผู้ใช้',      Icon: Users       },
  { href: '/settings/permissions',  label: 'สิทธิ์การใช้งาน',  Icon: Shield      },
  { href: '/settings/integrations',   label: 'การเชื่อมต่อภายนอก', Icon: Link2     },
  { href: '/settings/menu',           label: 'เมนูหลัก',          Icon: ListOrdered },
  { href: '/settings/apps',           label: 'แอปทั้งหมด',        Icon: LayoutGrid  },
  { href: '/settings/quick-menu',     label: 'เมนูด่วน (มือถือ)', Icon: Smartphone  },
  { href: '/settings/leave-types',    label: 'ประเภทการลา',       Icon: CalendarX   },
  { href: '/settings/notifications',  label: 'การแจ้งเตือน',      Icon: Bell        },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  // เมนูด่วนเป็นค่าส่วนตัว (เก็บในเบราว์เซอร์) — ผู้ใช้ทุกคนเข้าได้
  const personalPage = pathname === '/settings/quick-menu';

  useEffect(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) { router.replace('/login'); return; }
    try {
      const u: StoredUser = JSON.parse(raw);
      if (!u.isSuperAdmin && !personalPage) { router.replace('/dashboard'); return; }
      setIsSuperAdmin(!!u.isSuperAdmin);
    } catch {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router, personalPage]);

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

  if (!isSuperAdmin) return <>{children}</>;

  return (
    <div className="md:flex md:gap-5 md:items-start">
      {/* Mobile: แถบเมนูตั้งค่าแบบเลื่อนแนวนอน */}
      <nav className="md:hidden -mx-4 px-4 mb-4 flex gap-1.5 overflow-x-auto no-scrollbar">
        {MENU.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0"
              style={active
                ? { backgroundColor: '#2979ff', color: '#ffffff' }
                : { backgroundColor: '#ffffff', color: '#4a6080', border: '1px solid #dce6f9' }}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Settings Sidebar — desktop */}
      <aside className="hidden md:block w-[184px] flex-shrink-0 sticky top-0">
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
      <div className="md:flex-1 min-w-0">{children}</div>
    </div>
  );
}
