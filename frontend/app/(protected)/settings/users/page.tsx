'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Search, Plus, X, ChevronLeft, ChevronRight, Eye, EyeOff,
  Phone, Mail, Building2, Calendar, Key, Shield, Check,
  AlertTriangle, Pencil, UserX, UserCheck, RefreshCw, Users,
} from 'lucide-react';
import { api, USER_KEY } from '@/lib/api';
import ThaiDatePicker from '@/components/ui/ThaiDatePicker';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Division  { id: number; name: string; code: string }
interface WorkUnit  { id: number; name: string; code: string; divisionId: number }
interface Department { id: number; name: string; code: string }

interface UserRow {
  id: number;
  employeeId: string;
  name: string;
  nickname: string | null;
  email: string;
  role: string;
  position: string | null;
  isSuperAdmin: boolean;
  isActive: boolean;
  phone: string | null;
  avatar: string | null;
  birthDate: string | null;
  startDate: string | null;
  lineUserId: string | null;
  division:  Division | null;
  workUnit:  WorkUnit | null;
  deptGroup: Department | null;
}

interface Pagination { total: number; page: number; limit: number; totalPages: number }

interface FormData {
  employeeId:   string;
  name:         string;
  nickname:     string;
  email:        string;
  phone:        string;
  birthDate:    string;
  role:         string;
  position:     string;
  divisionId:   string;
  workUnitId:   string;
  departmentId: string;
  isSuperAdmin: boolean;
  startDate:    string;
  password:     string;
  confirmPassword: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: 'executive', label: 'ผู้บริหาร' },
  { value: 'teacher',   label: 'ครู/อาจารย์' },
  { value: 'staff',     label: 'เจ้าหน้าที่' },
  { value: 'admin',     label: 'ผู้ดูแลระบบ' },
];

const ROLE_LABEL: Record<string, string> = {
  executive: 'ผู้บริหาร', teacher: 'ครู/อาจารย์', staff: 'เจ้าหน้าที่', admin: 'ผู้ดูแลระบบ',
};

const ROLE_BADGE: Record<string, { bg: string; text: string }> = {
  executive: { bg: '#fef2f2', text: '#dc2626' },
  teacher:   { bg: '#e8f0fe', text: '#1d6ae5' },
  staff:     { bg: '#e6f9f0', text: '#0d9068' },
  admin:     { bg: '#f3e8ff', text: '#7c3aed' },
};

const POSITION_OPTIONS = [
  { value: 'director',         label: 'ผู้อำนวยการ' },
  { value: 'deputy_director',  label: 'รองผู้อำนวยการ' },
  { value: 'division_chief',   label: 'หัวหน้าฝ่าย' },
  { value: 'work_unit_chief',  label: 'หัวหน้างาน' },
  { value: 'department_chief', label: 'หัวหน้าแผนก' },
  { value: 'teacher',          label: 'ครู/อาจารย์' },
  { value: 'specialist',       label: 'ผู้เชี่ยวชาญ' },
  { value: 'officer',          label: 'เจ้าหน้าที่' },
  { value: 'worker',           label: 'พนักงาน' },
];

const POSITION_LABEL: Record<string, string> = Object.fromEntries(
  POSITION_OPTIONS.map((p) => [p.value, p.label])
);

const EMPTY_FORM: FormData = {
  employeeId: '', name: '', nickname: '', email: '', phone: '', birthDate: '',
  role: 'staff', position: '', divisionId: '', workUnitId: '', departmentId: '',
  isSuperAdmin: false, startDate: '', password: '', confirmPassword: '',
};

// ─── Shared UI ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const s = ROLE_BADGE[role] ?? { bg: '#f1f5f9', text: '#64748b' };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}

function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ backgroundColor: '#2979ff', fontSize: size <= 8 ? 13 : 18 }}
    >
      {name.charAt(0)}
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

interface DetailModalProps {
  user: UserRow;
  isSuperAdminViewer: boolean;
  onClose: () => void;
  onEdit: (u: UserRow) => void;
  onToggle: (u: UserRow) => void;
  onResetPwd: (u: UserRow) => void;
}

function DetailModal({ user, isSuperAdminViewer, onClose, onEdit, onToggle, onResetPwd }: DetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-2xl shadow-xl overflow-hidden z-10"
        style={{ backgroundColor: '#ffffff', border: '1px solid #dce6f9' }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid #f0f4ff' }}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#f5f8ff] transition-colors"
          >
            <X className="w-4 h-4" style={{ color: '#4a6080' }} />
          </button>
          <div className="flex items-center gap-4">
            <Avatar name={user.name} size={14} />
            <div>
              <p className="text-lg font-bold" style={{ color: '#1a2744' }}>{user.name}</p>
              {user.nickname && <p className="text-sm" style={{ color: '#4a6080' }}>({user.nickname})</p>}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <RoleBadge role={user.role} />
                {user.position && (
                  <span className="text-[11px]" style={{ color: '#94a3b8' }}>
                    {POSITION_LABEL[user.position] ?? user.position}
                  </span>
                )}
                {!user.isActive && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-500">
                    ปิดบัญชี
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-3">
          {/* Org */}
          <div className="grid grid-cols-3 gap-3">
            {user.division && (
              <div className="rounded-lg p-3 text-center" style={{ backgroundColor: '#f5f8ff' }}>
                <p className="text-[10px] mb-1" style={{ color: '#94a3b8' }}>ฝ่าย</p>
                <p className="text-xs font-medium" style={{ color: '#1a2744' }}>{user.division.name}</p>
              </div>
            )}
            {user.workUnit && (
              <div className="rounded-lg p-3 text-center" style={{ backgroundColor: '#f5f8ff' }}>
                <p className="text-[10px] mb-1" style={{ color: '#94a3b8' }}>งาน</p>
                <p className="text-xs font-medium" style={{ color: '#1a2744' }}>{user.workUnit.name}</p>
              </div>
            )}
            {user.deptGroup && (
              <div className="rounded-lg p-3 text-center" style={{ backgroundColor: '#f5f8ff' }}>
                <p className="text-[10px] mb-1" style={{ color: '#94a3b8' }}>แผนก</p>
                <p className="text-xs font-medium" style={{ color: '#1a2744' }}>{user.deptGroup.name}</p>
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="space-y-2">
            <InfoRow Icon={Mail} label="อีเมล" value={user.email} />
            {user.phone && <InfoRow Icon={Phone} label="โทรศัพท์" value={user.phone} />}
            {user.employeeId && <InfoRow Icon={Shield} label="รหัสพนักงาน" value={user.employeeId} />}
            {user.startDate && (
              <InfoRow
                Icon={Calendar}
                label="วันที่เริ่มงาน"
                value={new Date(user.startDate).toLocaleDateString('th-TH')}
              />
            )}
          </div>

          {/* LINE badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: '#4a6080' }}>LINE:</span>
            {user.lineUserId ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-green-50 text-green-700 border border-green-200">
                <Check className="w-3 h-3" /> เชื่อมแล้ว
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-500">
                ยังไม่เชื่อม
              </span>
            )}
            {user.isSuperAdmin && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-[#f3e8ff] text-[#7c3aed]">
                <Shield className="w-3 h-3" /> SuperAdmin
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {isSuperAdminViewer && (
          <div
            className="px-6 py-3 flex items-center gap-2 flex-wrap"
            style={{ borderTop: '1px solid #f0f4ff' }}
          >
            <button
              onClick={() => onEdit(user)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: '#e8f0fe', color: '#1d6ae5' }}
            >
              <Pencil className="w-3.5 h-3.5" /> แก้ไข
            </button>
            <button
              onClick={() => onResetPwd(user)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: '#fffbeb', color: '#b45309' }}
            >
              <Key className="w-3.5 h-3.5" /> รีเซ็ตรหัสผ่าน
            </button>
            <button
              onClick={() => onToggle(user)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ml-auto`}
              style={
                user.isActive
                  ? { backgroundColor: '#fef2f2', color: '#dc2626' }
                  : { backgroundColor: '#e6f9f0', color: '#0d9068' }
              }
            >
              {user.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
              {user.isActive ? 'ปิดบัญชี' : 'เปิดบัญชี'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ Icon, label, value }: { Icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#94a3b8' }} />
      <span className="text-xs" style={{ color: '#94a3b8' }}>{label}:</span>
      <span className="text-xs" style={{ color: '#1a2744' }}>{value}</span>
    </div>
  );
}

// ─── Reset Password Modal ─────────────────────────────────────────────────────

function ResetPasswordModal({
  userName, onConfirm, onClose, loading,
}: { userName: string; onConfirm: (pwd: string) => void; onClose: () => void; loading: boolean }) {
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const err = pwd.length > 0 && pwd.length < 8
    ? 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
    : confirm.length > 0 && pwd !== confirm
    ? 'รหัสผ่านไม่ตรงกัน'
    : '';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-sm rounded-2xl shadow-xl z-10"
        style={{ backgroundColor: '#ffffff', border: '1px solid #dce6f9' }}
      >
        <div className="px-6 py-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fffbeb' }}>
              <Key className="w-5 h-5" style={{ color: '#b45309' }} />
            </div>
            <div>
              <p className="font-semibold" style={{ color: '#1a2744' }}>รีเซ็ตรหัสผ่าน</p>
              <p className="text-xs" style={{ color: '#4a6080' }}>{userName}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                placeholder="รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                className="input-field pr-10"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {show ? <EyeOff className="w-4 h-4 text-[#94a3b8]" /> : <Eye className="w-4 h-4 text-[#94a3b8]" />}
              </button>
            </div>
            <input
              type={show ? 'text' : 'password'}
              placeholder="ยืนยันรหัสผ่าน"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input-field"
            />
            {err && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {err}
              </p>
            )}
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={onClose} className="btn-secondary flex-1">ยกเลิก</button>
            <button
              onClick={() => onConfirm(pwd)}
              disabled={!pwd || !confirm || pwd !== confirm || pwd.length < 8 || loading}
              className="btn-primary flex-1"
            >
              {loading ? 'กำลังบันทึก...' : 'ยืนยัน'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Form Modal (Add / Edit) ──────────────────────────────────────────────────

interface FormModalProps {
  editUser:    UserRow | null;
  divisions:   Division[];
  allWorkUnits: WorkUnit[];
  departments: Department[];
  isSuperAdminViewer: boolean;
  onClose:     () => void;
  onSaved:     () => void;
}

function FormModal({
  editUser, divisions, allWorkUnits, departments, isSuperAdminViewer, onClose, onSaved,
}: FormModalProps) {
  const isEdit = !!editUser;
  const [tab, setTab]     = useState(0);
  const [form, setForm]   = useState<FormData>(
    editUser
      ? {
          employeeId:      editUser.employeeId,
          name:            editUser.name,
          nickname:        editUser.nickname ?? '',
          email:           editUser.email,
          phone:           editUser.phone ?? '',
          birthDate:       editUser.birthDate ? editUser.birthDate.substring(0, 10) : '',
          role:            editUser.role,
          position:        editUser.position ?? '',
          divisionId:      editUser.division?.id?.toString() ?? '',
          workUnitId:      editUser.workUnit?.id?.toString() ?? '',
          departmentId:    editUser.deptGroup?.id?.toString() ?? '',
          isSuperAdmin:    editUser.isSuperAdmin,
          startDate:       editUser.startDate ? editUser.startDate.substring(0, 10) : '',
          password:        '',
          confirmPassword: '',
        }
      : { ...EMPTY_FORM }
  );
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const filteredWorkUnits = form.divisionId
    ? allWorkUnits.filter((w) => w.divisionId === parseInt(form.divisionId))
    : allWorkUnits;

  const set = (k: keyof FormData, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleDivisionChange = (v: string) => {
    setForm((f) => ({ ...f, divisionId: v, workUnitId: '' }));
  };

  const validate = () => {
    if (!form.employeeId.trim()) return 'กรุณากรอกรหัสพนักงาน';
    if (!form.name.trim())       return 'กรุณากรอกชื่อ';
    if (!form.email.trim())      return 'กรุณากรอก Email';
    if (!form.role)              return 'กรุณาเลือก Role';
    if (!isEdit) {
      if (!form.password)           return 'กรุณากรอกรหัสผ่าน';
      if (form.password.length < 8) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
      if (form.password !== form.confirmPassword) return 'รหัสผ่านไม่ตรงกัน';
    }
    return '';
  };

  const handleSubmit = async () => {
    const e = validate();
    if (e) { setErr(e); return; }
    setSaving(true); setErr('');
    try {
      const body = {
        employeeId:   form.employeeId.trim(),
        name:         form.name.trim(),
        nickname:     form.nickname.trim() || null,
        email:        form.email.trim(),
        phone:        form.phone.trim() || null,
        birthDate:    form.birthDate || null,
        role:         form.role,
        position:     form.position || null,
        divisionId:   form.divisionId   ? parseInt(form.divisionId)   : null,
        workUnitId:   form.workUnitId   ? parseInt(form.workUnitId)   : null,
        departmentId: form.departmentId ? parseInt(form.departmentId) : null,
        isSuperAdmin: form.isSuperAdmin,
        startDate:    form.startDate || null,
        ...(!isEdit && { password: form.password }),
      };
      if (isEdit) {
        await api.put(`/settings/users/${editUser!.id}`, body);
      } else {
        await api.post('/settings/users', body);
      }
      onSaved();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  const tabs = isEdit
    ? ['ข้อมูลส่วนตัว', 'ตำแหน่ง/สังกัด']
    : ['ข้อมูลส่วนตัว', 'ตำแหน่ง/สังกัด', 'รหัสผ่าน'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-2xl shadow-xl z-10 flex flex-col max-h-[90vh]"
        style={{ backgroundColor: '#ffffff', border: '1px solid #dce6f9' }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #dce6f9' }}>
          <div className="flex items-center gap-2">
            <Users className="w-4.5 h-4.5" style={{ color: '#1d6ae5' }} />
            <p className="font-semibold" style={{ color: '#1a2744' }}>
              {isEdit ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f5f8ff] transition-colors">
            <X className="w-4 h-4" style={{ color: '#4a6080' }} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 gap-1 pt-3" style={{ borderBottom: '1px solid #dce6f9' }}>
          {tabs.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors"
              style={
                tab === i
                  ? { color: '#1d6ae5', borderBottom: '2px solid #1d6ae5' }
                  : { color: '#4a6080' }
              }
            >
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {err && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {err}
            </div>
          )}

          {/* Tab 0: ข้อมูลส่วนตัว */}
          {tab === 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#4a6080' }}>
                    เลขบัตรประจำตัวประชาชน *
                  </label>
                  <input
                    className="input-field font-mono"
                    value={form.employeeId}
                    onChange={(e) => set('employeeId', e.target.value)}
                    placeholder="x-xxxx-xxxxx-xx-x"
                    maxLength={13}
                    disabled={isEdit}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#4a6080' }}>ชื่อเล่น</label>
                  <input
                    className="input-field"
                    value={form.nickname}
                    onChange={(e) => set('nickname', e.target.value)}
                    placeholder="ชื่อเล่น"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#4a6080' }}>ชื่อ-นามสกุล *</label>
                <input
                  className="input-field"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="ชื่อ นามสกุล"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#4a6080' }}>Email *</label>
                <input
                  className="input-field"
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="email@retc.ac.th"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#4a6080' }}>เบอร์โทรศัพท์</label>
                  <input
                    className="input-field"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="08x-xxx-xxxx"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#4a6080' }}>วันเกิด</label>
                  <ThaiDatePicker value={form.birthDate} onChange={v => set('birthDate', v)} />
                </div>
              </div>
            </div>
          )}

          {/* Tab 1: ตำแหน่ง/สังกัด */}
          {tab === 1 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#4a6080' }}>Role *</label>
                  <select
                    className="input-field"
                    value={form.role}
                    onChange={(e) => set('role', e.target.value)}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#4a6080' }}>ตำแหน่ง</label>
                  <select
                    className="input-field"
                    value={form.position}
                    onChange={(e) => set('position', e.target.value)}
                  >
                    <option value="">-- เลือกตำแหน่ง --</option>
                    {POSITION_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#4a6080' }}>ฝ่าย</label>
                <select
                  className="input-field"
                  value={form.divisionId}
                  onChange={(e) => handleDivisionChange(e.target.value)}
                >
                  <option value="">-- เลือกฝ่าย --</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#4a6080' }}>
                  งาน {form.divisionId ? '' : <span style={{ color: '#94a3b8' }}>(เลือกฝ่ายก่อน)</span>}
                </label>
                <select
                  className="input-field"
                  value={form.workUnitId}
                  onChange={(e) => set('workUnitId', e.target.value)}
                  disabled={!form.divisionId}
                >
                  <option value="">-- เลือกงาน --</option>
                  {filteredWorkUnits.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#4a6080' }}>แผนกวิชา</label>
                <select
                  className="input-field"
                  value={form.departmentId}
                  onChange={(e) => set('departmentId', e.target.value)}
                >
                  <option value="">-- เลือกแผนก --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#4a6080' }}>วันที่เริ่มงาน</label>
                <ThaiDatePicker value={form.startDate} onChange={v => set('startDate', v)} />
              </div>
              {isSuperAdminViewer && (
                <div
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ backgroundColor: '#f3e8ff', border: '1px solid #e9d5ff' }}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" style={{ color: '#7c3aed' }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#7c3aed' }}>SuperAdmin</p>
                      <p className="text-xs" style={{ color: '#9d77c5' }}>เข้าถึงทุกการตั้งค่า</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => set('isSuperAdmin', !form.isSuperAdmin)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${form.isSuperAdmin ? 'bg-[#7c3aed]' : 'bg-gray-300'}`}
                  >
                    <span
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                      style={{ left: form.isSuperAdmin ? '1.25rem' : '0.125rem' }}
                    />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: รหัสผ่าน (เฉพาะสร้างใหม่) */}
          {tab === 2 && !isEdit && (
            <div className="space-y-3">
              <div className="relative">
                <label className="block text-xs font-medium mb-1" style={{ color: '#4a6080' }}>รหัสผ่าน *</label>
                <input
                  className="input-field pr-10"
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 bottom-2.5"
                >
                  {showPwd ? <EyeOff className="w-4 h-4 text-[#94a3b8]" /> : <Eye className="w-4 h-4 text-[#94a3b8]" />}
                </button>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#4a6080' }}>ยืนยันรหัสผ่าน *</label>
                <input
                  className="input-field"
                  type={showPwd ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => set('confirmPassword', e.target.value)}
                  placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                />
              </div>
              {form.password.length > 0 && form.password.length < 8 && (
                <p className="text-xs text-red-500">รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร</p>
              )}
              {form.confirmPassword.length > 0 && form.password !== form.confirmPassword && (
                <p className="text-xs text-red-500">รหัสผ่านไม่ตรงกัน</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center gap-2" style={{ borderTop: '1px solid #dce6f9' }}>
          <button onClick={onClose} className="btn-secondary">ยกเลิก</button>
          <div className="flex gap-2 ml-auto">
            {tab > 0 && (
              <button onClick={() => setTab(tab - 1)} className="btn-secondary">
                ← ก่อนหน้า
              </button>
            )}
            {tab < tabs.length - 1 ? (
              <button onClick={() => setTab(tab + 1)} className="btn-primary">
                ถัดไป →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={saving} className="btn-primary">
                {saving ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'สร้างผู้ใช้'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers]             = useState<UserRow[]>([]);
  const [pagination, setPagination]   = useState<Pagination>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filterRole, setFilterRole]   = useState('');
  const [filterDiv, setFilterDiv]     = useState('');
  const [page, setPage]               = useState(1);

  const [divisions, setDivisions]         = useState<Division[]>([]);
  const [allWorkUnits, setAllWorkUnits]   = useState<WorkUnit[]>([]);
  const [departments, setDepartments]     = useState<Department[]>([]);

  const [detailUser, setDetailUser]       = useState<UserRow | null>(null);
  const [formUser, setFormUser]           = useState<UserRow | null>(null);
  const [showForm, setShowForm]           = useState(false);
  const [resetPwdUser, setResetPwdUser]   = useState<UserRow | null>(null);
  const [resetLoading, setResetLoading]   = useState(false);

  const [toast, setToast]   = useState('');
  const [toastErr, setToastErr] = useState('');

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load current user permissions
  useEffect(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      try { const u = JSON.parse(raw); setIsSuperAdmin(!!u.isSuperAdmin); } catch { /* ignore */ }
    }
  }, []);

  // Load reference data once
  useEffect(() => {
    Promise.all([
      api.get<{ data: Division[] }>('/settings/divisions'),
      api.get<{ data: WorkUnit[] }>('/settings/workunits'),
      api.get<{ data: Department[] }>('/settings/departments'),
    ]).then(([d, w, dept]) => {
      setDivisions(d.data);
      setAllWorkUnits(w.data);
      setDepartments(dept.data);
    }).catch(() => {});
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search)     params.set('search', search);
      if (filterRole) params.set('role', filterRole);
      if (filterDiv)  params.set('divisionId', filterDiv);
      const res = await api.get<{ data: UserRow[]; pagination: Pagination }>(`/settings/users?${params}`);
      setUsers(res.data);
      setPagination(res.pagination);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [page, search, filterRole, filterDiv]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const showToast = (msg: string, isErr = false) => {
    if (isErr) setToastErr(msg); else setToast(msg);
    setTimeout(() => { setToast(''); setToastErr(''); }, 3000);
  };

  const handleToggle = async (u: UserRow) => {
    try {
      await api.put(`/settings/users/${u.id}/toggle`, {});
      showToast(`${u.isActive ? 'ปิด' : 'เปิด'}บัญชี ${u.name} สำเร็จ`);
      setDetailUser(null);
      loadUsers();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด', true);
    }
  };

  const handleResetPwd = async (newPwd: string) => {
    if (!resetPwdUser) return;
    setResetLoading(true);
    try {
      await api.put(`/settings/users/${resetPwdUser.id}/reset-password`, { newPassword: newPwd });
      showToast('รีเซ็ตรหัสผ่านสำเร็จ');
      setResetPwdUser(null);
      setDetailUser(null);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด', true);
    } finally {
      setResetLoading(false);
    }
  };

  const handleSearchChange = (v: string) => {
    setSearch(v);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setPage(1), 400);
  };

  return (
    <div className="space-y-4">
      {/* Toast */}
      {(toast || toastErr) && (
        <div
          className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 ${toastErr ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-green-50 border border-green-200 text-green-700'}`}
        >
          {toastErr ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast || toastErr}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>ผู้ใช้งานทั้งหมด</h1>
          <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>
            {pagination.total} รายการ
          </p>
        </div>
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <button
              className="btn-secondary flex items-center gap-1.5"
              title="นำเข้า Excel (ยังไม่พร้อมใช้)"
              disabled
            >
              <RefreshCw className="w-3.5 h-3.5" />
              นำเข้า Excel
            </button>
            <button
              onClick={() => { setFormUser(null); setShowForm(true); }}
              className="btn-primary flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> เพิ่มผู้ใช้
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[200px] max-w-xs"
          style={{ backgroundColor: '#ffffff', border: '1px solid #dce6f9' }}
        >
          <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, email, รหัสพนักงาน..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder-[#94a3b8]"
            style={{ color: '#1a2744' }}
          />
        </div>
        <select
          className="input-field w-auto"
          value={filterRole}
          onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
        >
          <option value="">ทุก Role</option>
          {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select
          className="input-field w-auto"
          value={filterDiv}
          onChange={(e) => { setFilterDiv(e.target.value); setPage(1); }}
        >
          <option value="">ทุกฝ่าย</option>
          {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #dce6f9' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #f0f4ff' }}>
                {['', 'ชื่อ', 'ตำแหน่ง', 'สังกัด', 'สถานะ', ''].map((h, i) => (
                  <th
                    key={i}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: '#94a3b8' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="skeleton h-4 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: '#94a3b8' }}>
                    ไม่พบข้อมูลผู้ใช้
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    style={{ borderBottom: '1px solid #f5f8ff' }}
                    className="hover:bg-[#f8faff] transition-colors"
                  >
                    {/* Avatar */}
                    <td className="pl-4 py-3 w-10">
                      <Avatar name={u.name} size={8} />
                    </td>
                    {/* Name */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDetailUser(u)}
                        className="text-left group"
                      >
                        <p className="font-medium group-hover:text-[#1d6ae5] transition-colors" style={{ color: '#1a2744' }}>
                          {u.name}
                        </p>
                        <p className="text-xs" style={{ color: '#4a6080' }}>{u.email}</p>
                      </button>
                    </td>
                    {/* Position + Role */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <RoleBadge role={u.role} />
                        {u.position && (
                          <span className="text-xs" style={{ color: '#94a3b8' }}>
                            {POSITION_LABEL[u.position] ?? u.position}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Org */}
                    <td className="px-4 py-3">
                      <p className="text-xs" style={{ color: '#1a2744' }}>
                        {u.division?.name ?? u.deptGroup?.name ?? '-'}
                      </p>
                      {u.workUnit && (
                        <p className="text-xs" style={{ color: '#94a3b8' }}>{u.workUnit.name}</p>
                      )}
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                        style={
                          u.isActive
                            ? { backgroundColor: '#e6f9f0', color: '#0d9068' }
                            : { backgroundColor: '#f1f5f9', color: '#94a3b8' }
                        }
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-[#0d9068]' : 'bg-[#94a3b8]'}`} />
                        {u.isActive ? 'ใช้งาน' : 'ปิดบัญชี'}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="pr-4 py-3">
                      {isSuperAdmin && (
                        <button
                          onClick={() => setDetailUser(u)}
                          className="p-1.5 rounded-lg hover:bg-[#e8f0fe] transition-colors"
                          title="ดูรายละเอียด"
                        >
                          <Pencil className="w-3.5 h-3.5" style={{ color: '#1d6ae5' }} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ borderTop: '1px solid #f0f4ff' }}
          >
            <p className="text-xs" style={{ color: '#4a6080' }}>
              {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} จาก {pagination.total} รายการ
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg disabled:opacity-40 hover:bg-[#f5f8ff] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" style={{ color: '#4a6080' }} />
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, pagination.totalPages - 4)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className="w-7 h-7 rounded-lg text-xs font-medium transition-colors"
                    style={
                      p === page
                        ? { backgroundColor: '#2979ff', color: '#ffffff' }
                        : { color: '#4a6080' }
                    }
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.totalPages}
                className="p-1.5 rounded-lg disabled:opacity-40 hover:bg-[#f5f8ff] transition-colors"
              >
                <ChevronRight className="w-4 h-4" style={{ color: '#4a6080' }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {detailUser && (
        <DetailModal
          user={detailUser}
          isSuperAdminViewer={isSuperAdmin}
          onClose={() => setDetailUser(null)}
          onEdit={(u) => { setFormUser(u); setShowForm(true); setDetailUser(null); }}
          onToggle={handleToggle}
          onResetPwd={(u) => { setResetPwdUser(u); setDetailUser(null); }}
        />
      )}

      {showForm && (
        <FormModal
          editUser={formUser}
          divisions={divisions}
          allWorkUnits={allWorkUnits}
          departments={departments}
          isSuperAdminViewer={isSuperAdmin}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            showToast(formUser ? 'แก้ไขผู้ใช้สำเร็จ' : 'สร้างผู้ใช้สำเร็จ');
            loadUsers();
          }}
        />
      )}

      {resetPwdUser && (
        <ResetPasswordModal
          userName={resetPwdUser.name}
          loading={resetLoading}
          onClose={() => setResetPwdUser(null)}
          onConfirm={handleResetPwd}
        />
      )}
    </div>
  );
}
