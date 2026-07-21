'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarCheck, ChevronRight, ChevronLeft, Plus, Bell, Check, AlertTriangle,
  Loader2, Pencil, Trash2, X, Search, LayoutGrid, List,
} from 'lucide-react';
import { api, USER_KEY } from '@/lib/api';
import ThaiDatePicker from '@/components/ui/ThaiDatePicker';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Schedule {
  id:             number;
  semester:       string;
  dutyDate:       string;
  departmentId:   number | null;
  departmentName: string;
  note:           string | null;
  presentCount:   number;
  loggedCount:    number;
  myLogged:       boolean;
}

interface TodaySchedule extends Schedule {
  myLog: { status: string } | null;
}

interface AcYear { year: number; semester: number; isCurrent: boolean }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const MONTH_FULL  = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const DOW_SHORT   = ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'];

const pad2 = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.getDate()} ${MONTH_SHORT[dt.getMonth()]} ${dt.getFullYear() + 543}`;
}
function fmtDayLong(iso: string) {
  const dt = new Date(iso + 'T00:00:00');
  return `วัน${['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'][dt.getDay()]}ที่ ${dt.getDate()} ${MONTH_FULL[dt.getMonth()]} ${dt.getFullYear() + 543}`;
}

function statusBadge(present: number, logged: number) {
  if (logged === 0) return { label: 'upcoming', color: '#94a3b8', bg: '#f1f5f9' };
  if (present === logged) return { label: '✅ ครบ', color: '#0d9068', bg: '#e6f9f0' };
  if (present === 0) return { label: '🔲 ยังไม่บันทึก', color: '#94a3b8', bg: '#f1f5f9' };
  return { label: `${present}/${logged}`, color: '#b45309', bg: '#fffbeb' };
}

// ─── Edit Modal ────────────────────────────────────────────────────────────────

interface EditModalProps {
  schedule: Schedule;
  onClose: () => void;
  onSaved: () => void;
}

function EditModal({ schedule, onClose, onSaved }: EditModalProps) {
  const [form, setForm] = useState({
    departmentName: schedule.departmentName,
    dutyDate:       schedule.dutyDate.slice(0, 10),
    note:           schedule.note ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/duty/schedules/${schedule.id}`, {
        departmentName: form.departmentName,
        dutyDate:       form.dutyDate,
        note:           form.note || null,
      });
      onSaved();
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#dce6f9]">
          <h2 className="font-bold text-[#1a2744]">แก้ไขตารางเวร</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-[#94a3b8]" /></button>
        </div>
        <form onSubmit={handleSave} className="px-5 py-4 space-y-3">
          {err && <p className="text-sm text-red-500">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-[#4a6080] mb-1">แผนกวิชา *</label>
            <input value={form.departmentName} onChange={e => setForm(p => ({ ...p, departmentName: e.target.value }))}
              required className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#4a6080] mb-1">วันที่ *</label>
            <ThaiDatePicker value={form.dutyDate} onChange={v => setForm(p => ({ ...p, dutyDate: v }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#4a6080] mb-1">หมายเหตุ</label>
            <input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              placeholder="หมายเหตุ..." className="input-field" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">ยกเลิก</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DutyPage() {
  const router = useRouter();
  const [schedules, setSchedules]   = useState<Schedule[]>([]);
  const [today, setToday]           = useState<TodaySchedule[]>([]);
  const [loading, setLoading]       = useState(true);
  const [semester, setSemester]     = useState('');
  const [semesters, setSemesters]   = useState<string[]>([]);
  const [selMonth, setSelMonth]     = useState<number | null>(null);
  const [isAdmin, setIsAdmin]       = useState(false);
  const [toast, setToast]           = useState('');
  const [toastErr, setToastErr]     = useState('');
  const [editItem, setEditItem]     = useState<Schedule | null>(null);
  const [view, setView]             = useState<'calendar' | 'list'>('calendar');
  const [search, setSearch]         = useState('');
  const [cursor, setCursor]         = useState(() => new Date());
  const [dayModal, setDayModal]     = useState<string | null>(null);

  const showToast = (msg: string, isErr = false) => {
    if (isErr) { setToastErr(msg); setToast(''); } else { setToast(msg); setToastErr(''); }
    setTimeout(() => { setToast(''); setToastErr(''); }, 3000);
  };

  useEffect(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      try {
        const u = JSON.parse(raw);
        setIsAdmin(!!u.isSuperAdmin || u.role === 'admin' || u.role === 'executive');
      } catch { /* */ }
    }
  }, []);

  useEffect(() => {
    api.get<{ data: AcYear[] }>('/settings/academic-years').then(res => {
      const list = res.data
        .sort((a, b) => b.year - a.year || a.semester - b.semester)
        .map(y => `${y.semester}/${y.year}`);
      setSemesters(list);
      const current = res.data.find(y => y.isCurrent);
      if (current) setSemester(`${current.semester}/${current.year}`);
      else if (list.length) setSemester(list[0]);
    }).catch(() => {});
  }, []);

  const loadSchedules = useCallback(async () => {
    if (!semester) return;
    setLoading(true);
    try {
      // โหลดทั้งภาคเรียน แล้วค่อยกรองเดือน/ค้นหาฝั่ง client (รองรับทั้งปฏิทินและรายการ)
      const res = await api.get<{ data: Schedule[] }>(`/duty/schedules?semester=${encodeURIComponent(semester)}`);
      setSchedules(res.data);
    } catch (e) {
      showToast((e as Error).message, true);
    } finally {
      setLoading(false);
    }
  }, [semester]);

  const loadToday = useCallback(async () => {
    try {
      const res = await api.get<{ data: TodaySchedule[] }>('/duty/today');
      setToday(res.data);
    } catch { /* */ }
  }, []);

  useEffect(() => { loadSchedules(); loadToday(); }, [loadSchedules, loadToday]);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('ยืนยันการลบตารางเวรนี้?')) return;
    try {
      await api.delete(`/duty/schedules/${id}`);
      showToast('ลบสำเร็จ');
      loadSchedules();
    } catch (e) {
      showToast((e as Error).message, true);
    }
  };

  // กรองด้วยคำค้นหา
  const kw = search.trim().toLowerCase();
  const filtered = schedules.filter((s) =>
    !kw || s.departmentName.toLowerCase().includes(kw) || (s.note ?? '').toLowerCase().includes(kw));

  const monthsWithData = new Set(schedules.map(s => new Date(s.dutyDate).getMonth()));
  const listItems = selMonth === null ? filtered : filtered.filter((s) => new Date(s.dutyDate).getMonth() === selMonth);

  // ปฏิทิน
  const cy = cursor.getFullYear(), cm = cursor.getMonth();
  const byDay: Record<string, Schedule[]> = {};
  for (const s of filtered) { const k = ymd(new Date(s.dutyDate)); (byDay[k] ??= []).push(s); }
  const calCells: (number | null)[] = [];
  {
    const startDow = new Date(cy, cm, 1).getDay();
    const days = new Date(cy, cm + 1, 0).getDate();
    for (let i = 0; i < startDow; i++) calCells.push(null);
    for (let d = 1; d <= days; d++) calCells.push(d);
    while (calCells.length % 7 !== 0) calCells.push(null);
  }
  const todayKey = ymd(new Date());

  return (
    <div className="space-y-4">
      {/* Toast */}
      {(toast || toastErr) && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 ${toastErr ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {toastErr ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast || toastErr}
        </div>
      )}

      {/* Edit modal */}
      {editItem && (
        <EditModal schedule={editItem} onClose={() => setEditItem(null)} onSaved={loadSchedules} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-5 h-5" style={{ color: '#1d6ae5' }} />
          <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>เวรรับนักเรียน</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select value={semester}
              onChange={e => { setSemester(e.target.value); setSelMonth(null); }}
              className="input-field py-2 pr-8 pl-3 text-sm appearance-none" style={{ minWidth: 140 }}>
              {semesters.map(s => <option key={s} value={s}>ภาค {s}</option>)}
              {!semesters.length && <option value="">กำลังโหลด...</option>}
            </select>
          </div>
          {isAdmin && (
            <button onClick={() => router.push('/duty/manage')} className="btn-primary flex items-center gap-1.5 py-2 text-sm">
              <Plus className="w-3.5 h-3.5" /> จัดตาราง
            </button>
          )}
          <button onClick={() => router.push('/duty/report')} className="btn-secondary flex items-center gap-1.5 py-2 text-sm">
            รายงาน
          </button>
        </div>
      </div>

      {/* Today duty banner */}
      {today.length > 0 && (
        <div className="rounded-xl p-4 flex items-start gap-3"
             style={{ backgroundColor: '#e8f0fe', border: '1px solid #bfcfff' }}>
          <Bell className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#1d6ae5' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: '#1d6ae5' }}>คุณมีเวรวันนี้</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {today.map(s => (
                <button key={s.id} onClick={() => router.push(`/duty/${s.id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80"
                  style={{ backgroundColor: '#ffffff', color: '#1a2744', border: '1px solid #dce6f9' }}>
                  {s.departmentName}
                  {s.myLog ? (
                    <span style={{ color: s.myLog.status === 'PRESENT' ? '#0d9068' : '#dc2626' }}>
                      · {s.myLog.status === 'PRESENT' ? '✓ บันทึกแล้ว' : 'ไม่มาเวร'}
                    </span>
                  ) : (
                    <span className="text-[#dc2626]">· ยังไม่บันทึก</span>
                  )}
                  <ChevronRight className="w-3 h-3" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Controls: view toggle + search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex rounded-xl p-1 flex-shrink-0" style={{ backgroundColor: '#f5f8ff', border: '1px solid #dce6f9' }}>
          <button onClick={() => setView('calendar')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
            style={view === 'calendar' ? { backgroundColor: '#2979ff', color: '#fff' } : { color: '#4a6080' }}>
            <LayoutGrid className="w-4 h-4" /> ปฏิทิน
          </button>
          <button onClick={() => setView('list')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
            style={view === 'list' ? { backgroundColor: '#2979ff', color: '#fff' } : { color: '#4a6080' }}>
            <List className="w-4 h-4" /> รายการ
          </button>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94a3b8' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาแผนกวิชา / หมายเหตุ..."
            className="w-full pl-9 pr-9 py-2 rounded-xl text-sm focus:outline-none" style={{ border: '1px solid #dce6f9' }} />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} /></button>}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3" style={{ color: '#94a3b8' }}>
          <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลด...
        </div>
      ) : view === 'calendar' ? (
        /* ── Calendar view ── */
        <div className="bg-white rounded-xl p-3 sm:p-5" style={{ border: '1px solid #dce6f9' }}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCursor(new Date(cy, cm - 1, 1))} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100" style={{ color: '#4a6080' }}><ChevronLeft className="w-4 h-4" /></button>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold" style={{ color: '#1a2744' }}>{MONTH_FULL[cm]} {cy + 543}</h3>
              <button onClick={() => setCursor(new Date())} className="text-xs font-medium px-2.5 py-1 rounded-lg" style={{ backgroundColor: '#e8f0fe', color: '#1d6ae5' }}>วันนี้</button>
            </div>
            <button onClick={() => setCursor(new Date(cy, cm + 1, 1))} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100" style={{ color: '#4a6080' }}><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {DOW_SHORT.map((d, i) => (
              <div key={d} className="text-center text-[11px] font-bold py-1.5" style={{ color: i === 0 ? '#dc2626' : i === 6 ? '#1d6ae5' : '#94a3b8' }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calCells.map((d, idx) => {
              if (d === null) return <div key={idx} className="rounded-lg" style={{ minHeight: 92, backgroundColor: '#fafbfe' }} />;
              const key = ymd(new Date(cy, cm, d));
              const items = byDay[key] ?? [];
              const isToday = key === todayKey;
              const dow = new Date(cy, cm, d).getDay();
              return (
                <button key={idx} onClick={() => items.length && setDayModal(key)}
                  className="rounded-lg p-1.5 text-left flex flex-col transition-colors"
                  style={{ minHeight: 92, border: isToday ? '2px solid #2979ff' : '1px solid #eef2fb', backgroundColor: '#fff', cursor: items.length ? 'pointer' : 'default' }}>
                  <span className="text-xs font-bold mb-1" style={{ color: isToday ? '#1d6ae5' : dow === 0 ? '#dc2626' : dow === 6 ? '#1d6ae5' : '#1a2744' }}>{d}</span>
                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    {items.slice(0, 3).map((s) => {
                      const b = statusBadge(s.presentCount, s.loggedCount);
                      return <div key={s.id} className="text-[9px] leading-tight px-1 py-0.5 rounded truncate" style={{ backgroundColor: b.bg, color: b.color }} title={s.departmentName}>{s.departmentName}</div>;
                    })}
                    {items.length > 3 && <div className="text-[9px] font-bold px-1" style={{ color: '#2979ff' }}>+{items.length - 3} เวร</div>}
                  </div>
                </button>
              );
            })}
          </div>
          {filtered.length === 0 && <p className="text-center text-sm py-6" style={{ color: '#94a3b8' }}>ไม่มีตารางเวรในภาคเรียนนี้{search ? ' ที่ตรงกับคำค้นหา' : ''}</p>}
        </div>
      ) : (
        /* ── List view ── */
        <>
          <div className="flex gap-1 overflow-x-auto pb-1">
            <button onClick={() => setSelMonth(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0"
              style={selMonth === null ? { backgroundColor: '#2979ff', color: '#fff' } : { backgroundColor: '#f5f8ff', color: '#4a6080', border: '1px solid #dce6f9' }}>
              ทั้งหมด
            </button>
            {MONTH_SHORT.map((m, i) => (
              <button key={i} onClick={() => setSelMonth(i === selMonth ? null : i)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0"
                style={selMonth === i ? { backgroundColor: '#2979ff', color: '#fff' }
                  : monthsWithData.has(i) ? { backgroundColor: '#f5f8ff', color: '#1a2744', border: '1px solid #dce6f9' }
                  : { backgroundColor: 'transparent', color: '#c4cdd6' }}>
                {m}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #dce6f9' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #f0f4ff', backgroundColor: '#f8faff' }}>
                  {['วันที่','แผนกวิชา','มา / บันทึก','สถานะ',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#94a3b8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listItems.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-sm" style={{ color: '#94a3b8' }}>
                    ไม่มีตารางเวร{selMonth !== null ? `เดือน ${MONTH_SHORT[selMonth]}` : ''}
                  </td></tr>
                ) : listItems.map(s => {
                  const badge = statusBadge(s.presentCount, s.loggedCount);
                  return (
                    <tr key={s.id} onClick={() => router.push(`/duty/${s.id}`)}
                      style={{ borderBottom: '1px solid #f5f8ff', cursor: 'pointer' }} className="hover:bg-[#f8faff] transition-colors">
                      <td className="px-4 py-3 font-medium" style={{ color: '#1a2744' }}>{fmtDate(s.dutyDate)}</td>
                      <td className="px-4 py-3" style={{ color: '#1a2744' }}>
                        {s.departmentName}
                        {s.note && <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{s.note}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {s.loggedCount > 0 ? <span className="text-sm font-medium">{s.presentCount}/{s.loggedCount}</span> : <span className="text-xs" style={{ color: '#94a3b8' }}>—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ backgroundColor: badge.bg, color: badge.color }}>{badge.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {isAdmin ? (
                            <>
                              <button onClick={e => { e.stopPropagation(); setEditItem(s); }} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-blue-50" title="แก้ไข"><Pencil className="w-3.5 h-3.5" style={{ color: '#1d6ae5' }} /></button>
                              <button onClick={e => handleDelete(s.id, e)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50" title="ลบ"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                            </>
                          ) : <ChevronRight className="w-4 h-4" style={{ color: '#dce6f9' }} />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Day detail modal (calendar) */}
      {dayModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setDayModal(null)}>
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white" style={{ borderColor: '#eef2fb' }}>
              <h3 className="font-bold" style={{ color: '#1a2744' }}>{fmtDayLong(dayModal)}</h3>
              <button onClick={() => setDayModal(null)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-2.5">
              {(byDay[dayModal] ?? []).map((s) => {
                const b = statusBadge(s.presentCount, s.loggedCount);
                return (
                  <button key={s.id} onClick={() => router.push(`/duty/${s.id}`)}
                    className="w-full text-left bg-white rounded-xl p-4 flex items-center gap-3 hover:bg-[#f8faff]" style={{ border: '1px solid #dce6f9' }}>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold" style={{ color: '#1a2744' }}>{s.departmentName}</p>
                      {s.note && <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{s.note}</p>}
                      {s.loggedCount > 0 && <p className="text-xs mt-1" style={{ color: '#4a6080' }}>มา/บันทึก: {s.presentCount}/{s.loggedCount}</p>}
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0" style={{ backgroundColor: b.bg, color: b.color }}>{b.label}</span>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#cbd5e1' }} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
