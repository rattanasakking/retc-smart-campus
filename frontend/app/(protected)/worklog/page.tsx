'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ClipboardList, Plus, Check, AlertTriangle, Loader2,
  Pencil, Trash2, Send, Eye, Settings, X,
} from 'lucide-react';
import { api, USER_KEY } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkType { id: number; name: string; color: string; category: string; isActive: boolean }

interface WorkLog {
  id:         number;
  logDate:    string;
  title:      string;
  status:     string;
  workType:   WorkType | null;
  approvals:  { approver: { name: string } }[];
}

interface PendingLog extends WorkLog {
  user: { name: string; employeeId: string };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  draft:     { label: '📝 ร่าง',      bg: '#f1f5f9', text: '#64748b' },
  submitted: { label: '⏳ รออนุมัติ', bg: '#fffbeb', text: '#b45309' },
  approved:  { label: '✅ อนุมัติ',   bg: '#e6f9f0', text: '#0d9068' },
  rejected:  { label: '❌ ปฏิเสธ',   bg: '#fef2f2', text: '#dc2626' },
  returned:  { label: '🔄 ส่งคืน',   bg: '#e8f0fe', text: '#1d6ae5' },
};

const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear() + 543}`;
}

// ─── WorkType Settings ────────────────────────────────────────────────────────

function WorkTypeSettings({ isAdmin }: { isAdmin: boolean }) {
  const [types, setTypes]       = useState<WorkType[]>([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState({ name: '', category: '', color: '#1d6ae5' });
  const [editId, setEditId]     = useState<number | null>(null);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState('');
  const [toastErr, setToastErr] = useState('');

  const showToast = (msg: string, isErr = false) => {
    if (isErr) { setToastErr(msg); setToast(''); } else { setToast(msg); setToastErr(''); }
    setTimeout(() => { setToast(''); setToastErr(''); }, 3000);
  };

  const load = useCallback(() => {
    api.get<{ data: WorkType[] }>('/worklog/types?all=true')
      .then((r) => setTypes(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.category.trim()) { showToast('กรุณากรอกชื่อและหมวดหมู่', true); return; }
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/worklog/types/${editId}`, form);
        showToast('แก้ไขสำเร็จ');
      } else {
        await api.post('/worklog/types', form);
        showToast('เพิ่มสำเร็จ');
      }
      setForm({ name: '', category: '', color: '#1d6ae5' });
      setEditId(null);
      load();
    } catch (e: unknown) { showToast((e as Error).message, true); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('ยืนยันลบประเภทงานนี้?')) return;
    try {
      await api.delete(`/worklog/types/${id}`);
      showToast('ลบสำเร็จ');
      load();
    } catch (e: unknown) { showToast((e as Error).message, true); }
  };

  const startEdit = (t: WorkType) => {
    setEditId(t.id);
    setForm({ name: t.name, category: t.category, color: t.color });
  };

  const CATEGORIES = ['การสอน', 'การประชุม', 'การพัฒนา', 'งานธุรการ', 'อื่นๆ'];

  return (
    <div className="space-y-4">
      {(toast || toastErr) && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 ${toastErr ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {toastErr ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast || toastErr}
        </div>
      )}

      {isAdmin && (
        <div className="card">
          <p className="text-sm font-semibold mb-4" style={{ color: '#1a2744' }}>
            {editId ? 'แก้ไขประเภทงาน' : 'เพิ่มประเภทงานใหม่'}
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#4a6080' }}>ชื่อประเภท *</label>
              <input className="input-field" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="เช่น สอนตามตาราง" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#4a6080' }}>หมวดหมู่ *</label>
              <select className="input-field" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                <option value="">-- เลือกหมวดหมู่ --</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#4a6080' }}>สีชิป</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className="w-10 h-10 rounded-lg cursor-pointer border-0" />
                <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: form.color + '22', color: form.color }}>
                  {form.name || 'ตัวอย่าง'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {editId && <button onClick={() => { setEditId(null); setForm({ name: '', category: '', color: '#1d6ae5' }); }} className="btn-secondary text-sm">ยกเลิก</button>}
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-1.5">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {editId ? 'บันทึกการแก้ไข' : 'เพิ่มประเภท'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #dce6f9' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-3" style={{ color: '#94a3b8' }}>
            <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลด...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #f0f4ff', backgroundColor: '#f8faff' }}>
                {['ชื่อ', 'หมวดหมู่', 'ชิปสี', 'สถานะ', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#94a3b8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f5f8ff' }} className="hover:bg-[#fafbff]">
                  <td className="px-4 py-3 font-medium" style={{ color: '#1a2744' }}>{t.name}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{t.category}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: t.color + '22', color: t.color }}>
                      {t.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs" style={{ color: t.isActive ? '#0d9068' : '#94a3b8' }}>
                      {t.isActive ? 'ใช้งาน' : 'ปิด'}
                    </span>
                  </td>
                  <td className="pr-4 py-3">
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(t)} className="p-1.5 rounded hover:bg-[#e8f0fe] transition-colors">
                          <Pencil className="w-3.5 h-3.5" style={{ color: '#1d6ae5' }} />
                        </button>
                        <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {types.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm" style={{ color: '#94a3b8' }}>ยังไม่มีประเภทงาน</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkLogPage() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const activeTab     = searchParams.get('tab') ?? 'list';

  const [logs, setLogs]             = useState<WorkLog[]>([]);
  const [pending, setPending]       = useState<PendingLog[]>([]);
  const [loading, setLoading]       = useState(true);
  const [summary, setSummary]       = useState<Record<string, number>>({});
  const [month, setMonth]           = useState(String(new Date().getMonth() + 1));
  const [year, setYear]             = useState(String(new Date().getFullYear() + 543));
  const [statusFilter, setFilter]   = useState('');
  const [isApprover, setApprover]   = useState(false);
  const [isAdmin, setAdmin]         = useState(false);
  const [deleting, setDeleting]     = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [toast, setToast]           = useState('');
  const [toastErr, setToastErr]     = useState('');

  const showToast = (msg: string, isErr = false) => {
    if (isErr) { setToastErr(msg); setToast(''); } else { setToast(msg); setToastErr(''); }
    setTimeout(() => { setToast(''); setToastErr(''); }, 3000);
  };

  useEffect(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return;
    try {
      const u = JSON.parse(raw);
      setAdmin(!!u.isSuperAdmin || u.role === 'admin');
      const APPROVER_POS = ['work_unit_chief', 'department_chief', 'division_chief', 'director', 'deputy_director'];
      setApprover(!!u.isSuperAdmin || u.role === 'admin' || u.role === 'executive' || APPROVER_POS.includes(u.position));
    } catch { /* ignore */ }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month, year });
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get<{ data: { logs: WorkLog[]; summary: Record<string, number> } }>(
        `/worklog?${params}`
      );
      setLogs(res.data.logs);
      setSummary(res.data.summary);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [month, year, statusFilter]);

  const loadPending = useCallback(async () => {
    if (!isApprover) return;
    try {
      const res = await api.get<{ data: PendingLog[] }>('/worklog/pending-approvals');
      setPending(res.data);
    } catch { /* ignore */ }
  }, [isApprover]);

  useEffect(() => { loadLogs(); }, [loadLogs]);
  useEffect(() => { loadPending(); }, [loadPending]);

  const handleDelete = async (id: number) => {
    if (!confirm('ยืนยันลบบันทึกนี้?')) return;
    setDeleting(id);
    try {
      await api.delete(`/worklog/${id}`);
      showToast('ลบสำเร็จ');
      loadLogs();
    } catch (e: unknown) { showToast((e as Error).message, true); }
    finally { setDeleting(null); }
  };

  const handleSubmit = async (id: number) => {
    setSubmitting(id);
    try {
      await api.post(`/worklog/${id}/submit`, {});
      showToast('ส่งขออนุมัติสำเร็จ');
      loadLogs();
    } catch (e: unknown) { showToast((e as Error).message, true); }
    finally { setSubmitting(null); }
  };

  const YEARS = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() + 543 - i));
  const STATUS_TABS = ['', 'draft', 'submitted', 'approved', 'returned', 'rejected'];

  return (
    <div className="space-y-4">
      {/* Toast */}
      {(toast || toastErr) && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 ${toastErr ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {toastErr ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast || toastErr}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5" style={{ color: '#1d6ae5' }} />
          <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>บันทึกปฏิบัติงาน</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Tab bar */}
          <div className="flex" style={{ borderBottom: '1px solid #dce6f9' }}>
            <button
              onClick={() => router.push('/worklog')}
              className="px-3 py-1.5 text-sm font-medium transition-colors"
              style={activeTab === 'list' ? { color: '#1d6ae5', borderBottom: '2px solid #1d6ae5', marginBottom: -1 } : { color: '#4a6080' }}
            >
              รายการ
            </button>
            {(isAdmin) && (
              <button
                onClick={() => router.push('/worklog?tab=settings')}
                className="px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1"
                style={activeTab === 'settings' ? { color: '#1d6ae5', borderBottom: '2px solid #1d6ae5', marginBottom: -1 } : { color: '#4a6080' }}
              >
                <Settings className="w-3.5 h-3.5" /> ประเภทงาน
              </button>
            )}
          </div>
          {activeTab === 'list' && (
            <>
              <select className="input-field text-sm py-2 w-auto" value={month} onChange={(e) => setMonth(e.target.value)}>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select className="input-field text-sm py-2 w-auto" value={year} onChange={(e) => setYear(e.target.value)}>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <button onClick={() => router.push('/worklog/new')} className="btn-primary flex items-center gap-1.5 text-sm py-2">
                <Plus className="w-3.5 h-3.5" /> บันทึกใหม่
              </button>
            </>
          )}
        </div>
      </div>

      {/* Settings tab */}
      {activeTab === 'settings' && <WorkTypeSettings isAdmin={isAdmin} />}

      {/* List tab */}
      {activeTab === 'list' && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { key: null,        label: 'ทั้งหมด',   color: '#1d6ae5', bg: '#e8f0fe' },
              { key: 'submitted', label: 'รออนุมัติ', color: '#b45309', bg: '#fffbeb' },
              { key: 'approved',  label: 'อนุมัติ',   color: '#0d9068', bg: '#e6f9f0' },
              { key: 'returned',  label: 'ส่งคืน',    color: '#1d6ae5', bg: '#e8f0fe' },
            ].map(({ key, label, color, bg }) => {
              const count = key
                ? (summary[key] ?? 0)
                : Object.values(summary).reduce((s, v) => s + v, 0);
              return (
                <div key={label} className="bg-white rounded-xl p-3 text-center" style={{ border: '1px solid #dce6f9' }}>
                  <p className="text-2xl font-bold" style={{ color }}>{count}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>{label}</p>
                </div>
              );
            })}
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {STATUS_TABS.map((s) => {
              const meta = s ? STATUS_META[s] : null;
              const label = meta ? meta.label : 'ทั้งหมด';
              return (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0"
                  style={
                    statusFilter === s
                      ? { backgroundColor: '#2979ff', color: '#fff' }
                      : { backgroundColor: '#f5f8ff', color: '#4a6080', border: '1px solid #dce6f9' }
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Pending approvals section */}
          {isApprover && pending.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: '#b45309' }}>
                <span className="w-2 h-2 bg-amber-400 rounded-full" />
                รออนุมัติ ({pending.length} รายการ)
              </p>
              <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #fde68a' }}>
                <table className="w-full text-sm">
                  <tbody>
                    {pending.map((l) => (
                      <tr key={l.id} onClick={() => router.push(`/worklog/${l.id}`)} style={{ borderBottom: '1px solid #fef9c3', cursor: 'pointer' }} className="hover:bg-[#fffbeb]">
                        <td className="pl-4 py-2.5 w-36">
                          <p className="text-xs" style={{ color: '#94a3b8' }}>{fmtDate(l.logDate)}</p>
                          <p className="text-xs font-medium" style={{ color: '#1a2744' }}>{l.user.name}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          {l.workType && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium mr-2" style={{ backgroundColor: l.workType.color + '22', color: l.workType.color }}>
                              {l.workType.name}
                            </span>
                          )}
                          <span className="text-sm" style={{ color: '#1a2744' }}>{l.title}</span>
                        </td>
                        <td className="pr-4 py-2.5 text-right">
                          <button className="btn-primary text-xs py-1 px-2.5" onClick={(e) => { e.stopPropagation(); router.push(`/worklog/${l.id}`); }}>
                            ตรวจสอบ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Main table */}
          <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #dce6f9' }}>
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-3" style={{ color: '#94a3b8' }}>
                <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลด...
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid #f0f4ff', backgroundColor: '#f8faff' }}>
                    {['วันที่', 'หัวข้อ / ประเภท', 'สถานะ', 'จัดการ'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#94a3b8' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-12 text-center text-sm" style={{ color: '#94a3b8' }}>ไม่มีบันทึกในเดือนนี้</td></tr>
                  ) : logs.map((l) => {
                    const meta = STATUS_META[l.status] ?? STATUS_META.draft;
                    return (
                      <tr key={l.id} style={{ borderBottom: '1px solid #f5f8ff' }} className="hover:bg-[#fafbff] transition-colors">
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#4a6080' }}>
                          {fmtDate(l.logDate)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {l.workType && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0" style={{ backgroundColor: l.workType.color + '22', color: l.workType.color }}>
                                {l.workType.name}
                              </span>
                            )}
                            <span className="text-sm font-medium truncate max-w-[200px]" style={{ color: '#1a2744' }}>{l.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ backgroundColor: meta.bg, color: meta.text }}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="pr-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => router.push(`/worklog/${l.id}`)} className="p-1.5 rounded hover:bg-[#e8f0fe] transition-colors" title="ดูรายละเอียด">
                              <Eye className="w-3.5 h-3.5" style={{ color: '#1d6ae5' }} />
                            </button>
                            {l.status !== 'approved' && (
                              <>
                                <button onClick={() => router.push(`/worklog/${l.id}/edit`)} className="p-1.5 rounded hover:bg-[#f3e8ff] transition-colors" title="แก้ไข">
                                  <Pencil className="w-3.5 h-3.5" style={{ color: '#7c3aed' }} />
                                </button>
                                {['draft', 'returned'].includes(l.status) && (
                                  <button
                                    onClick={() => handleSubmit(l.id)}
                                    disabled={submitting === l.id}
                                    className="p-1.5 rounded hover:bg-[#e6f9f0] transition-colors"
                                    title="ส่งอนุมัติ"
                                  >
                                    {submitting === l.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-green-500" /> : <Send className="w-3.5 h-3.5" style={{ color: '#0d9068' }} />}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(l.id)}
                                  disabled={deleting === l.id}
                                  className="p-1.5 rounded hover:bg-red-50 transition-colors"
                                  title="ลบ"
                                >
                                  {deleting === l.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" /> : <Trash2 className="w-3.5 h-3.5 text-red-400" />}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Report link */}
          <div className="flex justify-end">
            <button onClick={() => router.push('/worklog/report')} className="text-sm" style={{ color: '#1d6ae5' }}>
              ดูรายงาน →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
