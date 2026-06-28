'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Trash2, X, Check, AlertTriangle, Loader2, CalendarCheck, RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import ThaiDatePicker from '@/components/ui/ThaiDatePicker';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Department { id: number; name: string; code: string }
interface AcYear     { year: number; semester: number; isCurrent: boolean }

interface DeptEntry { id: string; departmentId: string; departmentName: string }
interface ScheduleRow { id: string; date: string; depts: DeptEntry[] }

// ─── Helpers ──────────────────────────────────────────────────────────────────

let uid = 0;
const genId = () => String(++uid);

const EMPTY_ROW = (): ScheduleRow => ({
  id:    genId(),
  date:  '',
  depts: [{ id: genId(), departmentId: '', departmentName: '' }],
});

// ─── Main Page ────────────────────────────────────────────────────────────────

const WEEKDAYS = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์'];

export default function DutyManagePage() {
  const router = useRouter();
  const [tab, setTab]             = useState<'manual' | 'weekly'>('manual');
  const [semester, setSemester]   = useState('');
  const [semesters, setSemesters] = useState<string[]>([]);
  const [departments, setDepts]   = useState<Department[]>([]);
  const [rows, setRows]           = useState<ScheduleRow[]>([EMPTY_ROW()]);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState('');
  const [toastErr, setToastErr]   = useState('');

  // Repeat-weekly form
  const [weekly, setWeekly] = useState({
    weekday: '1', departmentId: '', departmentName: '',
    startDate: '', endDate: '', note: '',
  });

  const showToast = (msg: string, isErr = false) => {
    if (isErr) { setToastErr(msg); setToast(''); } else { setToast(msg); setToastErr(''); }
    setTimeout(() => { setToast(''); setToastErr(''); }, 3000);
  };

  useEffect(() => {
    Promise.all([
      api.get<{ data: AcYear[] }>('/settings/academic-years'),
      api.get<{ data: Department[] }>('/settings/departments'),
    ]).then(([yr, dept]) => {
      const list = yr.data
        .sort((a, b) => b.year - a.year || a.semester - b.semester)
        .map((y) => `${y.semester}/${y.year}`);
      setSemesters(list);
      const cur = yr.data.find((y) => y.isCurrent);
      setSemester(cur ? `${cur.semester}/${cur.year}` : list[0] ?? '');
      setDepts(dept.data);
    }).catch(() => {});
  }, []);

  // Row / dept management
  const addRow = () => setRows((r) => [...r, EMPTY_ROW()]);
  const removeRow = (rowId: string) => setRows((r) => r.filter((x) => x.id !== rowId));
  const setDate = (rowId: string, date: string) =>
    setRows((r) => r.map((x) => x.id === rowId ? { ...x, date } : x));

  const addDept = (rowId: string) =>
    setRows((r) => r.map((x) =>
      x.id === rowId
        ? { ...x, depts: [...x.depts, { id: genId(), departmentId: '', departmentName: '' }] }
        : x
    ));
  const removeDept = (rowId: string, deptId: string) =>
    setRows((r) => r.map((x) =>
      x.id === rowId ? { ...x, depts: x.depts.filter((d) => d.id !== deptId) } : x
    ));

  const selectDept = (rowId: string, deptId: string, depEntryId: string) => {
    const dept = departments.find((d) => String(d.id) === deptId);
    setRows((r) => r.map((x) =>
      x.id !== rowId ? x : {
        ...x,
        depts: x.depts.map((d) =>
          d.id !== depEntryId ? d : {
            ...d,
            departmentId:   deptId,
            departmentName: dept?.name ?? '',
          }
        ),
      }
    ));
  };

  // Repeat-weekly save
  const handleWeeklySave = async () => {
    if (!semester) { showToast('กรุณาเลือกภาคเรียน', true); return; }
    if (!weekly.startDate || !weekly.endDate || !weekly.departmentName) {
      showToast('กรุณากรอกข้อมูลให้ครบ', true); return;
    }
    setSaving(true);
    try {
      const res = await api.post<{ message: string; data: unknown[] }>('/duty/schedules', {
        repeatWeekly:   true,
        weekday:        weekly.weekday,
        startDate:      weekly.startDate,
        endDate:        weekly.endDate,
        semester,
        departmentId:   weekly.departmentId || undefined,
        departmentName: weekly.departmentName,
        note:           weekly.note || undefined,
      });
      showToast(res.message ?? 'บันทึกสำเร็จ');
      setTimeout(() => router.push('/duty'), 1200);
    } catch (e) {
      showToast((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  };

  // Validate + save (manual)
  const handleSave = async () => {
    if (!semester) { showToast('กรุณาเลือกภาคเรียน', true); return; }

    const items: { dutyDate: string; semester: string; departmentId: number | null; departmentName: string }[] = [];
    for (const row of rows) {
      if (!row.date) { showToast('กรุณากรอกวันที่ทุกแถว', true); return; }
      for (const d of row.depts) {
        if (!d.departmentName.trim()) { showToast('กรุณาเลือกแผนกวิชาในทุกช่อง', true); return; }
        items.push({
          dutyDate:       row.date,
          semester,
          departmentId:   d.departmentId ? parseInt(d.departmentId) : null,
          departmentName: d.departmentName.trim(),
        });
      }
    }

    setSaving(true);
    try {
      const res = await api.post<{ message: string }>('/duty/schedules', items);
      showToast(res.message ?? 'บันทึกตารางเวรสำเร็จ');
      setTimeout(() => router.push('/duty'), 1200);
    } catch (e: unknown) {
      showToast((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Toast */}
      {(toast || toastErr) && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 ${toastErr ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {toastErr ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast || toastErr}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => router.push('/duty')} className="p-1.5 rounded-lg hover:bg-[#f5f8ff] transition-colors">
          <X className="w-4 h-4" style={{ color: '#4a6080' }} />
        </button>
        <CalendarCheck className="w-5 h-5" style={{ color: '#1d6ae5' }} />
        <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>จัดตารางเวร</h1>
        <div className="ml-auto flex items-center gap-2">
          <select value={semester} onChange={(e) => setSemester(e.target.value)} className="input-field text-sm py-2">
            {semesters.map((s) => <option key={s} value={s}>ภาค {s}</option>)}
          </select>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex rounded-xl overflow-hidden border border-[#dce6f9] w-fit">
        {([['manual','กำหนดวัน'],['weekly','วันเดิมทั้งเทอม']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-medium flex items-center gap-1.5"
            style={{ backgroundColor: tab === t ? '#1d6ae5' : 'white', color: tab === t ? 'white' : '#4a6080' }}>
            {t === 'weekly' && <RefreshCw className="w-3.5 h-3.5" />}
            {label}
          </button>
        ))}
      </div>

      {/* ── Repeat weekly form ──────────────────────────────────────────── */}
      {tab === 'weekly' && (
        <div className="bg-white rounded-xl p-5 space-y-4" style={{ border: '1px solid #dce6f9' }}>
          <p className="text-xs text-[#4a6080]">กำหนดให้แผนกใดเวรวันใดทุกสัปดาห์ตลอดช่วงเวลาที่เลือก</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#4a6080] mb-1">วันในสัปดาห์ *</label>
              <select value={weekly.weekday} onChange={e => setWeekly(p => ({ ...p, weekday: e.target.value }))}
                className="input-field">
                {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4a6080] mb-1">แผนกวิชา *</label>
              <select value={weekly.departmentId}
                onChange={e => {
                  const d = departments.find(d => String(d.id) === e.target.value);
                  setWeekly(p => ({ ...p, departmentId: e.target.value, departmentName: d?.name ?? '' }));
                }} className="input-field">
                <option value="">-- เลือกแผนก --</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4a6080] mb-1">วันเริ่มต้น *</label>
              <ThaiDatePicker value={weekly.startDate} onChange={v => setWeekly(p => ({ ...p, startDate: v }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4a6080] mb-1">วันสิ้นสุด *</label>
              <ThaiDatePicker value={weekly.endDate} min={weekly.startDate} onChange={v => setWeekly(p => ({ ...p, endDate: v }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#4a6080] mb-1">หมายเหตุ</label>
            <input value={weekly.note} onChange={e => setWeekly(p => ({ ...p, note: e.target.value }))}
              placeholder="หมายเหตุ..." className="input-field" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push('/duty')} className="btn-secondary flex-1">ยกเลิก</button>
            <button onClick={handleWeeklySave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              สร้างตารางทั้งเทอม
            </button>
          </div>
        </div>
      )}

      {/* ── Manual schedule form ────────────────────────────────────────── */}
      {tab === 'manual' && <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #dce6f9' }}>
        {/* Table header */}
        <div
          className="grid gap-3 px-4 py-2.5 text-xs font-semibold"
          style={{ borderBottom: '1px solid #f0f4ff', color: '#94a3b8', gridTemplateColumns: '160px 1fr auto' }}
        >
          <span>วันที่</span>
          <span>แผนกวิชา</span>
          <span />
        </div>

        {/* Rows */}
        <div className="divide-y divide-[#f5f8ff]">
          {rows.map((row, ri) => (
            <div key={row.id} className="px-4 py-3 space-y-2">
              <div className="flex items-start gap-3">
                {/* Date */}
                <ThaiDatePicker value={row.date} onChange={v => setDate(row.id, v)}
                  className="text-sm" />
                {/* Departments list */}
                <div className="flex-1 space-y-1.5">
                  {row.depts.map((d, di) => (
                    <div key={d.id} className="flex items-center gap-2">
                      <select
                        value={d.departmentId}
                        onChange={(e) => selectDept(row.id, e.target.value, d.id)}
                        className="input-field text-sm py-1.5 flex-1"
                      >
                        <option value="">-- เลือกแผนกวิชา --</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                      {di > 0 && (
                        <button
                          onClick={() => removeDept(row.id, d.id)}
                          className="p-1 rounded hover:bg-red-50 transition-colors flex-shrink-0"
                        >
                          <X className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => addDept(row.id)}
                    className="flex items-center gap-1 text-xs transition-colors hover:opacity-80"
                    style={{ color: '#1d6ae5' }}
                  >
                    <Plus className="w-3.5 h-3.5" /> เพิ่มแผนก
                  </button>
                </div>
                {/* Delete row */}
                {rows.length > 1 && (
                  <button
                    onClick={() => removeRow(row.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0 mt-0.5"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add day button */}
        <div className="px-4 py-3" style={{ borderTop: '1px solid #f0f4ff' }}>
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: '#1d6ae5' }}
          >
            <Plus className="w-4 h-4" /> เพิ่มวัน
          </button>
        </div>
      </div>}

      {/* Actions — manual mode only */}
      {tab === 'manual' && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: '#94a3b8' }}>
            {rows.reduce((n, r) => n + r.depts.length, 0)} รายการ · วันซ้ำจะถูกข้ามอัตโนมัติ
          </p>
          <div className="flex gap-2">
            <button onClick={() => router.push('/duty')} className="btn-secondary text-sm py-2">ยกเลิก</button>
            <button onClick={handleSave} disabled={saving}
              className="btn-primary text-sm py-2 flex items-center gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              บันทึกทั้งหมด
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
