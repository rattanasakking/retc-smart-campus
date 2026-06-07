'use client';
import { useEffect, useState } from 'react';
import { Search, Plus, X, Check, Loader2, Shield, Users, User } from 'lucide-react';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModuleUser { id: number; name: string; email: string; role: string; position: string | null; department: string | null; level?: string }
interface UserOption  { id: number; name: string; email: string; role: string; department: string | null }
interface PermGrouped { admins: ModuleUser[]; users: ModuleUser[] }

// ─── Constants ────────────────────────────────────────────────────────────────

const MODULES = ['DUTY','WORK_LOG','EQUIPMENT','HELPDESK','ROOM_BOOKING','LOST_FOUND','PERSONNEL','LEAVE'] as const;
type Mod = typeof MODULES[number];

const MODULE_META: Record<Mod, { label: string; desc: string; color: string; bg: string }> = {
  DUTY:         { label: 'เวรรับนักเรียน',    desc: 'บันทึกการเข้าเวรของครู',           color: '#1d6ae5', bg: '#e8f0fe' },
  WORK_LOG:     { label: 'บันทึกปฏิบัติงาน', desc: 'บันทึกและอนุมัติการปฏิบัติงาน',   color: '#0d9068', bg: '#e6f9f0' },
  EQUIPMENT:    { label: 'ครุภัณฑ์',           desc: 'จัดการและติดตามครุภัณฑ์',          color: '#7c3aed', bg: '#f3e8ff' },
  HELPDESK:     { label: 'Helpdesk แจ้งซ่อม', desc: 'แจ้งซ่อมและติดตามงานซ่อม',        color: '#dc2626', bg: '#fef2f2' },
  ROOM_BOOKING: { label: 'จองห้องประชุม',      desc: 'จองและอนุมัติการใช้ห้องประชุม',   color: '#b45309', bg: '#fffbeb' },
  LOST_FOUND:   { label: 'ของหาย',             desc: 'ระบบของหายและการติดตามคืนของ',     color: '#16a34a', bg: '#f0fdf4' },
  PERSONNEL:    { label: 'บุคลากร',            desc: 'จัดการข้อมูลบุคลากรและโครงสร้าง', color: '#0369a1', bg: '#e0f2fe' },
  LEAVE:        { label: 'ระบบการลา',          desc: 'ยื่นและอนุมัติใบลาบุคลากร',        color: '#7e22ce', bg: '#f5f3ff' },
};

const ALL_ROLES = ['admin','executive','teacher','staff'] as const;
const ROLE_LABEL: Record<string, string> = {
  admin: 'ผู้ดูแลระบบ', executive: 'ผู้บริหาร', teacher: 'ครู/อาจารย์', staff: 'เจ้าหน้าที่',
};
const ROLE_STYLE: Record<string, { bg: string; text: string }> = {
  admin:     { bg: '#f3e8ff', text: '#7c3aed' },
  executive: { bg: '#fef2f2', text: '#dc2626' },
  teacher:   { bg: '#e8f0fe', text: '#1d6ae5' },
  staff:     { bg: '#e6f9f0', text: '#0d9068' },
};

function Toast({ msg, err, onClose }: { msg: string; err?: boolean; onClose: () => void }) {
  if (!msg) return null;
  return (
    <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white flex items-center gap-2 ${err ? 'bg-red-500' : 'bg-[#0d9068]'}`}>
      {msg}
      <button onClick={onClose}><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

// ─── AddUserPanel ──────────────────────────────────────────────────────────────

interface AddUserPanelProps {
  mod: string;
  level: 'ADMIN' | 'USER';
  existingIds: Set<number>;
  allUsers: UserOption[];
  onAdded: () => void;
  onClose: () => void;
  onError: (msg: string) => void;
}

function AddUserPanel({ mod, level, existingIds, allUsers, onAdded, onClose, onError }: AddUserPanelProps) {
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(false);

  const filtered = allUsers
    .filter(u => !existingIds.has(u.id) && (u.name.includes(search) || u.email.includes(search)))
    .slice(0, 8);

  const add = async (userId: number) => {
    setLoading(true);
    try {
      await api.post('/settings/permissions', { userId, module: mod, level });
      onAdded();
      onClose();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 border border-[#dce6f9] rounded-xl overflow-hidden">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#94a3b8]" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อหรืออีเมล..."
          className="w-full pl-9 pr-4 py-2 text-sm border-b border-[#dce6f9] focus:outline-none" />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-[#94a3b8] text-center py-4">ไม่พบผู้ใช้</p>
        ) : filtered.map(u => (
          <button key={u.id} onClick={() => add(u.id)} disabled={loading}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#f5f8ff] text-left text-sm">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                 style={{ backgroundColor: '#2979ff' }}>
              {u.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[#1a2744] truncate">{u.name}</p>
              <p className="text-xs text-[#94a3b8] truncate">{u.email}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: ROLE_STYLE[u.role]?.bg ?? '#f5f8ff', color: ROLE_STYLE[u.role]?.text ?? '#4a6080' }}>
              {ROLE_LABEL[u.role] ?? u.role}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── UserChip ─────────────────────────────────────────────────────────────────

function UserChip({ user, onRemove }: { user: ModuleUser; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm"
         style={{ backgroundColor: '#f5f8ff', borderColor: '#dce6f9' }}>
      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
           style={{ backgroundColor: '#1d6ae5' }}>
        {user.name.charAt(0)}
      </div>
      <span className="font-medium text-[#1a2744] text-xs">{user.name}</span>
      <span className="text-[10px] text-[#94a3b8]">{user.department ?? ''}</span>
      <button onClick={onRemove}
        className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-100 ml-0.5">
        <X className="w-3 h-3 text-red-400" />
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PermissionsPage() {
  const [moduleRoles, setModuleRoles]     = useState<Record<string, string[]>>({});
  const [modulePerms, setModulePerms]     = useState<Record<string, PermGrouped>>({});
  const [allUsers, setAllUsers]           = useState<UserOption[]>([]);
  const [loading, setLoading]             = useState(true);
  const [savingMod, setSavingMod]         = useState<string | null>(null);
  const [toast, setToast]                 = useState('');
  const [toastErr, setToastErr]           = useState('');

  // which panel is open per module: null | 'admin' | 'user'
  const [addOpen, setAddOpen] = useState<Record<string, 'admin' | 'user' | null>>({});

  const showToast = (msg: string, err = false) => {
    if (err) setToastErr(msg); else setToast(msg);
    setTimeout(() => { setToast(''); setToastErr(''); }, 3000);
  };

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<{ success: boolean; data: Record<string, string[]> }>('/settings/module-access'),
      api.get<{ success: boolean; data: Record<string, PermGrouped> }>('/settings/permissions'),
      api.get<{ success: boolean; data: UserOption[] }>('/settings/users?limit=500&active=true'),
    ]).then(([access, perms, users]) => {
      if (access.success) setModuleRoles(access.data);
      if (perms.success)  setModulePerms(perms.data);
      if (users.success)  setAllUsers(users.data);
    }).catch(() => {})
    .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleRole = async (mod: string, role: string) => {
    const current = moduleRoles[mod] ?? [...ALL_ROLES];
    const next    = current.includes(role)
      ? current.filter(r => r !== role)
      : [...current, role];
    setSavingMod(mod);
    try {
      await api.put(`/settings/module-access/${mod}`, { roles: next });
      setModuleRoles(p => ({ ...p, [mod]: next }));
      showToast(`บันทึกสิทธิ์ ${MODULE_META[mod as Mod].label} สำเร็จ`);
    } catch (e) {
      showToast((e as Error).message, true);
    } finally {
      setSavingMod(null);
    }
  };

  const removePermission = async (mod: string, userId: number) => {
    if (!confirm('ถอดสิทธิ์ผู้ใช้นี้?')) return;
    try {
      await api.delete(`/settings/permissions/${userId}/${mod}`);
      showToast('ถอดสิทธิ์สำเร็จ');
      load();
    } catch (e) {
      showToast((e as Error).message, true);
    }
  };

  const togglePanel = (mod: string, panel: 'admin' | 'user') => {
    setAddOpen(p => ({ ...p, [mod]: p[mod] === panel ? null : panel }));
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-8 w-48 rounded" />
        {[1,2,3].map(i => <div key={i} className="skeleton h-48 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <Toast msg={toast || toastErr} err={!!toastErr} onClose={() => { setToast(''); setToastErr(''); }} />

      <div>
        <h1 className="text-xl font-bold text-[#1a2744]">สิทธิ์การใช้งานโมดูล</h1>
        <p className="text-sm text-[#4a6080] mt-0.5">กำหนดกลุ่มผู้ใช้ที่เข้าถึงได้ และสิทธิ์รายบุคคลสำหรับแต่ละโมดูล</p>
      </div>

      {MODULES.map(mod => {
        const meta    = MODULE_META[mod];
        const roles   = moduleRoles[mod] ?? [...ALL_ROLES];
        const perms   = modulePerms[mod] ?? { admins: [], users: [] };
        const saving  = savingMod === mod;
        const panel   = addOpen[mod] ?? null;

        const adminIds = new Set([...perms.admins, ...perms.users].map(u => u.id));

        return (
          <div key={mod} className="card space-y-4">
            {/* Module header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ backgroundColor: meta.bg }}>
                <Shield className="w-5 h-5" style={{ color: meta.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#1a2744]">{meta.label}</p>
                <p className="text-xs text-[#4a6080]">{meta.desc}</p>
              </div>
              {saving && <Loader2 className="w-4 h-4 animate-spin text-[#1d6ae5]" />}
            </div>

            {/* Role access */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Users className="w-3.5 h-3.5 text-[#4a6080]" />
                <p className="text-xs font-semibold text-[#4a6080] uppercase tracking-wide">กลุ่มผู้ใช้ที่เข้าถึงได้</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {ALL_ROLES.map(role => {
                  const on = roles.includes(role);
                  const s  = ROLE_STYLE[role];
                  return (
                    <button key={role} onClick={() => toggleRole(mod, role)} disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all disabled:opacity-50"
                      style={{
                        backgroundColor: on ? s.bg : 'white',
                        color: on ? s.text : '#94a3b8',
                        borderColor: on ? s.text + '66' : '#dce6f9',
                      }}>
                      {on && <Check className="w-3 h-3" />}
                      {ROLE_LABEL[role]}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-[#94a3b8] mt-1.5">
                admin และ executive เข้าถึงได้ทุกโมดูลเสมอ
              </p>
            </div>

            <div className="border-t border-[#dce6f9]" />

            {/* ─── Module admins ─────────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#4a6080]" />
                  <p className="text-xs font-semibold text-[#4a6080] uppercase tracking-wide">Admin โมดูล</p>
                </div>
                <button onClick={() => togglePanel(mod, 'admin')}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
                  style={{ backgroundColor: '#eff4ff', color: '#1d6ae5' }}>
                  {panel === 'admin' ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  {panel === 'admin' ? 'ยกเลิก' : 'เพิ่ม Admin'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {perms.admins.length === 0 && panel !== 'admin' && (
                  <p className="text-xs text-[#94a3b8]">ยังไม่มี Admin โมดูลนี้</p>
                )}
                {perms.admins.map(admin => (
                  <UserChip key={admin.id} user={admin} onRemove={() => removePermission(mod, admin.id)} />
                ))}
              </div>

              {panel === 'admin' && (
                <AddUserPanel
                  mod={mod} level="ADMIN" existingIds={adminIds} allUsers={allUsers}
                  onAdded={load} onClose={() => setAddOpen(p => ({ ...p, [mod]: null }))}
                  onError={msg => showToast(msg, true)}
                />
              )}
            </div>

            <div className="border-t border-[#dce6f9]" />

            {/* ─── Individual user access ────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#4a6080]" />
                  <p className="text-xs font-semibold text-[#4a6080] uppercase tracking-wide">สิทธิ์รายบุคคล</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                    เข้าถึงได้ (ไม่ใช่ Admin)
                  </span>
                </div>
                <button onClick={() => togglePanel(mod, 'user')}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
                  style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                  {panel === 'user' ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  {panel === 'user' ? 'ยกเลิก' : 'เพิ่มรายบุคคล'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {perms.users.length === 0 && panel !== 'user' && (
                  <p className="text-xs text-[#94a3b8]">ยังไม่มีผู้ใช้รายบุคคล</p>
                )}
                {perms.users.map(u => (
                  <UserChip key={u.id} user={u} onRemove={() => removePermission(mod, u.id)} />
                ))}
              </div>

              {panel === 'user' && (
                <AddUserPanel
                  mod={mod} level="USER" existingIds={adminIds} allUsers={allUsers}
                  onAdded={load} onClose={() => setAddOpen(p => ({ ...p, [mod]: null }))}
                  onError={msg => showToast(msg, true)}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
