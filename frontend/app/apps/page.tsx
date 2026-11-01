'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Search, Star, ExternalLink, Eye, EyeOff, SlidersHorizontal, Check, Settings2, X, LogIn, LayoutDashboard, Lock,
} from 'lucide-react';
import { TOKEN_KEY, USER_KEY } from '@/lib/api';
import { MAIN_NAV, type MainNavItem } from '@/lib/mainMenu';
import {
  INTERNAL_APP_META, INTERNAL_GROUP_ID, loadLauncherPrefs, saveLauncherPrefs, glyphOf,
  type ExternalAppsData, type LauncherPrefs,
} from '@/lib/launcher';

// หน้า "แอปทั้งหมด" — เปิดได้โดยไม่ต้อง login (แบบ workspace launcher)
// ผู้เยี่ยมชม: เห็นโมดูลในระบบ (กดแล้วไปหน้า login ก่อน) + แอปภายนอกที่เปิดให้ทุกคน
// login แล้ว: เห็นตามสิทธิ์ + ตัวเลขงานค้าง

interface StoredUser { name?: string; role?: string; isSuperAdmin?: boolean; avatar?: string }

interface Tile {
  key: string;            // 'in:<href>' | 'ex:<id>'
  name: string;
  desc: string;
  href: string;
  external: boolean;
  locked: boolean;        // โมดูลภายในที่ต้อง login ก่อน
  color: string;
  bg: string;
  Icon?: MainNavItem['Icon'];
  glyph?: string;
  icon?: string;          // รูปไอคอนที่อัปโหลด (แอปภายนอก)
  badge?: number;
  section: string;        // id ของกลุ่มที่แสดง
}

const INTERNAL_SECTION = INTERNAL_GROUP_ID;
const OTHER_SECTION = '__other';

// fetch ที่ไม่เด้งไปหน้า login เมื่อ token หมดอายุ (หน้านี้เป็นหน้า public)
async function getJson(url: string, token: string | null) {
  const r = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: 'no-store' });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

// ─── Tile ─────────────────────────────────────────────────────────────────────

function AppTile({ tile, pinned, hidden, editing, onPin, onHide }: {
  tile: Tile; pinned: boolean; hidden: boolean; editing: boolean;
  onPin: () => void; onHide: () => void;
}) {
  const body = (
    <>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 relative"
        style={{ backgroundColor: tile.icon ? '#ffffff' : tile.external ? tile.color : tile.bg, border: tile.icon ? '1px solid #eef2f9' : undefined }}>
        {tile.icon
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={tile.icon} alt="" className="w-full h-full rounded-xl object-cover" />
          : tile.Icon
          ? <tile.Icon className="w-5 h-5" style={{ color: tile.color }} />
          : <span className="text-white font-bold text-[11px] tracking-tight leading-none">{tile.glyph}</span>}
        {!!tile.badge && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
            {tile.badge > 99 ? '99+' : tile.badge}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 w-full">
        <p className="text-[13px] font-semibold leading-snug flex items-center gap-1" style={{ color: '#1a2744' }}>
          <span className="truncate">{tile.name}</span>
          {tile.external && <ExternalLink className="w-3 h-3 flex-shrink-0" style={{ color: '#94a3b8' }} />}
          {tile.locked && <Lock className="w-3 h-3 flex-shrink-0" style={{ color: '#94a3b8' }} />}
        </p>
        <p className="text-[11px] leading-snug mt-0.5 line-clamp-2" style={{ color: '#64748b' }}>{tile.desc}</p>
      </div>
    </>
  );

  // มือถือ: ไอคอนอยู่บน (2 คอลัมน์) · จอใหญ่ขึ้น: ไอคอนอยู่ซ้าย
  const cls = 'flex flex-col sm:flex-row items-start gap-2.5 sm:gap-3 bg-white rounded-2xl p-3 sm:pr-9 h-full transition-all active:scale-[0.98] md:hover:-translate-y-0.5 md:hover:shadow-md';
  const style = { border: '1px solid #dce6f9', opacity: hidden ? 0.45 : 1 };
  const href = tile.locked ? `/login?next=${encodeURIComponent(tile.href)}` : tile.href;

  return (
    <div className="relative">
      {editing ? (
        <div className={cls} style={style}>{body}</div>
      ) : tile.external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={cls} style={style}>{body}</a>
      ) : (
        <Link href={href} className={cls} style={style}>{body}</Link>
      )}
      {editing ? (
        <button onClick={onHide} aria-label={hidden ? 'แสดงแอปนี้' : 'ซ่อนแอปนี้'}
          className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#f5f8ff]">
          {hidden ? <EyeOff className="w-4 h-4" style={{ color: '#94a3b8' }} /> : <Eye className="w-4 h-4" style={{ color: '#1d6ae5' }} />}
        </button>
      ) : (
        <button onClick={onPin} aria-label={pinned ? 'เลิกปักหมุด' : 'ปักหมุด'}
          className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#f5f8ff]">
          <Star className="w-4 h-4" style={pinned ? { color: '#f59e0b', fill: '#f59e0b' } : { color: '#cbd5e1' }} />
        </button>
      )}
    </div>
  );
}

function Section({ title, color, count, children }: { title: string; color: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2.5 px-0.5">
        <span className="w-1.5 h-4 rounded-full" style={{ backgroundColor: color }} />
        <h2 className="text-sm font-semibold" style={{ color: '#1a2744' }}>{title}</h2>
        <span className="text-[11px]" style={{ color: '#94a3b8' }}>{count}</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
        {children}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AppsPage() {
  const [user, setUser]         = useState<StoredUser | null>(null); // null = ผู้เยี่ยมชม
  const [modules, setModules]   = useState<string[] | null>(null);
  const [external, setExternal] = useState<ExternalAppsData>({ groups: [], apps: [] });
  const [badges, setBadges]     = useState<Record<string, number>>({});
  const [prefs, setPrefs]       = useState<LauncherPrefs>({ pinned: [], hidden: [] });
  const [school, setSchool]     = useState({ name: '', logo: null as string | null });
  const [query, setQuery]       = useState('');
  const [editing, setEditing]   = useState(false);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setPrefs(loadLauncherPrefs());
    let token: string | null = null;
    try {
      token = localStorage.getItem(TOKEN_KEY);
      if (token) setUser(JSON.parse(localStorage.getItem(USER_KEY) || '{}'));
    } catch { /* */ }

    const jobs: Promise<unknown>[] = [
      getJson('/api/settings/logo', null).then((r) => setSchool({ name: r.data?.school_name ?? '', logo: r.data?.logo_url ?? null })).catch(() => {}),
      getJson('/api/settings/external-apps', token).then((r) => setExternal(r.data ?? { groups: [], apps: [] })).catch(() => {}),
    ];
    if (token) {
      jobs.push(
        getJson('/api/auth/my-modules', token).then((r) => setModules(r.data?.modules ?? [])).catch(() => {
          setUser(null); // token หมดอายุ → แสดงแบบผู้เยี่ยมชม
        }),
        getJson('/api/dashboard/summary', token).then((r) => {
          const k = r.data?.kpi ?? {};
          setBadges({ '/helpdesk': k.openRepairs ?? 0, '/leave': k.pendingLeaves ?? 0 });
        }).catch(() => {}),
      );
    }
    Promise.all(jobs).finally(() => setLoading(false));
  }, []);

  const updatePrefs = (p: LauncherPrefs) => { setPrefs(p); saveLauncherPrefs(p); };
  const togglePin  = (key: string) => updatePrefs({ ...prefs, pinned: prefs.pinned.includes(key) ? prefs.pinned.filter((k) => k !== key) : [...prefs.pinned, key] });
  const toggleHide = (key: string) => updatePrefs({ ...prefs, hidden: prefs.hidden.includes(key) ? prefs.hidden.filter((k) => k !== key) : [...prefs.hidden, key] });

  const loggedIn = !!user;
  const isAdmin = !!user?.isSuperAdmin || user?.role === 'admin';
  const canSee = (item: MainNavItem) => {
    if (item.adminOnly) return isAdmin || user?.role === 'executive';
    if (!loggedIn || !item.module) return true; // ผู้เยี่ยมชมเห็นทุกโมดูล (ต้อง login ก่อนเข้า)
    return modules === null || modules.includes(item.module);
  };

  const tiles: Tile[] = useMemo(() => {
    const internal: Tile[] = MAIN_NAV
      .filter((n) => n.href !== '/dashboard' && n.href !== '/apps' && canSee(n))
      .map((n) => {
        const meta = INTERNAL_APP_META[n.href] ?? { color: '#1d6ae5', bg: '#eff4ff', desc: '' };
        return {
          key: `in:${n.href}`, name: n.label, desc: meta.desc, href: n.href, external: false, locked: !loggedIn,
          color: meta.color, bg: meta.bg, Icon: n.Icon, badge: badges[n.href], section: INTERNAL_SECTION,
        };
      });
    const groupIds = new Set(external.groups.map((g) => g.id).filter((id) => id !== INTERNAL_SECTION));
    const ext: Tile[] = external.apps.map((a) => ({
      key: `ex:${a.id}`, name: a.name, desc: a.desc, href: a.url, external: true, locked: false,
      color: a.color, bg: a.color, glyph: glyphOf(a.name, a.glyph), icon: a.icon || undefined,
      section: a.groupId && groupIds.has(a.groupId) ? a.groupId : OTHER_SECTION,
    }));
    return [...internal, ...ext];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modules, external, badges, user]);

  const q = query.trim().toLowerCase();
  const visible = tiles.filter((t) =>
    (editing || !prefs.hidden.includes(t.key)) &&
    (!q || t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q)));

  const pinned = prefs.pinned
    .map((k) => visible.find((t) => t.key === k))
    .filter((t): t is Tile => !!t && !prefs.hidden.includes(t.key));

  // ลำดับกลุ่มตามที่ผู้ดูแลตั้งไว้ (ถ้าไม่มี "ระบบในวิทยาลัย" ในรายการ → ไว้บนสุด); "ระบบอื่น ๆ" อยู่ท้ายเสมอ
  const sections = [
    ...(external.groups.some((g) => g.id === INTERNAL_SECTION) ? [] : [{ id: INTERNAL_SECTION, name: 'ระบบในวิทยาลัย', color: '#1d6ae5' }]),
    ...external.groups,
    { id: OTHER_SECTION, name: 'ระบบอื่น ๆ', color: '#64748b' },
  ];

  const hiddenCount = tiles.filter((t) => prefs.hidden.includes(t.key)).length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'สวัสดีตอนเช้า' : hour < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';

  const renderTile = (t: Tile) => (
    <AppTile key={t.key} tile={t} editing={editing}
      pinned={prefs.pinned.includes(t.key)} hidden={prefs.hidden.includes(t.key)}
      onPin={() => togglePin(t.key)} onHide={() => toggleHide(t.key)} />
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f8ff' }}>
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ backgroundColor: '#0f1e3c' }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          {school.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={school.logo} alt="" className="w-9 h-9 rounded-lg object-contain flex-shrink-0 bg-white/10" />
          ) : (
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#2979ff' }}>
              <span className="text-white text-[10px] font-bold">RETC</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white leading-tight truncate">{school.name || 'Smart Campus'}</p>
            <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>Smart Campus · แอปทั้งหมด</p>
          </div>
          {loggedIn ? (
            <Link href="/dashboard" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white flex-shrink-0"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <LayoutDashboard className="w-4 h-4" /> <span className="hidden sm:inline">หน้าหลัก</span>
              {user?.avatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={user.avatar} alt="" className="w-6 h-6 rounded-full object-cover ml-0.5" />
                : <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ml-0.5" style={{ backgroundColor: '#2979ff' }}>{user?.name?.charAt(0) ?? 'U'}</span>}
            </Link>
          ) : (
            <Link href="/login?next=%2Fapps" className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-sm font-bold text-white flex-shrink-0"
              style={{ backgroundColor: '#2979ff' }}>
              <LogIn className="w-4 h-4" /> เข้าสู่ระบบ
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4 md:py-6 space-y-5">
        {/* Hero */}
        <div className="rounded-2xl px-4 py-5 md:px-6 md:py-6"
          style={{ background: 'linear-gradient(135deg, #0f1e3c 0%, #1d3a72 100%)' }}>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{greeting}</p>
          <h1 className="text-xl md:text-2xl font-bold text-white mt-0.5">{loggedIn ? (user?.name || 'ผู้ใช้งาน') : 'ยินดีต้อนรับ'}</h1>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {loggedIn ? 'ทุกระบบที่คุณใช้งานได้ รวมไว้ในที่เดียว' : 'รวมทุกระบบของวิทยาลัยไว้ในที่เดียว · เข้าสู่ระบบเพื่อใช้งานระบบในวิทยาลัย'}
          </p>
          <div className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white max-w-lg">
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: '#94a3b8' }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาแอปหรือระบบ..."
              className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder-[#94a3b8]" style={{ color: '#1a2744' }} />
            {query && (
              <button onClick={() => setQuery('')} aria-label="ล้างคำค้นหา"><X className="w-4 h-4" style={{ color: '#94a3b8' }} /></button>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setEditing((e) => !e)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
            style={editing
              ? { backgroundColor: '#1d6ae5', color: '#fff' }
              : { backgroundColor: '#fff', color: '#4a6080', border: '1px solid #dce6f9' }}>
            {editing ? <><Check className="w-3.5 h-3.5" /> เสร็จสิ้น</> : <><SlidersHorizontal className="w-3.5 h-3.5" /> ซ่อน/แสดงแอป</>}
          </button>
          {!editing && hiddenCount > 0 && (
            <span className="text-[11px]" style={{ color: '#94a3b8' }}>ซ่อนอยู่ {hiddenCount} แอป</span>
          )}
          {editing && (
            <span className="text-[11px]" style={{ color: '#4a6080' }}>แตะไอคอนรูปตาเพื่อซ่อนหรือแสดง (มีผลเฉพาะเครื่องนี้)</span>
          )}
          {isAdmin && (
            <Link href="/settings/apps"
              className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
              style={{ backgroundColor: '#fff', color: '#4a6080', border: '1px solid #dce6f9' }}>
              <Settings2 className="w-3.5 h-3.5" /> จัดการรายการแอป
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-[110px] sm:h-[74px] rounded-2xl" />)}
          </div>
        ) : (
          <>
            {!editing && pinned.length > 0 && (
              <Section title="ปักหมุดไว้" color="#f59e0b" count={pinned.length}>{pinned.map(renderTile)}</Section>
            )}
            {sections.map((s) => {
              const items = visible.filter((t) => t.section === s.id);
              if (items.length === 0) return null;
              return <Section key={s.id} title={s.name} color={s.color} count={items.length}>{items.map(renderTile)}</Section>;
            })}
            {visible.length === 0 && (
              <div className="text-center py-14 text-sm" style={{ color: '#94a3b8' }}>
                <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                {q ? `ไม่พบแอปที่ตรงกับ "${query}"` : 'ยังไม่มีแอปที่แสดงได้'}
              </div>
            )}
          </>
        )}

        <p className="text-center text-[11px] pt-4 pb-2" style={{ color: '#94a3b8' }}>
          © {new Date().getFullYear() + 543} {school.name || 'Smart Campus'}
        </p>
      </main>
    </div>
  );
}
