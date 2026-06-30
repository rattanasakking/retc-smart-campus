'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  Search, Plus, X, Pencil, ToggleLeft, ToggleRight,
  Loader2, Users, ChevronLeft, ChevronRight, CalendarDays, Camera, Trash2,
  Phone, Mail, MapPin, CreditCard, GraduationCap, UserCircle,
} from 'lucide-react';
import { api, USER_KEY } from '@/lib/api';
import ThaiDatePicker from '@/components/ui/ThaiDatePicker';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PersonnelType { id: number; name: string }
interface Division     { id: number; name: string; code: string }
interface WorkUnit     { id: number; name: string; code: string }
interface Department   { id: number; name: string; code: string }

interface Personnel {
  id: number;
  nationalId?: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  position?: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  nickname?: string;
  birthDate?: string;
  startDate?: string;
  avatar?: string;
  personnelTypeId?: number;
  personnelType?: PersonnelType;
  educationLevel?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  address?: string;
  divisionId?: number;
  division?: Division;
  workUnitId?: number;
  workUnit?: WorkUnit;
  departmentId?: number;
  deptGroup?: { id: number; name: string };
  lineUserId?: string;
  createdAt: string;
}

interface LeaveBalance {
  leaveType: { id: number; name: string; icon?: string };
  quota: number;
  used: number;
  remaining: number;
}

interface LeaveRequest {
  id: number;
  leaveType: { name: string; icon?: string };
  startDate: string;
  endDate: string;
  totalDays: number;
  isHalfDay: boolean;
  status: string;
  reason: string;
}

interface FormState {
  nationalId: string; name: string; email: string;
  password: string; role: string; position: string; isSuperAdmin: boolean;
  personnelTypeId: string; educationLevel: string;
  divisionId: string; workUnitId: string; departmentId: string;
  phone: string; nickname: string; birthDate: string; startDate: string;
  emergencyContact: string; emergencyPhone: string; address: string;
}

const BLANK: FormState = {
  nationalId: '', name: '', email: '', password: '',
  role: 'staff', position: '', isSuperAdmin: false,
  personnelTypeId: '', educationLevel: '',
  divisionId: '', workUnitId: '', departmentId: '',
  phone: '', nickname: '', birthDate: '', startDate: '',
  emergencyContact: '', emergencyPhone: '', address: '',
};

const ROLE_LABEL: Record<string, string> = {
  admin: 'ผู้ดูแลระบบ', executive: 'ผู้บริหาร', teacher: 'ครู/อาจารย์', staff: 'บุคลากร',
};

// ตำแหน่งจัดการผ่าน /settings/positions (ดึงจาก DB)
const LEGACY_POSITION_LABEL: Record<string, string> = {
  director: 'ผู้อำนวยการ', deputy_director: 'รองผู้อำนวยการ',
  division_chief: 'หัวหน้าฝ่าย', work_unit_chief: 'หัวหน้างาน',
  department_chief: 'หัวหน้าแผนก', teacher: 'ครู/อาจารย์',
  specialist: 'ผู้เชี่ยวชาญ', officer: 'เจ้าหน้าที่', worker: 'พนักงาน',
};
function posLabel(pos: string | null | undefined) {
  if (!pos) return '';
  return LEGACY_POSITION_LABEL[pos] ?? pos;
}

const EDUCATION_LEVELS = ['ต่ำกว่าปริญญาตรี', 'ปริญญาตรี', 'ปริญญาโท', 'ปริญญาเอก', 'อื่นๆ'];
const LIMIT = 20;

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PersonnelPage() {
  const [isAdmin, setIsAdmin] = useState(false);

  const [items, setItems]           = useState<Personnel[]>([]);
  const [personnelTypes, setTypes]  = useState<PersonnelType[]>([]);
  const [divisions, setDivisions]   = useState<Division[]>([]);
  const [workUnits, setWorkUnits]   = useState<WorkUnit[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions]   = useState<string[]>([]);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);

  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActive]   = useState('');

  // modal
  const [showModal, setShowModal]   = useState(false);
  const [editTarget, setEditTarget] = useState<Personnel | null>(null);
  const [modalTab, setModalTab]     = useState<'info' | 'work' | 'password'>('info');
  const [form, setForm]             = useState<FormState>(BLANK);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Personnel | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // leave balance popup
  const [showBalance, setShowBalance]     = useState(false);
  const [balanceTarget, setBalanceTarget] = useState<Personnel | null>(null);
  const [balances, setBalances]           = useState<LeaveBalance[]>([]);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // view detail popup
  const [viewTarget, setViewTarget]   = useState<Personnel | null>(null);
  const [viewTab, setViewTab]         = useState<'info' | 'leave'>('info');
  const [viewLeaves, setViewLeaves]   = useState<LeaveRequest[]>([]);
  const [viewLeaveLoading, setViewLeaveLoading] = useState(false);
  const [viewBalances, setViewBalances] = useState<LeaveBalance[]>([]);

  const totalPages = Math.ceil(total / LIMIT);

  useEffect(() => {
    // อ่านจาก localStorage ก่อนเพื่อ render ทันที
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setIsAdmin(parsed.isSuperAdmin || parsed.role === 'admin'
          || (parsed.modulePermissions ?? []).includes('PERSONNEL'));
      } catch { /* */ }
    }
    // fetch ใหม่เพื่อให้ modulePermissions ถูกต้องเสมอ
    api.get<{ data: { isSuperAdmin: boolean; role: string; modulePermissions?: string[] } }>('/auth/me')
      .then((res) => {
        const u = res.data;
        setIsAdmin(u.isSuperAdmin || u.role === 'admin' || (u.modulePermissions ?? []).includes('PERSONNEL'));
        if (raw) {
          try { localStorage.setItem(USER_KEY, JSON.stringify({ ...JSON.parse(raw), modulePermissions: u.modulePermissions ?? [] })); }
          catch { /* */ }
        }
      }).catch(() => { /* ถ้า fetch ไม่ได้ ใช้ค่าจาก localStorage แทน */ });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search)       params.set('search', search);
      if (typeFilter)   params.set('personnelTypeId', typeFilter);
      if (roleFilter)   params.set('role', roleFilter);
      if (activeFilter) params.set('isActive', activeFilter);
      const res = await api.get<any>(`/personnel?${params}`);
      setItems(res.data ?? []);
      setTotal(res.pagination?.total ?? 0);
    } finally { setLoading(false); }
  }, [page, search, typeFilter, roleFilter, activeFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get<any>('/personnel/types?active=true').then((r) => setTypes(r.data ?? []));
    api.get<any>('/settings/divisions').then((r) => setDivisions(r.data ?? []));
    api.get<any>('/settings/departments').then((r) => setDepartments(r.data ?? []));
    api.get<any>('/settings/positions').then((r) => setPositions(r.data ?? []));
  }, []);

  function openNew() {
    setEditTarget(null);
    setForm(BLANK);
    setModalTab('info');
    setFormError('');
    setAvatarBase64(null);
    setAvatarPreview(null);
    setShowModal(true);
  }

  function openEdit(p: Personnel) {
    setEditTarget(p);
    setAvatarBase64(null);
    setAvatarPreview(p.avatar ?? null);
    setForm({
      nationalId: p.nationalId ?? '',
      name: p.name, email: p.email, password: '',
      role: p.role, position: p.position ?? '',
      isSuperAdmin: p.isSuperAdmin,
      personnelTypeId: String(p.personnelTypeId ?? ''),
      educationLevel: p.educationLevel ?? '',
      divisionId: String(p.divisionId ?? ''), workUnitId: String(p.workUnitId ?? ''),
      departmentId: String(p.departmentId ?? ''),
      phone: p.phone ?? '', nickname: p.nickname ?? '',
      birthDate: p.birthDate ? p.birthDate.slice(0, 10) : '',
      startDate: p.startDate ? p.startDate.slice(0, 10) : '',
      emergencyContact: p.emergencyContact ?? '', emergencyPhone: p.emergencyPhone ?? '',
      address: p.address ?? '',
    });
    setModalTab('info');
    setFormError('');
    setShowModal(true);
  }

  async function openBalance(p: Personnel) {
    setBalanceTarget(p);
    setBalances([]);
    setShowBalance(true);
    setBalanceLoading(true);
    try {
      const res = await api.get<any>(`/personnel/leave-balance/${p.id}`);
      setBalances(res.data?.balances ?? []);
    } finally { setBalanceLoading(false); }
  }

  async function openView(p: Personnel) {
    setViewTarget(p);
    setViewTab('info');
    setViewLeaves([]);
    setViewBalances([]);
    setViewLeaveLoading(true);
    try {
      const [leavesRes, balRes] = await Promise.all([
        api.get<any>(`/personnel/leaves?userId=${p.id}&limit=20`),
        api.get<any>(`/personnel/leave-balance/${p.id}`),
      ]);
      setViewLeaves(leavesRes.data ?? []);
      setViewBalances(balRes.data?.balances ?? []);
    } finally { setViewLeaveLoading(false); }
  }

  useEffect(() => {
    if (form.divisionId) {
      api.get<any>(`/settings/workunits?divisionId=${form.divisionId}`)
        .then((r) => setWorkUnits(r.data ?? []))
        .catch(() => setWorkUnits([]));
    } else {
      setWorkUnits([]);
    }
  }, [form.divisionId]);

  function setF(k: keyof FormState, v: string | boolean) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function handleAvatarFile(file: File) {
    if (!file.type.startsWith('image/')) { alert('รองรับเฉพาะไฟล์รูปภาพ'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('ไฟล์รูปภาพต้องไม่เกิน 5 MB'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = e.target?.result as string;
      setAvatarBase64(b64);
      setAvatarPreview(b64);
    };
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!form.name || !form.email || !form.role) {
      setFormError('กรุณากรอก ชื่อ, อีเมล, และบทบาท');
      return;
    }
    if (!editTarget && (!form.password || form.password.length < 8)) {
      setFormError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload: Record<string, unknown> = { ...form };
      if (!payload.password) delete payload.password;
      if (avatarBase64) payload.avatar = avatarBase64;
      if (editTarget) {
        await api.put(`/personnel/${editTarget.id}`, payload);
      } else {
        await api.post('/personnel', payload);
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      setFormError(e.message ?? 'เกิดข้อผิดพลาด');
    } finally { setSaving(false); }
  }

  async function savePassword() {
    if (!editTarget) return;
    if (!form.password || form.password.length < 8) {
      setFormError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await api.put(`/personnel/${editTarget.id}/reset-password`, { newPassword: form.password });
      setShowModal(false);
    } catch (e: any) {
      setFormError(e.message ?? 'เกิดข้อผิดพลาด');
    } finally { setSaving(false); }
  }

  async function toggleActive(p: Personnel) {
    await api.put(`/personnel/${p.id}/toggle`, {});
    load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/personnel/${deleteTarget.id}`);
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      alert(e.message ?? 'เกิดข้อผิดพลาดในการลบ');
    } finally { setDeleting(false); }
  }

  const inp = 'border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400';
  const sel = `${inp} bg-white`;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Users size={22} /> โมดูลบุคลากร
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">ทั้งหมด {total} คน</p>
        </div>
        {isAdmin && (
          <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            <Plus size={16} /> เพิ่มบุคลากร
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="ค้นหาชื่อ, อีเมล, รหัส..."
            className="border rounded-lg pl-9 pr-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className={`${sel} w-44`}>
          <option value="">-- ประเภทบุคลากร --</option>
          {personnelTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className={`${sel} w-36`}>
          <option value="">-- บทบาท --</option>
          {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={activeFilter} onChange={(e) => { setActive(e.target.value); setPage(1); }} className={`${sel} w-36`}>
          <option value="">-- สถานะ --</option>
          <option value="true">ใช้งาน</option>
          <option value="false">ปิดการใช้งาน</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16 text-gray-400">
            <Loader2 className="animate-spin mr-2" size={20} /> กำลังโหลด...
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users size={40} className="mx-auto mb-2 opacity-40" /> ไม่พบข้อมูลบุคลากร
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs uppercase">
                  <th className="py-3 px-4 text-left">บุคลากร</th>
                  <th className="py-3 px-4 text-left hidden md:table-cell">ประเภท / บทบาท</th>
                  <th className="py-3 px-4 text-left hidden lg:table-cell">หน่วยงาน</th>
                  <th className="py-3 px-4 text-center">สถานะ</th>
                  <th className="py-3 px-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <button onClick={() => openView(p)} className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity">
                        {p.avatar
                          ? <img src={p.avatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                          : <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">{p.name[0]}</div>
                        }
                        <div>
                          <div className="font-medium text-gray-800 hover:text-blue-600 transition-colors">{p.name}</div>
                          <div className="text-xs text-gray-400">{p.email}</div>
                          {p.nationalId && <div className="text-xs text-gray-400">บัตรฯ: {p.nationalId}</div>}
                        </div>
                      </button>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <div className="text-gray-700">{p.position ? (posLabel(p.position) ?? p.position) : (p.personnelType?.name ?? '—')}</div>
                      <span className="inline-block mt-0.5 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        {ROLE_LABEL[p.role] ?? p.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-gray-500 text-xs">
                      {p.division?.name && <div>{p.division.name}</div>}
                      {p.workUnit?.name && <div className="text-gray-400">{p.workUnit.name}</div>}
                      {p.deptGroup?.name && <div className="text-gray-400">{p.deptGroup.name}</div>}
                      {!p.division?.name && !p.deptGroup?.name && '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${p.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {p.isActive ? 'ใช้งาน' : 'ปิด'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openBalance(p)} title="วันลาคงเหลือ" className="p-1.5 rounded hover:bg-blue-50 text-blue-500">
                          <CalendarDays size={15} />
                        </button>
                        {isAdmin && (
                          <>
                            <button onClick={() => openEdit(p)} title="แก้ไข" className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
                              <Pencil size={15} />
                            </button>
                            <button onClick={() => toggleActive(p)} title={p.isActive ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
                              {p.isActive ? <ToggleRight size={16} className="text-green-500" /> : <ToggleLeft size={16} />}
                            </button>
                            <button onClick={() => setDeleteTarget(p)} title="ลบบุคลากร"
                              className="p-1.5 rounded hover:bg-red-50 text-red-400">
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-gray-500">
            <span>หน้า {page} / {totalPages} (ทั้งหมด {total} คน)</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30">
                <ChevronLeft size={16} />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── View Detail Popup ───────────────────────────────────────────────── */}
      {viewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" style={{ border: '1px solid #dce6f9' }}>
            {/* Header */}
            <div className="flex items-center gap-4 px-6 py-4 flex-shrink-0" style={{ background: 'linear-gradient(135deg,#0f1e3c,#1d3a72)', borderRadius: '1rem 1rem 0 0' }}>
              {viewTarget.avatar
                ? <img src={viewTarget.avatar} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-white/30 flex-shrink-0" />
                : <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">{viewTarget.name[0]}</div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-white truncate">{viewTarget.name}</p>
                <p className="text-sm text-white/70">{viewTarget.email}</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white">{ROLE_LABEL[viewTarget.role] ?? viewTarget.role}</span>
                  {viewTarget.position && <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white">{posLabel(viewTarget.position) ?? viewTarget.position}</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${viewTarget.isActive ? 'bg-green-400/30 text-green-100' : 'bg-red-400/30 text-red-100'}`}>
                    {viewTarget.isActive ? 'ใช้งาน' : 'ปิดการใช้งาน'}
                  </span>
                </div>
              </div>
              <button onClick={() => setViewTarget(null)} className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
                <X size={16} className="text-white" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b flex-shrink-0" style={{ borderColor: '#dce6f9' }}>
              {[['info','ข้อมูลส่วนตัว'],['leave','ข้อมูลการลา']] .map(([tab, label]) => (
                <button key={tab} onClick={() => setViewTab(tab as 'info' | 'leave')}
                  className="px-5 py-3 text-sm font-medium transition-colors"
                  style={viewTab === tab
                    ? { color: '#1d6ae5', borderBottom: '2px solid #1d6ae5', marginBottom: -1 }
                    : { color: '#4a6080' }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
              {viewTab === 'info' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { Icon: CreditCard, label: 'เลขบัตรประชาชน', value: viewTarget.nationalId },
                      { Icon: Phone, label: 'โทรศัพท์', value: viewTarget.phone },
                      { Icon: Mail, label: 'อีเมล', value: viewTarget.email },
                      { Icon: UserCircle, label: 'ชื่อเล่น', value: viewTarget.nickname },
                      { Icon: GraduationCap, label: 'ระดับการศึกษา', value: viewTarget.educationLevel },
                    ].map(({ Icon, label, value }) => value ? (
                      <div key={label} className="flex items-start gap-2.5">
                        <Icon size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#4a6080' }} />
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: '#94a3b8' }}>{label}</p>
                          <p className="text-sm" style={{ color: '#1a2744' }}>{value}</p>
                        </div>
                      </div>
                    ) : null)}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'วันเกิด', value: viewTarget.birthDate ? new Date(viewTarget.birthDate).toLocaleDateString('th-TH', { dateStyle: 'medium' }) : null },
                      { label: 'วันเริ่มงาน', value: viewTarget.startDate ? new Date(viewTarget.startDate).toLocaleDateString('th-TH', { dateStyle: 'medium' }) : null },
                      { label: 'ประเภทบุคลากร', value: viewTarget.personnelType?.name },
                    ].filter((x) => x.value).map(({ label, value }) => (
                      <div key={label} className="rounded-lg p-3" style={{ backgroundColor: '#f5f8ff' }}>
                        <p className="text-[10px] font-medium" style={{ color: '#94a3b8' }}>{label}</p>
                        <p className="text-sm font-medium mt-0.5" style={{ color: '#1a2744' }}>{value}</p>
                      </div>
                    ))}
                  </div>
                  {/* Organization */}
                  {(viewTarget.division || viewTarget.workUnit || viewTarget.deptGroup) && (
                    <div className="rounded-lg p-3 space-y-1" style={{ backgroundColor: '#f5f8ff' }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: '#4a6080' }}>โครงสร้างองค์กร</p>
                      {viewTarget.division && <p className="text-xs" style={{ color: '#1a2744' }}>ฝ่าย: {viewTarget.division.name}</p>}
                      {viewTarget.workUnit && <p className="text-xs" style={{ color: '#1a2744' }}>งาน: {viewTarget.workUnit.name}</p>}
                      {viewTarget.deptGroup && <p className="text-xs" style={{ color: '#1a2744' }}>แผนก: {viewTarget.deptGroup.name}</p>}
                    </div>
                  )}
                  {/* Emergency */}
                  {(viewTarget.emergencyContact || viewTarget.address) && (
                    <div className="rounded-lg p-3 space-y-1" style={{ backgroundColor: '#fff8f0', border: '1px solid #fed7aa' }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: '#b45309' }}>ข้อมูลฉุกเฉิน</p>
                      {viewTarget.emergencyContact && <p className="text-xs" style={{ color: '#1a2744' }}>ผู้ติดต่อ: {viewTarget.emergencyContact} {viewTarget.emergencyPhone ? `(${viewTarget.emergencyPhone})` : ''}</p>}
                      {viewTarget.address && (
                        <div className="flex items-start gap-1.5">
                          <MapPin size={11} className="mt-0.5 flex-shrink-0" style={{ color: '#b45309' }} />
                          <p className="text-xs" style={{ color: '#1a2744' }}>{viewTarget.address}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {viewTab === 'leave' && (
                <div className="space-y-4">
                  {/* Balance */}
                  {viewBalances.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-2" style={{ color: '#4a6080' }}>โควต้าการลาปีนี้</p>
                      <div className="grid grid-cols-2 gap-2">
                        {viewBalances.filter((b) => b.quota > 0).map((b) => (
                          <div key={b.leaveType.id} className="rounded-lg p-3" style={{ backgroundColor: '#f5f8ff', border: '1px solid #dce6f9' }}>
                            <p className="text-xs font-medium" style={{ color: '#1a2744' }}>{b.leaveType.icon} {b.leaveType.name}</p>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="text-lg font-bold" style={{ color: b.remaining <= 0 ? '#dc2626' : '#0d9068' }}>{b.remaining}</span>
                              <span className="text-xs" style={{ color: '#94a3b8' }}>/ {b.quota} วัน</span>
                            </div>
                            <p className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>ใช้ไปแล้ว {b.used} วัน</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* History */}
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: '#4a6080' }}>ประวัติการลา</p>
                    {viewLeaveLoading ? (
                      <div className="flex items-center justify-center py-8 gap-2" style={{ color: '#94a3b8' }}>
                        <Loader2 size={16} className="animate-spin" /> กำลังโหลด...
                      </div>
                    ) : viewLeaves.length === 0 ? (
                      <p className="text-center text-sm py-8" style={{ color: '#94a3b8' }}>ยังไม่มีประวัติการลา</p>
                    ) : (
                      <div className="space-y-2">
                        {viewLeaves.map((l) => {
                          const statusColor: Record<string,string> = { PENDING:'#b45309', APPROVED:'#0d9068', REJECTED:'#dc2626', CANCELLED:'#94a3b8' };
                          const statusLabel: Record<string,string> = { PENDING:'รออนุมัติ', APPROVED:'อนุมัติ', REJECTED:'ไม่อนุมัติ', CANCELLED:'ยกเลิก' };
                          return (
                            <div key={l.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ backgroundColor: '#f5f8ff', border: '1px solid #f0f4ff' }}>
                              <span className="text-lg flex-shrink-0">{l.leaveType.icon ?? '📋'}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: '#1a2744' }}>{l.leaveType.name}</p>
                                <p className="text-xs" style={{ color: '#4a6080' }}>
                                  {new Date(l.startDate).toLocaleDateString('th-TH',{dateStyle:'short'})}
                                  {l.startDate !== l.endDate && ` – ${new Date(l.endDate).toLocaleDateString('th-TH',{dateStyle:'short'})}`}
                                  {' '}({l.isHalfDay ? 'ครึ่งวัน' : `${l.totalDays} วัน`})
                                </p>
                              </div>
                              <span className="text-xs font-semibold flex-shrink-0 px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: statusColor[l.status] + '15', color: statusColor[l.status] }}>
                                {statusLabel[l.status] ?? l.status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-3 flex-shrink-0" style={{ borderTop: '1px solid #dce6f9' }}>
              {isAdmin && (
                <button onClick={() => { setViewTarget(null); openEdit(viewTarget!); }}
                  className="btn-secondary flex items-center gap-1.5 text-sm py-2">
                  <Pencil size={14} /> แก้ไขข้อมูล
                </button>
              )}
              <button onClick={() => setViewTarget(null)} className="btn-primary text-sm py-2 px-5">ปิด</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Leave Balance Popup ──────────────────────────────────────────────── */}
      {showBalance && balanceTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="font-semibold text-gray-800">วันลาคงเหลือ</h2>
                <p className="text-sm text-gray-500">{balanceTarget.name}</p>
              </div>
              <button onClick={() => setShowBalance(false)} className="p-1.5 rounded-full hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {balanceLoading ? (
                <div className="flex justify-center py-8 text-gray-400">
                  <Loader2 className="animate-spin" size={20} />
                </div>
              ) : balances.length === 0 ? (
                <p className="text-center text-gray-400 py-8">ยังไม่มีข้อมูลวันลา</p>
              ) : (
                balances.map((b) => (
                  <div key={b.leaveType.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm text-gray-700">
                      {b.leaveType.icon} {b.leaveType.name}
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-800">
                        เหลือ <span className="text-blue-600">{b.remaining}</span> / {b.quota} วัน
                      </div>
                      <div className="text-xs text-gray-400">ใช้ไปแล้ว {b.used} วัน</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirm Modal ────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">ยืนยันการลบบุคลากร</h3>
                <p className="text-sm text-gray-500 mt-0.5">การลบจะไม่สามารถกู้คืนได้</p>
              </div>
            </div>
            <div className="bg-red-50 rounded-lg px-4 py-3 text-sm text-red-700">
              <span className="font-medium">{deleteTarget.name}</span>
              <span className="text-red-500 ml-1">({deleteTarget.email})</span>
            </div>
            <p className="text-xs text-gray-400">
              หากบุคลากรมีใบลา งานซ่อม หรือบันทึกงานในระบบ จะไม่สามารถลบได้
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50">ยกเลิก</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                {deleting && <Loader2 size={14} className="animate-spin" />}
                ลบบุคลากร
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Add / Edit Modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
            {/* header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-gray-800">
                {editTarget ? 'แก้ไขข้อมูลบุคลากร' : 'เพิ่มบุคลากรใหม่'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-full hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            {/* tabs */}
            <div className="flex border-b text-sm">
              {(['info', 'work', 'password'] as const).map((t) => (
                <button key={t} onClick={() => setModalTab(t)}
                  className={`px-4 py-2.5 font-medium border-b-2 transition-colors ${modalTab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {t === 'info' ? 'ส่วนตัว' : t === 'work' ? 'การทำงาน' : 'รหัสผ่าน'}
                </button>
              ))}
            </div>

            {/* body */}
            <div className="overflow-y-auto p-4 space-y-3 flex-1">
              {formError && (
                <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{formError}</div>
              )}

              {modalTab === 'info' && (
                <>
                  {/* Avatar upload */}
                  <div className="flex flex-col items-center gap-2 pb-2">
                    <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-input')?.click()}>
                      {avatarPreview
                        ? <img src={avatarPreview} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-blue-200" />
                        : <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold border-2 border-dashed border-blue-300">
                            {form.name ? form.name[0] : <Camera size={24} />}
                          </div>
                      }
                      <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={20} className="text-white" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">คลิกเพื่ออัพโหลดรูปโปรไฟล์ (ไม่เกิน 5 MB)</p>
                    <input id="avatar-input" type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarFile(f); e.target.value = ''; }} />
                    {avatarBase64 && (
                      <button type="button" onClick={() => { setAvatarBase64(null); setAvatarPreview(editTarget?.avatar ?? null); }}
                        className="text-xs text-red-400 hover:underline">ยกเลิกรูปใหม่</button>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">เลขบัตรประจำตัวประชาชน</label>
                    <input value={form.nationalId} onChange={(e) => setF('nationalId', e.target.value)} className={inp} placeholder="1XXXXXXXXXXXX" maxLength={13} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                    <input value={form.name} onChange={(e) => setF('name', e.target.value)} className={inp} placeholder="นายสมชาย ใจดี" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">ชื่อเล่น</label>
                      <input value={form.nickname} onChange={(e) => setF('nickname', e.target.value)} className={inp} placeholder="ชาย" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">วันเกิด</label>
                      <ThaiDatePicker value={form.birthDate} onChange={v => setF('birthDate', v)} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">อีเมล <span className="text-red-500">*</span></label>
                    <input type="email" value={form.email} onChange={(e) => setF('email', e.target.value)} className={inp} placeholder="name@retc.ac.th" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">เบอร์โทรศัพท์</label>
                    <input value={form.phone} onChange={(e) => setF('phone', e.target.value)} className={inp} placeholder="08XXXXXXXX" />
                  </div>
                  {!editTarget && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">รหัสผ่านเริ่มต้น <span className="text-red-500">*</span></label>
                      <input type="password" value={form.password} onChange={(e) => setF('password', e.target.value)} className={inp} placeholder="อย่างน้อย 8 ตัวอักษร" />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">ที่อยู่</label>
                    <textarea value={form.address} onChange={(e) => setF('address', e.target.value)} rows={2} className={inp} placeholder="ที่อยู่ปัจจุบัน" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">ผู้ติดต่อฉุกเฉิน</label>
                      <input value={form.emergencyContact} onChange={(e) => setF('emergencyContact', e.target.value)} className={inp} placeholder="ชื่อผู้ติดต่อ" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">เบอร์ฉุกเฉิน</label>
                      <input value={form.emergencyPhone} onChange={(e) => setF('emergencyPhone', e.target.value)} className={inp} placeholder="08XXXXXXXX" />
                    </div>
                  </div>
                </>
              )}

              {modalTab === 'work' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">บทบาท <span className="text-red-500">*</span></label>
                      <select value={form.role} onChange={(e) => setF('role', e.target.value)} className={sel}>
                        {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">ตำแหน่ง</label>
                      <select value={form.position} onChange={(e) => setF('position', e.target.value)} className={sel}>
                        <option value="">-- เลือกตำแหน่ง --</option>
                        {positions.map((p) => <option key={p} value={p}>{p}</option>)}
                        {/* แสดงค่าเดิม (enum) ถ้ายังไม่อยู่ในรายการใหม่ */}
                        {form.position && !positions.includes(form.position) && (
                          <option value={form.position}>{posLabel(form.position)}</option>
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">ประเภทบุคลากร</label>
                      <select value={form.personnelTypeId} onChange={(e) => setF('personnelTypeId', e.target.value)} className={sel}>
                        <option value="">-- เลือก --</option>
                        {personnelTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">ระดับการศึกษา</label>
                      <select value={form.educationLevel} onChange={(e) => setF('educationLevel', e.target.value)} className={sel}>
                        <option value="">-- เลือก --</option>
                        {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">วันเริ่มงาน</label>
                      <ThaiDatePicker value={form.startDate} onChange={v => setF('startDate', v)} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">ฝ่าย</label>
                    <select value={form.divisionId} onChange={(e) => { setF('divisionId', e.target.value); setF('workUnitId', ''); }} className={sel}>
                      <option value="">-- เลือก --</option>
                      {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  {workUnits.length > 0 && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">งาน</label>
                      <select value={form.workUnitId} onChange={(e) => setF('workUnitId', e.target.value)} className={sel}>
                        <option value="">-- เลือก --</option>
                        {workUnits.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">แผนกวิชา</label>
                    <select value={form.departmentId} onChange={(e) => setF('departmentId', e.target.value)} className={sel}>
                      <option value="">-- เลือก --</option>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  {(form.role === 'admin' || form.role === 'executive') && (
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.isSuperAdmin}
                        onChange={(e) => setF('isSuperAdmin', e.target.checked)} className="rounded" />
                      เป็น Super Admin (เข้าถึงทุกระบบ)
                    </label>
                  )}
                </>
              )}

              {modalTab === 'password' && editTarget && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">รหัสผ่านใหม่</label>
                  <input type="password" value={form.password} onChange={(e) => setF('password', e.target.value)}
                    className={inp} placeholder="อย่างน้อย 8 ตัวอักษร" />
                  <p className="text-xs text-gray-400 mt-1">บุคลากรจะต้องใช้รหัสผ่านนี้ในการเข้าสู่ระบบครั้งถัดไป</p>
                </div>
              )}
            </div>

            {/* footer */}
            <div className="border-t p-4 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50">ยกเลิก</button>
              <button
                onClick={modalTab === 'password' ? savePassword : save}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {modalTab === 'password' ? 'บันทึกรหัสผ่าน' : editTarget ? 'บันทึกการแก้ไข' : 'เพิ่มบุคลากร'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
