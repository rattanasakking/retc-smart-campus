'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, USER_KEY, TOKEN_KEY } from '@/lib/api';
import { Camera, Lock, Save, X, CheckCircle, Bell, Link2, Unlink, LogOut } from 'lucide-react';

interface UserProfile {
  id: number; name: string; email: string; employeeId: string;
  nationalId?: string | null;
  role: string; department?: string; phone?: string; nickname?: string;
  avatar?: string; position?: string;
  notifyByLine?: boolean; notifyByEmail?: boolean;
  lineUserId?: string | null; googleId?: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'ผู้ดูแลระบบ', executive: 'ผู้บริหาร',
  teacher: 'ครู/อาจารย์', staff: 'เจ้าหน้าที่',
};

function Toast({ msg, err, onClose }: { msg: string; err?: boolean; onClose: () => void }) {
  if (!msg) return null;
  return (
    <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white flex items-center gap-2 ${err ? 'bg-red-500' : 'bg-[#0d9068]'}`}>
      {err ? <X className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
      {msg}
      <button onClick={onClose}><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [toast, setToast]     = useState('');
  const [toastErr, setToastErr] = useState('');
  const imgRef = useRef<HTMLInputElement>(null);

  const [form, setForm]       = useState({ name: '', phone: '', nickname: '' });
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarBase64, setAvatarBase64]   = useState('');

  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [notifyForm, setNotifyForm] = useState({ notifyByLine: true, notifyByEmail: false });
  const [notifySaving, setNotifySaving] = useState(false);
  const [unlinking, setUnlinking] = useState<string | null>(null);

  const showToast = (msg: string, err = false) => {
    if (err) setToastErr(msg); else setToast(msg);
    setTimeout(() => { setToast(''); setToastErr(''); }, 3500);
  };

  const loadProfile = () =>
    api.get<{ success: boolean; data: UserProfile }>('/auth/me')
      .then(r => {
        if (r.success) {
          setProfile(r.data);
          setForm({ name: r.data.name, phone: r.data.phone ?? '', nickname: r.data.nickname ?? '' });
          if (r.data.avatar) setAvatarPreview(r.data.avatar);
          setNotifyForm({
            notifyByLine:  r.data.notifyByLine  !== false,
            notifyByEmail: r.data.notifyByEmail === true,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { loadProfile(); }, []);

  // Handle OAuth callback params
  useEffect(() => {
    const linked = searchParams.get('linked');
    const err    = searchParams.get('error');
    if (linked === 'line')   { showToast('เชื่อมต่อ LINE สำเร็จ'); loadProfile(); }
    if (linked === 'google') { showToast('เชื่อมต่อ Google สำเร็จ'); loadProfile(); }
    if (err) {
      const msgs: Record<string, string> = {
        already_linked_to_other: 'บัญชีนี้ถูกเชื่อมกับผู้ใช้รายอื่นแล้ว',
        session_expired: 'Session หมดอายุ กรุณาลองใหม่',
      };
      showToast(msgs[err] ?? `เกิดข้อผิดพลาด: ${err}`, true);
    }
  }, [searchParams]);

  const handleLinkLine = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { showToast('กรุณา login ใหม่', true); return; }
    window.location.href = `/api/auth/line/link?token=${encodeURIComponent(token)}`;
  };

  const handleLinkGoogle = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { showToast('กรุณา login ใหม่', true); return; }
    window.location.href = `/api/auth/google/link?token=${encodeURIComponent(token)}`;
  };

  const handleUnlink = async (provider: 'line' | 'google') => {
    setUnlinking(provider);
    try {
      await api.delete(`/auth/${provider}/unlink`);
      showToast(`ยกเลิกการเชื่อมต่อ ${provider === 'line' ? 'LINE' : 'Google'} สำเร็จ`);
      loadProfile();
    } catch (e) {
      showToast((e as Error).message, true);
    } finally { setUnlinking(null); }
  };

  const handleAvatar = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const b64 = e.target?.result as string;
      setAvatarPreview(b64);
      setAvatarBase64(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { showToast('กรุณาระบุชื่อ', true); return; }
    setSaving(true);
    try {
      const body: Record<string, string> = {
        name: form.name.trim(),
        phone: form.phone,
        nickname: form.nickname,
      };
      if (avatarBase64) body.avatar = avatarBase64;

      const r = await api.put<{ success: boolean; data: UserProfile }>('/auth/profile', body);
      if (r.success) {
        setProfile(r.data);
        setAvatarBase64('');
        // Update localStorage
        const stored = localStorage.getItem(USER_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          localStorage.setItem(USER_KEY, JSON.stringify({
            ...parsed, name: r.data.name,
            avatar: r.data.avatar,
          }));
        }
        showToast('บันทึกโปรไฟล์สำเร็จ');
      }
    } catch (e) {
      showToast((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  };

  const handlePwChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) { showToast('รหัสผ่านใหม่ไม่ตรงกัน', true); return; }
    if (pwForm.newPw.length < 8) { showToast('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร', true); return; }
    setPwSaving(true);
    try {
      await api.put('/auth/change-password', { currentPassword: pwForm.current, newPassword: pwForm.newPw });
      showToast('เปลี่ยนรหัสผ่านสำเร็จ');
      setPwForm({ current: '', newPw: '', confirm: '' });
    } catch (e) {
      showToast((e as Error).message, true);
    } finally {
      setPwSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    router.push('/login');
  };

  const handleNotifySave = async () => {
    setNotifySaving(true);
    try {
      await api.put('/settings/me/notifications', notifyForm);
      showToast('บันทึกการตั้งค่าการแจ้งเตือนสำเร็จ');
    } catch (e) {
      showToast((e as Error).message, true);
    } finally { setNotifySaving(false); }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-xl mx-auto space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto space-y-5">
      <Toast msg={toast || toastErr} err={!!toastErr} onClose={() => { setToast(''); setToastErr(''); }} />

      <h1 className="text-xl font-bold text-[#1a2744]">โปรไฟล์ของฉัน</h1>

      {/* ── Profile Form ─────────────────────────────────────────────────── */}
      <form onSubmit={handleSave} className="card space-y-4">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#dce6f9]">
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white"
                     style={{ backgroundColor: '#2979ff' }}>
                  {profile?.name?.charAt(0)}
                </div>
              )}
            </div>
            <button type="button"
              onClick={() => imgRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md"
              style={{ backgroundColor: '#1d6ae5' }}>
              <Camera className="w-4 h-4 text-white" />
            </button>
          </div>
          <input ref={imgRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatar(f); }} />
          {avatarBase64 && (
            <button type="button" onClick={() => { setAvatarBase64(''); setAvatarPreview(profile?.avatar ?? ''); }}
              className="text-xs text-red-500">ยกเลิกรูปใหม่</button>
          )}
        </div>

        {/* Read-only info */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl" style={{ backgroundColor: '#f5f8ff' }}>
          <div>
            <p className="text-xs text-[#94a3b8] mb-0.5">เลขบัตรประจำตัวประชาชน</p>
            <p className="text-sm font-medium text-[#1a2744]">{profile?.nationalId || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-[#94a3b8] mb-0.5">ตำแหน่ง / บทบาท</p>
            <p className="text-sm font-medium text-[#1a2744]">{profile?.position || ROLE_LABEL[profile?.role ?? ''] || profile?.role}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-[#94a3b8] mb-0.5">อีเมล</p>
            <p className="text-sm font-medium text-[#1a2744]">{profile?.email}</p>
          </div>
        </div>

        {/* Editable fields */}
        <div>
          <label className="block text-xs font-medium text-[#4a6080] mb-1">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            className="input-field" placeholder="ชื่อ นามสกุล" required />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#4a6080] mb-1">ชื่อเล่น</label>
          <input value={form.nickname} onChange={e => setForm(p => ({ ...p, nickname: e.target.value }))}
            className="input-field" placeholder="ชื่อเล่น" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#4a6080] mb-1">เบอร์โทรศัพท์</label>
          <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            className="input-field" placeholder="08x-xxx-xxxx" type="tel" />
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'กำลังบันทึก...' : 'บันทึกโปรไฟล์'}
        </button>
      </form>

      {/* ── Change Password ───────────────────────────────────────────────── */}
      <form onSubmit={handlePwChange} className="card space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#dce6f9]">
          <Lock className="w-4 h-4 text-[#1d6ae5]" />
          <h2 className="font-semibold text-[#1a2744]">เปลี่ยนรหัสผ่าน</h2>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#4a6080] mb-1">รหัสผ่านปัจจุบัน</label>
          <input value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
            type="password" className="input-field" placeholder="••••••••" required />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#4a6080] mb-1">รหัสผ่านใหม่</label>
          <input value={pwForm.newPw} onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))}
            type="password" className="input-field" placeholder="อย่างน้อย 8 ตัวอักษร" required />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#4a6080] mb-1">ยืนยันรหัสผ่านใหม่</label>
          <input value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
            type="password" className="input-field" placeholder="••••••••" required />
        </div>
        <button type="submit" disabled={pwSaving} className="btn-secondary w-full flex items-center justify-center gap-2">
          <Lock className="w-4 h-4" />
          {pwSaving ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
        </button>
      </form>

      {/* ── Social Account Links ─────────────────────────────────────────── */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#dce6f9]">
          <Link2 className="w-4 h-4 text-[#1d6ae5]" />
          <h2 className="font-semibold text-[#1a2744]">เชื่อมต่อบัญชี</h2>
        </div>

        {/* LINE */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: '#06C755' }}>L</div>
            <div>
              <p className="text-sm font-medium text-[#1a2744]">LINE</p>
              <p className="text-xs text-[#94a3b8]">{profile?.lineUserId ? 'เชื่อมต่อแล้ว' : 'ยังไม่เชื่อมต่อ'}</p>
            </div>
          </div>
          {profile?.lineUserId ? (
            <button onClick={() => handleUnlink('line')} disabled={unlinking === 'line'}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
              <Unlink className="w-3.5 h-3.5" />
              {unlinking === 'line' ? 'กำลังยกเลิก...' : 'ยกเลิก'}
            </button>
          ) : (
            <button onClick={handleLinkLine}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white transition-colors" style={{ backgroundColor: '#06C755' }}>
              <Link2 className="w-3.5 h-3.5" />
              เชื่อมต่อ LINE
            </button>
          )}
        </div>

        {/* Google */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: '#4285F4' }}>G</div>
            <div>
              <p className="text-sm font-medium text-[#1a2744]">Google</p>
              <p className="text-xs text-[#94a3b8]">{profile?.googleId ? 'เชื่อมต่อแล้ว' : 'ยังไม่เชื่อมต่อ'}</p>
            </div>
          </div>
          {profile?.googleId ? (
            <button onClick={() => handleUnlink('google')} disabled={unlinking === 'google'}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
              <Unlink className="w-3.5 h-3.5" />
              {unlinking === 'google' ? 'กำลังยกเลิก...' : 'ยกเลิก'}
            </button>
          ) : (
            <button onClick={handleLinkGoogle}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white transition-colors" style={{ backgroundColor: '#4285F4' }}>
              <Link2 className="w-3.5 h-3.5" />
              เชื่อมต่อ Google
            </button>
          )}
        </div>

        <p className="text-xs text-[#94a3b8]">หลังเชื่อมต่อแล้ว สามารถ login ด้วย LINE หรือ Google แทน email/password ได้</p>
      </div>

      {/* ── Notification Preferences ─────────────────────────────────────── */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#dce6f9]">
          <Bell className="w-4 h-4 text-[#1d6ae5]" />
          <h2 className="font-semibold text-[#1a2744]">การรับการแจ้งเตือน</h2>
        </div>

        {([
          { key: 'notifyByLine',  label: 'รับการแจ้งเตือนผ่าน LINE', desc: 'รับแจ้งเตือนสถานะการลา, อนุมัติ ฯลฯ ผ่าน LINE' },
          { key: 'notifyByEmail', label: 'รับการแจ้งเตือนผ่านอีเมล',  desc: 'รับแจ้งเตือนทางอีเมล (ต้องตั้งค่า SMTP)' },
        ] as const).map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#1a2744]">{label}</p>
              <p className="text-xs text-[#94a3b8] mt-0.5">{desc}</p>
            </div>
            <button
              onClick={() => setNotifyForm(p => ({ ...p, [key]: !p[key] }))}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${notifyForm[key] ? 'bg-green-500' : 'bg-gray-300'}`}
              role="switch"
              aria-checked={notifyForm[key]}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${notifyForm[key] ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        ))}

        <button onClick={handleNotifySave} disabled={notifySaving} className="btn-primary w-full flex items-center justify-center gap-2">
          <Save className="w-4 h-4" />
          {notifySaving ? 'กำลังบันทึก...' : 'บันทึกการแจ้งเตือน'}
        </button>
      </div>

      {/* ── Logout ───────────────────────────────────────────────────────── */}
      <div className="card">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-400">กำลังโหลด...</div>}>
      <ProfileContent />
    </Suspense>
  );
}
