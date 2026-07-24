'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, User, ChevronDown, Bell, Settings, Menu, CheckCheck } from 'lucide-react';
import { TOKEN_KEY, USER_KEY, api } from '@/lib/api';

interface Noti { id: number; title: string; message: string; type: string; isRead: boolean; link: string | null; createdAt: string }

function timeAgo(iso: string) {
  const d = new Date(iso);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return 'เมื่อสักครู่';
  if (s < 3600) return `${Math.floor(s / 60)} นาทีที่แล้ว`;
  if (s < 86400) return `${Math.floor(s / 3600)} ชม.ที่แล้ว`;
  if (s < 604800) return `${Math.floor(s / 86400)} วันที่แล้ว`;
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

function MobileLogo() {
  const [logoUrl, setLogoUrl]     = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState('Smart Campus');
  useEffect(() => {
    fetch('/api/settings/logo').then(r => r.json()).then(d => {
      if (d?.success) { setLogoUrl(d.data?.logo_url ?? null); setSchoolName(d.data?.school_name ?? 'Smart Campus'); }
    }).catch(() => {});
  }, []);
  return (
    <div className="md:hidden flex items-center gap-2 flex-1">
      {logoUrl ? (
        <img src={logoUrl} alt="logo" className="w-7 h-7 rounded-lg object-contain flex-shrink-0" />
      ) : (
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
             style={{ backgroundColor: '#0f1e3c' }}>
          <span className="text-white text-[9px] font-bold">RETC</span>
        </div>
      )}
      <span className="text-sm font-bold truncate" style={{ color: '#0f1e3c' }}>{schoolName}</span>
    </div>
  );
}

interface Props { onHamburger?: () => void }
interface StoredUser {
  name: string; role: string; department?: string;
  employeeId?: string; avatar?: string;
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'ผู้ดูแลระบบ', executive: 'ผู้บริหาร',
  teacher: 'ครู/อาจารย์', staff: 'เจ้าหน้าที่',
};

export default function Topbar({ onHamburger }: Props) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [open, setOpen] = useState(false);
  const [notis, setNotis]   = useState<Noti[]>([]);
  const [unread, setUnread] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) { try { setUser(JSON.parse(stored)); } catch { /* */ } }
  }, []);

  const loadNotis = () => {
    api.get<{ data: { items: Noti[]; unread: number } }>('/notifications')
      .then((r) => { setNotis(r.data.items ?? []); setUnread(r.data.unread ?? 0); })
      .catch(() => {});
  };
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    loadNotis();
    const t = setInterval(loadNotis, 60000);
    return () => clearInterval(t);
  }, []);

  const clickNoti = (n: Noti) => {
    if (!n.isRead) {
      api.put(`/notifications/${n.id}/read`, {}).catch(() => {});
      setUnread((u) => Math.max(0, u - 1));
      setNotis((prev) => prev.map((x) => x.id === n.id ? { ...x, isRead: true } : x));
    }
    setBellOpen(false);
    if (n.link) router.push(n.link);
  };
  const markAll = () => {
    api.put('/notifications/read-all', {}).catch(() => {});
    setUnread(0);
    setNotis((prev) => prev.map((x) => ({ ...x, isRead: true })));
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    router.push('/login');
  };

  const initials = user?.name?.charAt(0) ?? 'U';

  return (
    <header className="px-4 py-2.5 flex items-center gap-3 flex-shrink-0"
      style={{ backgroundColor: '#ffffff', borderBottom: '0.5px solid #dce6f9' }}>

      {/* Hamburger — mobile only */}
      <button onClick={onHamburger} className="md:hidden p-1.5 rounded-lg hover:bg-[#f5f8ff]">
        <Menu className="w-5 h-5" style={{ color: '#1a2744' }} />
      </button>

      {/* Logo — mobile only, fetched from settings */}
      <MobileLogo />

      {/* Search — desktop only */}
      <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-xs"
        style={{ backgroundColor: '#f5f8ff', border: '1px solid #dce6f9' }}>
        <svg className="w-3.5 h-3.5 flex-shrink-0 text-[#94a3b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input placeholder="ค้นหา..." className="flex-1 bg-transparent text-sm outline-none placeholder-[#94a3b8] min-w-0"
          style={{ color: '#1a2744' }} />
      </div>

      <div className="flex items-center gap-1 md:ml-auto">
        {/* Bell */}
        <div className="relative">
          <button onClick={() => setBellOpen((o) => !o)} className="relative p-2 rounded-xl hover:bg-[#f5f8ff]">
            <Bell className="w-[18px] h-[18px]" style={{ color: '#4a6080' }} />
            {unread > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          {bellOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 max-w-[92vw] rounded-xl shadow-lg z-50 bg-white overflow-hidden"
                   style={{ border: '1px solid #dce6f9' }}>
                <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid #dce6f9' }}>
                  <span className="text-sm font-semibold" style={{ color: '#1a2744' }}>การแจ้งเตือน</span>
                  {unread > 0 && (
                    <button onClick={markAll} className="flex items-center gap-1 text-xs" style={{ color: '#1d6ae5' }}>
                      <CheckCheck className="w-3.5 h-3.5" /> อ่านทั้งหมด
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notis.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm" style={{ color: '#94a3b8' }}>
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      ไม่มีการแจ้งเตือน
                    </div>
                  ) : notis.map((n) => (
                    <button key={n.id} onClick={() => clickNoti(n)}
                      className="w-full text-left px-4 py-3 hover:bg-[#f5f8ff] transition-colors flex gap-2.5"
                      style={{ borderBottom: '1px solid #f5f8ff', backgroundColor: n.isRead ? '#fff' : '#f0f6ff' }}>
                      {!n.isRead && <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: '#2979ff' }} />}
                      <div className={`min-w-0 flex-1 ${n.isRead ? 'pl-4' : ''}`}>
                        <p className="text-sm font-medium truncate" style={{ color: '#1a2744' }}>{n.title}</p>
                        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#4a6080' }}>{n.message}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: '#94a3b8' }}>{timeAgo(n.createdAt)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Settings — desktop only */}
        <button onClick={() => router.push('/settings/general')}
          className="hidden md:flex p-2 rounded-xl hover:bg-[#f5f8ff]">
          <Settings className="w-[18px] h-[18px]" style={{ color: '#4a6080' }} />
        </button>

        {/* Profile */}
        <div className="relative ml-1">
          <button onClick={() => setOpen(!open)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-[#f5f8ff]">
            {/* Avatar — คลิกไปหน้าโปรไฟล์ */}
            <Link href="/profile" onClick={e => e.stopPropagation()}>
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0 hover:ring-2 hover:ring-blue-400" />
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 hover:ring-2 hover:ring-blue-400"
                   style={{ backgroundColor: '#2979ff' }}>
                {initials}
              </div>
            )}
            </Link>
            <div className="text-left hidden md:block">
              <p className="text-sm font-medium leading-tight" style={{ color: '#1a2744' }}>
                {user?.name ?? 'ผู้ใช้งาน'}
              </p>
              <p className="text-[11px]" style={{ color: '#4a6080' }}>
                {user?.role ? ROLE_LABEL[user.role] : ''}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 hidden md:block" style={{ color: '#94a3b8' }} />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div className="absolute right-0 mt-2 w-52 rounded-xl shadow-lg py-1 z-50"
                   style={{ backgroundColor: '#ffffff', border: '1px solid #dce6f9' }}>
                <div className="px-4 py-2.5" style={{ borderBottom: '1px solid #dce6f9' }}>
                  <div className="flex items-center gap-2">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                           style={{ backgroundColor: '#2979ff' }}>
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#1a2744' }}>{user?.name}</p>
                      <p className="text-xs truncate" style={{ color: '#4a6080' }}>
                        {user?.department ?? ROLE_LABEL[user?.role ?? '']}
                      </p>
                    </div>
                  </div>
                </div>
                <Link href="/profile" onClick={() => setOpen(false)}
                  className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm hover:bg-[#f5f8ff] transition-colors"
                  style={{ color: '#1a2744' }}>
                  <User className="w-4 h-4" style={{ color: '#4a6080' }} />
                  แก้ไขโปรไฟล์
                </Link>
                <Link href="/settings/general" onClick={() => setOpen(false)}
                  className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm hover:bg-[#f5f8ff] transition-colors"
                  style={{ color: '#1a2744' }}>
                  <Settings className="w-4 h-4" style={{ color: '#4a6080' }} />
                  ตั้งค่าระบบ
                </Link>
                <button onClick={logout}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
                  style={{ borderTop: '1px solid #dce6f9' }}>
                  <LogOut className="w-4 h-4" />
                  ออกจากระบบ
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
