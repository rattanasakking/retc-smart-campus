'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Save, Building2, Link2, GraduationCap, Eye, EyeOff,
  Upload, Check, AlertTriangle, Loader2, Plus, X, Star, MessageSquare,
} from 'lucide-react';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type SettingsMap = Record<string, string>;

interface AcYear {
  id: number; year: number; semester: number;
  startDate: string; endDate: string; isCurrent: boolean;
}

interface YearGroup {
  year: number;
  sem1: AcYear | null;
  sem2: AcYear | null;
  isCurrent: boolean;
}

interface YearForm {
  year: string;
  sem1Start: string; sem1End: string;
  sem2Start: string; sem2End: string;
}

const EMPTY_YEAR: YearForm = { year: '', sem1Start: '', sem1End: '', sem2Start: '', sem2End: '' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByYear(rows: AcYear[]): YearGroup[] {
  const map = new Map<number, YearGroup>();
  for (const r of rows) {
    if (!map.has(r.year)) map.set(r.year, { year: r.year, sem1: null, sem2: null, isCurrent: false });
    const g = map.get(r.year)!;
    if (r.semester === 1) g.sem1 = r;
    if (r.semester === 2) g.sem2 = r;
    if (r.isCurrent) g.isCurrent = true;
  }
  return Array.from(map.values()).sort((a, b) => b.year - a.year);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>{label}</label>
      {children}
    </div>
  );
}

function CardSection({ title, borderColor = '#f0f4ff', children }: {
  title: React.ReactNode; borderColor?: string; children: React.ReactNode;
}) {
  return (
    <div className="card space-y-4">
      <div className="pb-3 text-sm font-semibold" style={{ color: '#1a2744', borderBottom: `1px solid ${borderColor}` }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function SecretField({ label, value, show, onChange, onToggle }: {
  label: string; value: string; show: boolean;
  onChange: (v: string) => void; onToggle: () => void;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••••••••••"
          className="input-field pr-10"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
        >
          {show
            ? <EyeOff className="w-4 h-4" style={{ color: '#4a6080' }} />
            : <Eye    className="w-4 h-4" style={{ color: '#4a6080' }} />
          }
        </button>
      </div>
    </Field>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GeneralPage() {
  const [tab, setTab]               = useState(0);
  const [settings, setSettings]     = useState<SettingsMap>({});
  const [loading, setLoading]       = useState(true);

  // Logo
  const [logoFile, setLogoFile]     = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [dragOver, setDragOver]     = useState(false);
  const fileRef                     = useRef<HTMLInputElement>(null);

  // Saving
  const [saving0, setSaving0]       = useState(false);
  const [saving1, setSaving1]       = useState(false);

  // Secret field visibility
  const [show, setShow]             = useState<Record<string, boolean>>({});

  // Academic years
  const [years, setYears]           = useState<AcYear[]>([]);
  const [yearModal, setYearModal]   = useState(false);
  const [yearForm, setYearForm]     = useState<YearForm>(EMPTY_YEAR);
  const [yearFormErr, setYearFormErr] = useState('');
  const [savingYear, setSavingYear] = useState(false);
  const [editGroup, setEditGroup]   = useState<YearGroup | null>(null);

  // Test LINE
  const [testOpen, setTestOpen]     = useState(false);
  const [testMsg, setTestMsg]       = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Toast
  const [toast, setToast]           = useState('');
  const [toastErr, setToastErr]     = useState('');
  const toastTimer                  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, isErr = false) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (isErr) { setToastErr(msg); setToast(''); }
    else       { setToast(msg);   setToastErr(''); }
    toastTimer.current = setTimeout(() => { setToast(''); setToastErr(''); }, 3500);
  };

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get<{ data: SettingsMap }>('/settings/general');
      setSettings(res.data ?? {});
    } catch (e: unknown) {
      showToast((e as Error).message, true);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchYears = useCallback(async () => {
    try {
      const res = await api.get<{ data: AcYear[] }>('/settings/academic-years');
      setYears(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchSettings(); fetchYears(); }, [fetchSettings, fetchYears]);

  // ── Settings helpers ───────────────────────────────────────────────────────

  const set   = (k: string, v: string) => setSettings((s) => ({ ...s, [k]: v }));
  const tog   = (k: string) => setShow((s) => ({ ...s, [k]: !s[k] }));

  // ── Logo upload ────────────────────────────────────────────────────────────

  const handleLogoFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Save Tab 0 ─────────────────────────────────────────────────────────────

  const save0 = async () => {
    setSaving0(true);
    try {
      let logo_url = settings.logo_url ?? '';
      if (logoFile && logoPreview) {
        const res = await api.post<{ data: { logo_url: string } }>(
          '/settings/general/upload-logo',
          { imageData: logoPreview, fileName: logoFile.name }
        );
        logo_url = res.data.logo_url;
        setLogoFile(null);
      }
      await api.put('/settings/general', {
        school_name:    settings.school_name    ?? '',
        school_name_en: settings.school_name_en ?? '',
        address:        settings.address        ?? '',
        phone:          settings.phone          ?? '',
        email:          settings.email          ?? '',
        website:        settings.website        ?? '',
        logo_url,
      });
      setSettings((s) => ({ ...s, logo_url }));
      showToast('บันทึกข้อมูลวิทยาลัยสำเร็จ');
    } catch (e: unknown) {
      showToast((e as Error).message, true);
    } finally {
      setSaving0(false);
    }
  };

  // ── Save Tab 1 ─────────────────────────────────────────────────────────────

  const save1 = async () => {
    setSaving1(true);
    try {
      await api.put('/settings/general', {
        line_channel_id:      settings.line_channel_id      ?? '',
        line_channel_secret:  settings.line_channel_secret  ?? '',
        line_notify_token:    settings.line_notify_token    ?? '',
        line_messaging_token: settings.line_messaging_token ?? '',
        google_client_id:     settings.google_client_id     ?? '',
        google_client_secret: settings.google_client_secret ?? '',
      });
      showToast('บันทึกการตั้งค่าการเชื่อมต่อสำเร็จ');
    } catch (e: unknown) {
      showToast((e as Error).message, true);
    } finally {
      setSaving1(false);
    }
  };

  // ── Test LINE ──────────────────────────────────────────────────────────────

  const handleTestLine = async () => {
    setTestSending(true);
    setTestResult(null);
    try {
      await api.post('/settings/test-line', {
        token:   settings.line_notify_token || undefined,
        message: testMsg.trim() || undefined,
      });
      setTestResult({ ok: true, msg: 'ส่งข้อความสำเร็จ ✅' });
    } catch (e: unknown) {
      setTestResult({ ok: false, msg: (e as Error).message });
    } finally {
      setTestSending(false);
    }
  };

  // ── Academic Years ─────────────────────────────────────────────────────────

  const setCurrent = async (g: YearGroup) => {
    const id = g.sem1?.id ?? g.sem2?.id;
    if (!id) return;
    try {
      await api.put(`/settings/academic-years/${id}/set-current`, {});
      showToast(`ตั้งปีการศึกษา ${g.year} เป็นปัจจุบันสำเร็จ`);
      fetchYears();
    } catch (e: unknown) { showToast((e as Error).message, true); }
  };

  const openAddYear = () => {
    setEditGroup(null);
    setYearForm(EMPTY_YEAR);
    setYearFormErr('');
    setYearModal(true);
  };

  const openEditYear = (g: YearGroup) => {
    setEditGroup(g);
    setYearForm({
      year:     String(g.year),
      sem1Start: g.sem1?.startDate.substring(0, 10) ?? '',
      sem1End:   g.sem1?.endDate.substring(0, 10)   ?? '',
      sem2Start: g.sem2?.startDate.substring(0, 10) ?? '',
      sem2End:   g.sem2?.endDate.substring(0, 10)   ?? '',
    });
    setYearFormErr('');
    setYearModal(true);
  };

  const saveYear = async () => {
    const { year, sem1Start, sem1End, sem2Start, sem2End } = yearForm;
    if (!year)                      { setYearFormErr('กรุณากรอกปีการศึกษา'); return; }
    if (!sem1Start || !sem1End)     { setYearFormErr('กรุณากรอกวันที่ภาค 1'); return; }
    setSavingYear(true); setYearFormErr('');
    try {
      const yr = parseInt(year);
      if (editGroup) {
        if (editGroup.sem1)
          await api.put(`/settings/academic-years/${editGroup.sem1.id}`, { year: yr, semester: 1, startDate: sem1Start, endDate: sem1End });
        else
          await api.post('/settings/academic-years', { year: yr, semester: 1, startDate: sem1Start, endDate: sem1End });

        if (sem2Start && sem2End) {
          if (editGroup.sem2)
            await api.put(`/settings/academic-years/${editGroup.sem2.id}`, { year: yr, semester: 2, startDate: sem2Start, endDate: sem2End });
          else
            await api.post('/settings/academic-years', { year: yr, semester: 2, startDate: sem2Start, endDate: sem2End });
        }
        showToast('แก้ไขปีการศึกษาสำเร็จ');
      } else {
        await api.post('/settings/academic-years', { year: yr, semester: 1, startDate: sem1Start, endDate: sem1End });
        if (sem2Start && sem2End)
          await api.post('/settings/academic-years', { year: yr, semester: 2, startDate: sem2Start, endDate: sem2End });
        showToast('เพิ่มปีการศึกษาสำเร็จ');
      }
      setYearModal(false);
      fetchYears();
    } catch (e: unknown) {
      setYearFormErr((e as Error).message);
    } finally {
      setSavingYear(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const yearGroups = groupByYear(years);
  const callbackUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/auth/google/callback`
    : '';

  const TABS = [
    { id: 0, label: 'ข้อมูลวิทยาลัย', Icon: Building2    },
    { id: 1, label: 'LINE & Google',   Icon: Link2        },
    { id: 2, label: 'ปีการศึกษา',     Icon: GraduationCap },
  ];

  return (
    <div className="space-y-5 max-w-2xl">

      {/* Toast */}
      {(toast || toastErr) && (
        <div
          className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 ${
            toastErr
              ? 'bg-red-50 border border-red-200 text-red-600'
              : 'bg-green-50 border border-green-200 text-green-700'
          }`}
        >
          {toastErr ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast || toastErr}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>ตั้งค่าทั่วไป</h1>
        <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>ข้อมูลวิทยาลัย, การเชื่อมต่อ และปีการศึกษา</p>
      </div>

      {/* Tab bar */}
      <div className="flex" style={{ borderBottom: '1px solid #dce6f9' }}>
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors"
            style={
              tab === id
                ? { color: '#1d6ae5', borderBottom: '2px solid #1d6ae5', marginBottom: -1 }
                : { color: '#4a6080' }
            }
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 gap-3" style={{ color: '#94a3b8' }}>
          <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลด...
        </div>
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════
              Tab 0 — ข้อมูลวิทยาลัย
          ═══════════════════════════════════════════════════ */}
          {tab === 0 && (
            <div className="space-y-4">

              {/* Logo */}
              <CardSection title="Logo วิทยาลัย">
                <div className="flex items-start gap-4">
                  {/* Preview */}
                  <div
                    className="w-24 h-24 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={{ border: '2px dashed #dce6f9', backgroundColor: '#f5f8ff' }}
                  >
                    {(logoPreview || settings.logo_url) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoPreview ?? settings.logo_url}
                        alt="Logo"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <Building2 className="w-8 h-8" style={{ color: '#dce6f9' }} />
                    )}
                  </div>

                  {/* Drop zone */}
                  <div
                    className="flex-1 rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-colors"
                    style={{
                      borderColor: dragOver ? '#1d6ae5' : '#dce6f9',
                      backgroundColor: dragOver ? '#e8f0fe' : 'transparent',
                    }}
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault(); setDragOver(false);
                      const f = e.dataTransfer.files[0];
                      if (f) handleLogoFile(f);
                    }}
                  >
                    <Upload className="w-5 h-5 mx-auto mb-1.5" style={{ color: '#94a3b8' }} />
                    <p className="text-xs" style={{ color: '#4a6080' }}>
                      <span style={{ color: '#1d6ae5', fontWeight: 600 }}>คลิก</span> หรือลากไฟล์มาวาง
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: '#94a3b8' }}>PNG, JPG, SVG (สูงสุด 2 MB)</p>
                    {logoFile && (
                      <p className="text-[11px] mt-1.5 font-medium" style={{ color: '#0d9068' }}>
                        ✓ {logoFile.name}
                      </p>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); }}
                  />
                </div>
              </CardSection>

              {/* School info */}
              <CardSection title="ข้อมูลสถานศึกษา">
                <Field label="ชื่อวิทยาลัย (ภาษาไทย) *">
                  <input className="input-field" value={settings.school_name ?? ''}
                    onChange={(e) => set('school_name', e.target.value)}
                    placeholder="วิทยาลัยเทคนิคร้อยเอ็ด" />
                </Field>
                <Field label="ชื่อวิทยาลัย (ภาษาอังกฤษ)">
                  <input className="input-field" value={settings.school_name_en ?? ''}
                    onChange={(e) => set('school_name_en', e.target.value)}
                    placeholder="Roi Et Technical College" />
                </Field>
                <Field label="ที่อยู่">
                  <textarea className="input-field resize-none" rows={3}
                    value={settings.address ?? ''}
                    onChange={(e) => set('address', e.target.value)}
                    placeholder="106 ถ.สุริยเดช ต.ในเมือง อ.เมือง จ.ร้อยเอ็ด 45000" />
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="เบอร์โทร">
                    <input className="input-field" value={settings.phone ?? ''}
                      onChange={(e) => set('phone', e.target.value)} placeholder="043-511-296" />
                  </Field>
                  <Field label="Email">
                    <input className="input-field" type="email" value={settings.email ?? ''}
                      onChange={(e) => set('email', e.target.value)} placeholder="info@retc.ac.th" />
                  </Field>
                  <Field label="Website">
                    <input className="input-field" value={settings.website ?? ''}
                      onChange={(e) => set('website', e.target.value)} placeholder="www.retc.ac.th" />
                  </Field>
                </div>
              </CardSection>

              <div className="flex justify-end">
                <button onClick={save0} disabled={saving0} className="btn-primary flex items-center gap-2">
                  {saving0 ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  บันทึก
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              Tab 1 — LINE & Google
          ═══════════════════════════════════════════════════ */}
          {tab === 1 && (
            <div className="space-y-4">

              {/* LINE Login */}
              <CardSection title={<ServiceHeader color="#06c755" label="LINE Login" />}>
                <Field label="Channel ID">
                  <input className="input-field" value={settings.line_channel_id ?? ''}
                    onChange={(e) => set('line_channel_id', e.target.value)} placeholder="1234567890" />
                </Field>
                <SecretField label="Channel Secret"
                  value={settings.line_channel_secret ?? ''}
                  show={!!show.line_channel_secret}
                  onChange={(v) => set('line_channel_secret', v)}
                  onToggle={() => tog('line_channel_secret')} />
              </CardSection>

              {/* LINE Notify */}
              <CardSection title={<ServiceHeader color="#06c755" label="LINE Notify" />}>
                <SecretField label="Notify Token"
                  value={settings.line_notify_token ?? ''}
                  show={!!show.line_notify_token}
                  onChange={(v) => set('line_notify_token', v)}
                  onToggle={() => tog('line_notify_token')} />
                <button
                  onClick={() => { setTestOpen(true); setTestResult(null); setTestMsg(''); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#e6f9f0', color: '#0d9068' }}
                >
                  <MessageSquare className="w-3.5 h-3.5" /> ทดสอบส่งข้อความ
                </button>
              </CardSection>

              {/* LINE Messaging API */}
              <CardSection title={<ServiceHeader color="#06c755" label="LINE Messaging API" />}>
                <SecretField label="Channel Access Token"
                  value={settings.line_messaging_token ?? ''}
                  show={!!show.line_messaging_token}
                  onChange={(v) => set('line_messaging_token', v)}
                  onToggle={() => tog('line_messaging_token')} />
              </CardSection>

              {/* Google OAuth */}
              <CardSection title={<ServiceHeader color="#4285f4" label="Google OAuth" />}>
                <Field label="Client ID">
                  <input className="input-field" value={settings.google_client_id ?? ''}
                    onChange={(e) => set('google_client_id', e.target.value)}
                    placeholder="xxxx.apps.googleusercontent.com" />
                </Field>
                <SecretField label="Client Secret"
                  value={settings.google_client_secret ?? ''}
                  show={!!show.google_client_secret}
                  onChange={(v) => set('google_client_secret', v)}
                  onToggle={() => tog('google_client_secret')} />
                <Field label="Callback URL (Auto-generated)">
                  <div
                    className="input-field cursor-text text-xs select-all"
                    style={{ backgroundColor: '#f5f8ff', color: '#4a6080' }}
                  >
                    {callbackUrl || 'https://app.retc.ac.th/api/auth/google/callback'}
                  </div>
                </Field>
              </CardSection>

              <div className="flex justify-end">
                <button onClick={save1} disabled={saving1} className="btn-primary flex items-center gap-2">
                  {saving1 ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  บันทึก
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              Tab 2 — ปีการศึกษา
          ═══════════════════════════════════════════════════ */}
          {tab === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: '#4a6080' }}>
                  กำหนดช่วงเวลาของแต่ละภาคเรียน
                </p>
                <button onClick={openAddYear} className="btn-primary flex items-center gap-1.5 text-xs py-2">
                  <Plus className="w-3.5 h-3.5" /> เพิ่มปีใหม่
                </button>
              </div>

              <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #dce6f9' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f0f4ff', backgroundColor: '#f8faff' }}>
                      {['ปีการศึกษา', 'ภาคเรียน 1', 'ภาคเรียน 2', 'สถานะ', ''].map((h, i) => (
                        <th key={i} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#94a3b8' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {yearGroups.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-sm" style={{ color: '#94a3b8' }}>
                          ยังไม่มีปีการศึกษา — คลิก <strong>เพิ่มปีใหม่</strong>
                        </td>
                      </tr>
                    ) : yearGroups.map((g) => (
                      <tr key={g.year} style={{ borderBottom: '1px solid #f5f8ff' }} className="hover:bg-[#fafbff] transition-colors group">
                        <td className="px-4 py-3">
                          <span className="font-bold" style={{ color: '#1a2744' }}>{g.year}</span>
                        </td>
                        <td className="px-4 py-3">
                          {g.sem1 ? (
                            <p className="text-xs leading-relaxed" style={{ color: '#1a2744' }}>
                              {fmtDate(g.sem1.startDate)}<br />
                              <span style={{ color: '#94a3b8' }}>–</span> {fmtDate(g.sem1.endDate)}
                            </p>
                          ) : <span className="text-xs" style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {g.sem2 ? (
                            <p className="text-xs leading-relaxed" style={{ color: '#1a2744' }}>
                              {fmtDate(g.sem2.startDate)}<br />
                              <span style={{ color: '#94a3b8' }}>–</span> {fmtDate(g.sem2.endDate)}
                            </p>
                          ) : <span className="text-xs" style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {g.isCurrent ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                              style={{ backgroundColor: '#fffbeb', color: '#b45309' }}
                            >
                              <Star className="w-3 h-3 fill-[#b45309]" /> ปัจจุบัน
                            </span>
                          ) : (
                            <button
                              onClick={() => setCurrent(g)}
                              className="text-[11px] px-2 py-0.5 rounded-full transition-colors hover:bg-[#fffbeb] hover:text-[#b45309]"
                              style={{ color: '#94a3b8', border: '1px solid #dce6f9' }}
                            >
                              ตั้งเป็นปัจจุบัน
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditYear(g)}
                              className="text-xs px-2.5 py-1 rounded-lg transition-colors"
                              style={{ color: '#1d6ae5', backgroundColor: '#e8f0fe' }}
                            >
                              แก้ไข
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════
          Test LINE Modal
      ═══════════════════════════════════════════════════ */}
      {testOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => !testSending && setTestOpen(false)} />
          <div
            className="relative w-full max-w-sm rounded-2xl shadow-xl z-10"
            style={{ backgroundColor: '#ffffff', border: '1px solid #dce6f9' }}
          >
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f4ff' }}>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: '#06c755' }} />
                <p className="font-semibold text-sm" style={{ color: '#1a2744' }}>ทดสอบ LINE Notify</p>
              </div>
              <button onClick={() => setTestOpen(false)} className="p-1 rounded hover:bg-[#f5f8ff]">
                <X className="w-4 h-4" style={{ color: '#4a6080' }} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <Field label="ข้อความทดสอบ (ไม่บังคับ)">
                <input
                  className="input-field"
                  value={testMsg}
                  onChange={(e) => setTestMsg(e.target.value)}
                  placeholder="ทดสอบ LINE Notify จาก RETC Smart Campus"
                />
              </Field>
              {testResult && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                  style={
                    testResult.ok
                      ? { backgroundColor: '#e6f9f0', color: '#0d9068' }
                      : { backgroundColor: '#fef2f2', color: '#dc2626' }
                  }
                >
                  {testResult.ok
                    ? <Check className="w-4 h-4 flex-shrink-0" />
                    : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                  {testResult.msg}
                </div>
              )}
              {!settings.line_notify_token && (
                <p className="text-xs" style={{ color: '#94a3b8' }}>
                  ⚠️ กรุณาตั้งค่า LINE Notify Token ก่อนทดสอบ
                </p>
              )}
            </div>
            <div className="px-5 py-3 flex justify-end gap-2" style={{ borderTop: '1px solid #f0f4ff' }}>
              <button onClick={() => setTestOpen(false)} className="btn-secondary text-sm">ปิด</button>
              <button
                onClick={handleTestLine}
                disabled={testSending || !settings.line_notify_token}
                className="btn-primary text-sm flex items-center gap-2"
              >
                {testSending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                ส่งข้อความ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          Add / Edit Year Modal
      ═══════════════════════════════════════════════════ */}
      {yearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => !savingYear && setYearModal(false)}
          />
          <div
            className="relative w-full max-w-lg rounded-2xl shadow-xl z-10"
            style={{ backgroundColor: '#ffffff', border: '1px solid #dce6f9' }}
          >
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #dce6f9' }}>
              <p className="font-semibold" style={{ color: '#1a2744' }}>
                {editGroup ? `แก้ไขปีการศึกษา ${editGroup.year}` : 'เพิ่มปีการศึกษา'}
              </p>
              <button onClick={() => setYearModal(false)} className="p-1.5 rounded-lg hover:bg-[#f5f8ff]">
                <X className="w-4 h-4" style={{ color: '#4a6080' }} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {yearFormErr && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {yearFormErr}
                </div>
              )}

              <Field label="ปีการศึกษา (พ.ศ.) *">
                <input
                  className="input-field"
                  type="number"
                  value={yearForm.year}
                  onChange={(e) => setYearForm((f) => ({ ...f, year: e.target.value }))}
                  placeholder="2568"
                  disabled={!!editGroup}
                />
              </Field>

              {/* Semester 1 */}
              <div>
                <p
                  className="text-xs font-semibold mb-3 pb-2"
                  style={{ color: '#1d6ae5', borderBottom: '1px solid #e8f0fe' }}
                >
                  ภาคเรียน 1 *
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="วันที่เริ่ม *">
                    <input
                      className="input-field" type="date"
                      value={yearForm.sem1Start}
                      onChange={(e) => setYearForm((f) => ({ ...f, sem1Start: e.target.value }))}
                    />
                  </Field>
                  <Field label="วันที่สิ้นสุด *">
                    <input
                      className="input-field" type="date"
                      value={yearForm.sem1End}
                      onChange={(e) => setYearForm((f) => ({ ...f, sem1End: e.target.value }))}
                    />
                  </Field>
                </div>
              </div>

              {/* Semester 2 */}
              <div>
                <p
                  className="text-xs font-semibold mb-3 pb-2"
                  style={{ color: '#0d9068', borderBottom: '1px solid #e6f9f0' }}
                >
                  ภาคเรียน 2 <span className="font-normal" style={{ color: '#94a3b8' }}>(ไม่บังคับ)</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="วันที่เริ่ม">
                    <input
                      className="input-field" type="date"
                      value={yearForm.sem2Start}
                      onChange={(e) => setYearForm((f) => ({ ...f, sem2Start: e.target.value }))}
                    />
                  </Field>
                  <Field label="วันที่สิ้นสุด">
                    <input
                      className="input-field" type="date"
                      value={yearForm.sem2End}
                      onChange={(e) => setYearForm((f) => ({ ...f, sem2End: e.target.value }))}
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 flex justify-end gap-2" style={{ borderTop: '1px solid #dce6f9' }}>
              <button onClick={() => setYearModal(false)} disabled={savingYear} className="btn-secondary">
                ยกเลิก
              </button>
              <button onClick={saveYear} disabled={savingYear} className="btn-primary flex items-center gap-2">
                {savingYear && <Loader2 className="w-4 h-4 animate-spin" />}
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function ServiceHeader({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}
