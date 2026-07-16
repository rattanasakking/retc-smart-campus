'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Layers, Hash, Stamp, FileText } from 'lucide-react';
import { api } from '@/lib/api';

const TABS = [
  { href: '/certificate',          label: 'ภาพรวม',        Icon: LayoutDashboard, adminOnly: false, exact: true },
  { href: '/certificate/projects', label: 'โครงการ',        Icon: Layers,          adminOnly: false, exact: false },
  { href: '/certificate/series',   label: 'เลขชุด',         Icon: Hash,            adminOnly: true,  exact: false },
  { href: '/certificate/certs',    label: 'ออกเกียรติบัตร', Icon: Stamp,           adminOnly: false, exact: false },
  { href: '/certificate/reports',  label: 'รายงาน',         Icon: FileText,        adminOnly: false, exact: false },
] as const;

export default function CertTabBar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    api.get<{ data: { isCertAdmin: boolean } }>('/certificate/me')
      .then((r) => setIsAdmin(r.data.isCertAdmin))
      .catch(() => {});
  }, []);

  return (
    <div className="bg-white rounded-xl" style={{ border: '1px solid #dce6f9' }}>
      <div className="flex overflow-x-auto">
        {TABS.filter((t) => !t.adminOnly || isAdmin).map(({ href, label, Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors flex-shrink-0"
              style={{ borderBottomColor: active ? '#c2410c' : 'transparent', color: active ? '#c2410c' : '#4a6080' }}
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
