'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Bell, QrCode, ClipboardList, User } from 'lucide-react';

const NAV = [
  { href: '/dashboard', label: 'หน้าหลัก',   Icon: Home },
  { href: '/worklog',   label: 'งานของฉัน',   Icon: ClipboardList },
  { href: '/scan',      label: 'สแกน QR',     Icon: QrCode, center: true },
  { href: '/duty',      label: 'เวร',          Icon: Bell },
  { href: '/profile',   label: 'โปรไฟล์',     Icon: User },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-end"
         style={{ backgroundColor: '#ffffff', borderTop: '1px solid #dce6f9' }}>
      {NAV.map(({ href, label, Icon, center }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        if (center) {
          return (
            <Link key={href} href={href}
              className="flex-1 flex flex-col items-center justify-center pb-2 pt-1">
              <div className="w-14 h-14 rounded-full flex items-center justify-center -mt-6 shadow-lg"
                   style={{ backgroundColor: '#1d6ae5' }}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] mt-1" style={{ color: '#94a3b8' }}>{label}</span>
            </Link>
          );
        }
        return (
          <Link key={href} href={href}
            className="flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors"
            style={{ color: active ? '#1d6ae5' : '#94a3b8' }}>
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
