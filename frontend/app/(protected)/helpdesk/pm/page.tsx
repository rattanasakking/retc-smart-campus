'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Plus, X, Loader2, Check, AlertTriangle, Search, Wrench } from 'lucide-react';
import { api, USER_KEY } from '@/lib/api';

interface Equipment  { id: number; code: string; name: string; department: string }
interface TechUser   { id: number; name: string }
interface PmSchedule {
  id: number; pmType: string; scheduledDate: string; status: string; note?: string;
  completedAt?: string;
  equipment:  Equipment;
  technician: TechUser | null;
}

const PM_STATUS: Record<string, { label: string; bg: string; text: string }> = {
  scheduled:  { label: '📅 กำหนดการ',  bg: '#eff6ff', text: '#1d6ae5' },
  completed:  { label: '✅ เสร็จแล้ว', bg: '#e6f9f0', text: '#0d9068' },
  overdue:    { label: '⏰ เกินกำหนด', bg: '#fef2f2', text: '#dc2626' },
  cancelled:  { label: '❌ ยกเลิก',    bg: '#f1f5f9', text: '#64748b' },
};
const PM_TYPES = ['ล้างแอร์','เปลี่ยนหมึกพิมพ์','ตรวจสอบระบบไฟฟ้า','ทำความสะอาด','ตรวจสอบประจำปี','เปลี่ยนอะไหล่','อื่นๆ'];
const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const fmtDate = (d?: string) => { if (!d) return '-'; const dt = new Date(d); return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear() + 543}`; };

export default function PMPage() {
  const router   = useRouter();
  const [pms, setPms]           = useState<PmSchedule[]>([]);
  const [loading, setLoading]   = useState(true);
  const [statusF, setStatusF]   = useState('');
  const [isAdmin, setAdmin]     = useState(false);
  const [techs, setTechs]       = useState<TechUser[]>([]);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [eqSearch, setEqSearch]     = useState('');
  const [eqResults, setEqResults]   = useState<Equipment[]>([]);
  const [eqLoading, setEqLoading]   = useState(false);
  const [selEq, setSelEq]           = useState<Equipment | null>(null);
  const [pmForm, setPmForm]         = useState({ pmType: '', scheduledDate: '', technicianId: '', note: '' });
  const [createSaving, setCreateSave] = useState(false);
  const [createErr, setCreateErr]   = useState('');

  // Done modal
  const [doneId, setDoneId]   = useState<number | null>(null);
  const [doneNote, setDoneNote] = useState('');
  const [doneSaving, setDoneSave] = useState(false);

  // Toast
  const [toast, setToast]       = useState('');
  const [toastErr, setToastErr] = useState('');
  const showToast = (msg: string, err = false) => {
    if (err) { setToastErr(msg); setToast(''); } else { setToast(msg); setToastErr(''); }
    setTimeout(() => { setToast(''); setToastErr(''); }, 3000);
  };

  useEffect(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) { try { const u = JSON.parse(raw); setAdmin(!!u.isSuperAdmin || u.role === 'admin' || u.role === 'executive'); } catch { /* */ } }
    api.get<{ data: TechUser[] }>('/settings/users?role=staff&limit=100').then((r) => setTechs(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const loadPMs = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (statusF) p.set('status', statusF);
      const res = await api.get<{ data: PmSchedule[] }>(`/helpdesk/pm?${p}`);
      setPms(Array.isArray(res.data) ? res.data : []);
    } catch { showToast('โหลดข้อมูลไม่สำเร็จ', true); }
    finally { setLoading(false); }
  }, [statusF]);

  useEffect(() => { loadPMs(); }, [loadPMs]);

  // Equipment search
  useEffect(() => {
    if (!eqSearch.trim()) { setEqResults([]); return; }
    const t = setTimeout(async () => {
      setEqLoading(true);
      try {
        const res = await api.get<{ data: Equipment[] }>(`/equipment?search=${encodeURIComponent(eqSearch)}&limit=8`);
        setEqResults(Array.isArray(res.data) ? res.data : []);
      } catch { setEqResults([]); }
      finally { setEqLoading(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [eqSearch]);

  const handleCreate = async () => {
    if (!selEq) { setCreateErr('กรุณาเลือกครุภัณฑ์'); return; }
    if (!pmForm.pmType || !pmForm.scheduledDate) { setCreateErr('กรุณากรอกข้อมูลให้ครบ'); return; }
    setCreateSave(true); setCreateErr('');
    try {
      await api.post('/helpdesk/pm', {
        equipmentId:  selEq.id,
        pmType:       pmForm.pmType,
        scheduledDate: pmForm.scheduledDate,
        technicianId: pmForm.technicianId || undefined,
        note:         pmForm.note || undefined,
      });
      showToast('สร้าง PM สำเร็จ');
      setCreateOpen(false);
      setSelEq(null); setEqSearch(''); setEqResults([]);
      setPmForm({ pmType: '', scheduledDate: '', technicianId: '', note: '' });
      loadPMs();
    } catch (e: unknown) { setCreateErr((e as Error).message); }
    finally { setCreateSave(false); }
  };

  const handleDone = async () => {
    if (!doneId) return;
    setDoneSave(true);
    try {
      await api.put(`/helpdesk/pm/${doneId}/done`, { note: doneNote || undefined });
      showToast('บันทึก PM เสร็จสำเร็จ');
      setDoneId(null); setDoneNote('');
      loadPMs();
    } catch (e: unknown) { showToast((e as Error).message, true); }
    finally { setDoneSave(false); }
  };

  // KPI
  const total   = pms.length;
  const done    = pms.filter((p) => p.status === 'completed').length;
  const overdue = pms.filter((p) => p.status === 'overdue' || (p.status === 'scheduled' && new Date(p.scheduledDate) < new Date())).length;

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
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/helpdesk')} className="p-2 rounded-xl hover:bg-[#f5f8ff]">
            <ChevronLeft className="w-4 h-4" style={{ color: '#4a6080' }} />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>PM บำรุงรักษา</h1>
            <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>แผนการบำรุงรักษาเชิงป้องกัน</p>
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus className="w-3.5 h-3.5" /> สร้าง PM
          </button>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'ทั้งหมด', value: total,   bg: '#eff6ff', text: '#1d6ae5' },
          { label: 'เสร็จแล้ว', value: done,  bg: '#e6f9f0', text: '#0d9068' },
          { label: 'เกินกำหนด', value: overdue, bg: '#fef2f2', text: '#dc2626' },
        ].map(({ label, value, bg, text }) => (
          <div key={label} className="bg-white rounded-xl p-3 text-center" style={{ border: '1px solid #dce6f9' }}>
            <p className="text-2xl font-bold" style={{ color: text }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {(['', 'scheduled', 'completed', 'overdue', 'cancelled'] as const).map((s) => {
          const m = s ? PM_STATUS[s] : null;
          return (
            <button key={s} onClick={() => setStatusF(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={statusF === s ? { backgroundColor: '#2979ff', color: '#fff' } : { backgroundColor: '#f5f8ff', color: '#4a6080', border: '1px solid #dce6f9' }}>
              {m ? m.label : 'ทั้งหมด'}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #dce6f9' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3" style={{ color: '#94a3b8' }}>
            <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลด...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#f8faff', borderBottom: '1px solid #f0f4ff' }}>
                  {['ครุภัณฑ์', 'ประเภท PM', 'กำหนดการ', 'ช่าง', 'สถานะ', 'จัดการ'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#94a3b8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pms.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: '#94a3b8' }}>ไม่มีแผน PM</td></tr>
                ) : pms.map((pm) => {
                  const isOverdue = pm.status === 'scheduled' && new Date(pm.scheduledDate) < new Date();
                  const displayStatus = isOverdue ? 'overdue' : pm.status;
                  const sm = PM_STATUS[displayStatus] ?? PM_STATUS.scheduled;
                  return (
                    <tr key={pm.id} style={{ borderBottom: '1px solid #f5f8ff' }} className="hover:bg-[#fafbff]">
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium" style={{ color: '#1a2744' }}>{pm.equipment.name}</p>
                        <p className="text-xs font-mono" style={{ color: '#1d6ae5' }}>{pm.equipment.code}</p>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{pm.pmType}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: isOverdue ? '#dc2626' : '#4a6080', fontWeight: isOverdue ? 600 : 400 }}>
                        {fmtDate(pm.scheduledDate)}{isOverdue && ' ⚠️'}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{pm.technician?.name ?? '-'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: sm.bg, color: sm.text }}>{sm.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        {pm.status === 'scheduled' && (
                          <button onClick={() => { setDoneId(pm.id); setDoneNote(''); }}
                            className="px-2 py-1 rounded text-xs transition-colors"
                            style={{ backgroundColor: '#e6f9f0', color: '#0d9068' }}>
                            บันทึกเสร็จ
                          </button>
                        )}
                        {pm.status === 'completed' && pm.completedAt && (
                          <span className="text-xs" style={{ color: '#94a3b8' }}>เสร็จ {fmtDate(pm.completedAt)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create PM Modal ── */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => !createSaving && setCreateOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl shadow-xl z-10 bg-white" style={{ border: '1px solid #dce6f9' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #dce6f9' }}>
              <h3 className="font-semibold" style={{ color: '#1a2744' }}>สร้างแผน PM</h3>
              <button onClick={() => setCreateOpen(false)}><X className="w-4 h-4" style={{ color: '#4a6080' }} /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {createErr && <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm"><AlertTriangle className="w-4 h-4 flex-shrink-0" />{createErr}</div>}

              {/* Equipment search */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#4a6080' }}>ครุภัณฑ์ *</label>
                {selEq ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#e8f0fe', border: '1px solid #c7d9fc' }}>
                    <p className="text-sm flex-1" style={{ color: '#1a2744' }}>{selEq.name} <span className="font-mono text-xs" style={{ color: '#1d6ae5' }}>({selEq.code})</span></p>
                    <button type="button" onClick={() => { setSelEq(null); setEqSearch(''); }}><X className="w-3.5 h-3.5" style={{ color: '#4a6080' }} /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: '#f5f8ff', border: '1px solid #dce6f9' }}>
                      <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#94a3b8' }} />
                      <input value={eqSearch} onChange={(e) => setEqSearch(e.target.value)} placeholder="ค้นหาครุภัณฑ์..." className="flex-1 bg-transparent text-sm outline-none placeholder-[#94a3b8]" style={{ color: '#1a2744' }} />
                      {eqLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#94a3b8' }} />}
                    </div>
                    {eqResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg overflow-hidden z-10" style={{ border: '1px solid #dce6f9' }}>
                        {eqResults.map((eq) => (
                          <button key={eq.id} type="button" onClick={() => { setSelEq(eq); setEqSearch(''); setEqResults([]); }}
                            className="w-full text-left px-3 py-2 hover:bg-[#f5f8ff] text-sm" style={{ borderBottom: '1px solid #f5f8ff' }}>
                            {eq.name} <span className="font-mono text-xs" style={{ color: '#1d6ae5' }}>({eq.code})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#4a6080' }}>ประเภท PM *</label>
                <select className="input-field" value={pmForm.pmType} onChange={(e) => setPmForm((f) => ({ ...f, pmType: e.target.value }))}>
                  <option value="">-- เลือก --</option>
                  {PM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#4a6080' }}>วันที่กำหนด *</label>
                <input type="date" className="input-field" value={pmForm.scheduledDate} onChange={(e) => setPmForm((f) => ({ ...f, scheduledDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#4a6080' }}>ช่างผู้รับผิดชอบ</label>
                <select className="input-field" value={pmForm.technicianId} onChange={(e) => setPmForm((f) => ({ ...f, technicianId: e.target.value }))}>
                  <option value="">-- ยังไม่กำหนด --</option>
                  {techs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#4a6080' }}>หมายเหตุ</label>
                <textarea className="input-field resize-none" rows={2} value={pmForm.note} onChange={(e) => setPmForm((f) => ({ ...f, note: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: '1px solid #dce6f9' }}>
              <button onClick={() => setCreateOpen(false)} disabled={createSaving} className="btn-secondary">ยกเลิก</button>
              <button onClick={handleCreate} disabled={createSaving} className="btn-primary flex items-center gap-2">
                {createSaving && <Loader2 className="w-4 h-4 animate-spin" />} สร้าง PM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Done Modal ── */}
      {doneId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => !doneSaving && setDoneId(null)} />
          <div className="relative w-full max-w-sm rounded-2xl shadow-xl z-10 bg-white" style={{ border: '1px solid #dce6f9' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #dce6f9' }}>
              <h3 className="font-semibold" style={{ color: '#1a2744' }}>บันทึก PM เสร็จสิ้น</h3>
              <button onClick={() => setDoneId(null)}><X className="w-4 h-4" style={{ color: '#4a6080' }} /></button>
            </div>
            <div className="px-5 py-4">
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>หมายเหตุ (ไม่บังคับ)</label>
              <textarea className="input-field resize-none" rows={3} value={doneNote} onChange={(e) => setDoneNote(e.target.value)} placeholder="สรุปสิ่งที่ทำ..." />
            </div>
            <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: '1px solid #dce6f9' }}>
              <button onClick={() => setDoneId(null)} disabled={doneSaving} className="btn-secondary">ยกเลิก</button>
              <button onClick={handleDone} disabled={doneSaving} className="btn-primary flex items-center gap-2">
                {doneSaving && <Loader2 className="w-4 h-4 animate-spin" />} บันทึกเสร็จ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
