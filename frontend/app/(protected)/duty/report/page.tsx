'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Download, X, Check, AlertTriangle, Image, Printer } from 'lucide-react';
import { api } from '@/lib/api';
import {
  ResponsiveContainer, CartesianGrid, XAxis, YAxis,
  Tooltip, LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PhotoEntry  { url: string; date: string; dept: string }
interface TeacherStat {
  teacher: { id: number; name: string; employeeId: string; position: string | null };
  total: number; present: number; absent: number; rate: number;
  photos: PhotoEntry[]; department: string;
}
interface DeptStat    { departmentName: string; scheduleCount: number; totalLogs: number; presentLogs: number; rate: number }
interface DailyDept   { name: string; present: number; total: number }
interface DailyEntry  { date: string; depts: DailyDept[]; totalPresent: number; totalLogs: number }
interface ReportData  {
  semester: string; totalSchedules: number;
  teachers: TeacherStat[]; byDept: DeptStat[]; daily: DailyEntry[];
}
interface AcYear { year: number; semester: number; isCurrent: boolean }
interface Dept   { id: number; name: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.getDate()} ${MONTH_SHORT[dt.getMonth()]} ${dt.getFullYear() + 543}`;
}

function PctBadge({ pct }: { pct: number }) {
  const color = pct >= 80 ? '#0d9068' : pct >= 50 ? '#b45309' : '#dc2626';
  const bg    = pct >= 80 ? '#e6f9f0' : pct >= 50 ? '#fffbeb' : '#fef2f2';
  return (
    <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full"
      style={{ backgroundColor: bg, color }}>{pct}%</span>
  );
}

// ─── Photo Modal ──────────────────────────────────────────────────────────────

function PhotoModal({ photos, name, onClose }: { photos: PhotoEntry[]; name: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl shadow-xl z-10 max-h-[85vh] flex flex-col bg-white border border-[#dce6f9]">
        <div className="px-5 py-3.5 flex items-center justify-between border-b border-[#f0f4ff]">
          <p className="font-semibold text-sm text-[#1a2744]">รูปหลักฐาน — {name}</p>
          <button onClick={onClose}><X className="w-4 h-4 text-[#4a6080]" /></button>
        </div>
        <div className="overflow-y-auto p-4">
          {photos.length === 0 ? (
            <p className="text-center py-8 text-sm text-[#94a3b8]">ไม่มีรูปหลักฐาน</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {photos.map((p, i) => (
                <div key={i} className="rounded-xl overflow-hidden border border-[#dce6f9]">
                  <a href={p.url} target="_blank" rel="noopener noreferrer">
                    <img src={p.url} alt={`ev-${i}`} className="w-full h-40 object-cover hover:opacity-90" />
                  </a>
                  <div className="px-2.5 py-2 border-t border-[#f0f4ff]">
                    <p className="text-[11px] font-medium text-[#1a2744]">{p.dept}</p>
                    <p className="text-[11px] text-[#94a3b8]">{fmtDate(p.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Day Detail Modal ────────────────────────────────────────────────────────

function DayDetailModal({ day, onClose }: { day: DailyEntry; onClose: () => void }) {
  const totalRate = day.totalLogs > 0 ? Math.round(day.totalPresent / day.totalLogs * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto print-area">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#dce6f9] sticky top-0 bg-white rounded-t-2xl no-print">
          <div>
            <h2 className="font-bold text-[#1a2744]">รายงานเวร — {fmtDate(day.date)}</h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              เข้าเวร {day.totalPresent}/{day.totalLogs} คน ({totalRate}%)
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#dce6f9] hover:bg-[#f5f8ff] no-print">
              <Printer className="w-3.5 h-3.5" /> พิมพ์
            </button>
            <button onClick={onClose} className="no-print"><X className="w-4 h-4 text-[#94a3b8]" /></button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* KPI */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'บันทึกรวม',  value: day.totalLogs,    color: '#1d6ae5', bg: '#eff4ff' },
              { label: 'มาเวร',      value: day.totalPresent, color: '#0d9068', bg: '#f0fdf4' },
              { label: '% เข้าเวร', value: `${totalRate}%`,  color: totalRate >= 80 ? '#0d9068' : '#dc2626', bg: totalRate >= 80 ? '#f0fdf4' : '#fef2f2' },
            ].map(k => (
              <div key={k.label} className="rounded-xl p-3 border" style={{ backgroundColor: k.bg, borderColor: k.color + '33' }}>
                <p className="text-xs font-medium" style={{ color: k.color }}>{k.label}</p>
                <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Dept table */}
          <table className="w-full text-sm border border-[#dce6f9] rounded-xl overflow-hidden">
            <thead>
              <tr className="border-b border-[#dce6f9]" style={{ backgroundColor: '#f5f8ff' }}>
                {['แผนกวิชา','บันทึก','มา','ไม่มา','%'].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-[#4a6080]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {day.depts.map(d => (
                <tr key={d.name} className="border-b border-[#dce6f9]">
                  <td className="px-3 py-2 font-medium text-[#1a2744]">{d.name}</td>
                  <td className="px-3 py-2 text-center">{d.total}</td>
                  <td className="px-3 py-2 text-center text-[#0d9068] font-medium">{d.present}</td>
                  <td className="px-3 py-2 text-center text-red-500 font-medium">{d.total - d.present}</td>
                  <td className="px-3 py-2 min-w-[80px]">
                    <PctBadge pct={d.total > 0 ? Math.round(d.present/d.total*100) : 0} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabType = 'person' | 'dept' | 'daily';

export default function DutyReportPage() {
  const router = useRouter();
  const [report, setReport]         = useState<ReportData | null>(null);
  const [loading, setLoading]       = useState(false);
  const [semester, setSemester]     = useState('');
  const [semesters, setSemesters]   = useState<string[]>([]);
  const [deptId, setDeptId]         = useState('');
  const [departments, setDepts]     = useState<Dept[]>([]);
  const [photoModal, setPhotoModal] = useState<TeacherStat | null>(null);
  const [tab, setTab]               = useState<TabType>('person');
  const [selectedDay, setSelectedDay] = useState<DailyEntry | null>(null);
  const [toast, setToast]           = useState('');
  const [toastErr, setToastErr]     = useState('');

  const showToast = (msg: string, isErr = false) => {
    if (isErr) { setToastErr(msg); setToast(''); } else { setToast(msg); setToastErr(''); }
    setTimeout(() => { setToast(''); setToastErr(''); }, 3000);
  };

  useEffect(() => {
    Promise.all([
      api.get<{ data: AcYear[] }>('/settings/academic-years'),
      api.get<{ data: Dept[] }>('/settings/departments'),
    ]).then(([yr, dept]) => {
      const list = yr.data.sort((a, b) => b.year - a.year || a.semester - b.semester).map(y => `${y.semester}/${y.year}`);
      setSemesters(list);
      const cur = yr.data.find(y => y.isCurrent);
      setSemester(cur ? `${cur.semester}/${cur.year}` : list[0] ?? '');
      setDepts(dept.data);
    }).catch(() => {});
  }, []);

  const loadReport = useCallback(async () => {
    if (!semester) return;
    setLoading(true);
    try {
      const p = new URLSearchParams({ semester });
      if (deptId) p.set('department', deptId);
      const res = await api.get<{ data: ReportData }>(`/duty/report?${p}`);
      setReport(res.data);
    } catch (e) { showToast((e as Error).message, true); }
    finally { setLoading(false); }
  }, [semester, deptId]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const exportCSV = () => {
    if (!report) return;
    const header = ['ชื่อ','รหัส','เวรทั้งหมด','มา','ไม่มา','% มา'];
    const rows   = report.teachers.map(t => [t.teacher.name, t.teacher.employeeId, t.total, t.present, t.absent, `${t.rate}%`]);
    const csv    = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob   = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href = url; a.download = `duty_${semester.replace('/', '-')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const totalPresent = report?.teachers.reduce((s, t) => s + t.present, 0) ?? 0;
  const totalEntries = report?.teachers.reduce((s, t) => s + t.total,   0) ?? 0;
  const overallRate  = totalEntries > 0 ? Math.round((totalPresent / totalEntries) * 100) : 0;

  // Chart data
  const deptChartData = report?.byDept.map(d => ({ name: d.departmentName, อัตรา: d.rate, มา: d.presentLogs, ไม่มา: d.totalLogs - d.presentLogs })) ?? [];
  const dailyChartData = report?.daily.map(d => ({
    วันที่: fmtDate(d.date),
    มา:  d.totalLogs > 0 ? Math.round(d.totalPresent / d.totalLogs * 100) : 0,
  })) ?? [];
  const pieData = [
    { name: 'มา',   value: totalPresent,             fill: '#0d9068' },
    { name: 'ไม่มา', value: totalEntries - totalPresent, fill: '#dc2626' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-4 max-w-4xl">
      {(toast || toastErr) && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 ${toastErr ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {toastErr ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast || toastErr}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/duty')} className="p-2 rounded-xl hover:bg-[#f5f8ff]">
            <ChevronLeft className="w-4 h-4 text-[#4a6080]" />
          </button>
          <h1 className="text-xl font-bold text-[#1a2744]">รายงานเวรรับนักเรียน</h1>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <select value={semester} onChange={e => setSemester(e.target.value)} className="input-field py-2 pr-8 pl-3 text-sm appearance-none" style={{ minWidth: 140 }}>
              {semesters.map(s => <option key={s} value={s}>ภาค {s}</option>)}
            </select>
          </div>
          <div className="relative">
            <select value={deptId} onChange={e => setDeptId(e.target.value)} className="input-field py-2 pr-8 pl-3 text-sm appearance-none" style={{ minWidth: 160 }}>
              <option value="">ทุกแผนก</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <button onClick={exportCSV} disabled={!report} className="btn-secondary flex items-center gap-1.5 text-sm disabled:opacity-40">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#94a3b8]">
          <div className="w-6 h-6 border-2 border-[#1d6ae5] border-t-transparent rounded-full animate-spin mr-2" /> กำลังโหลด...
        </div>
      ) : !report ? null : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'รายการเวรทั้งหมด', value: report.totalSchedules, color: '#1d6ae5', bg: '#eff4ff' },
              { label: 'ครูที่มีข้อมูล',    value: report.teachers.length, color: '#7c3aed', bg: '#f5f3ff' },
              { label: '% เข้าเวรรวม',     value: `${overallRate}%`,       color: overallRate >= 80 ? '#0d9068' : '#dc2626', bg: overallRate >= 80 ? '#f0fdf4' : '#fef2f2' },
            ].map(k => (
              <div key={k.label} className="card-sm" style={{ backgroundColor: k.bg, borderColor: k.color + '33' }}>
                <p className="text-xs font-medium mb-1" style={{ color: k.color }}>{k.label}</p>
                <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Chart overview */}
          {pieData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card">
                <p className="text-sm font-semibold text-[#1a2744] mb-3">สัดส่วนการเข้าเวร</p>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                      {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, 'ครั้ง']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {dailyChartData.length > 1 && (
                <div className="card">
                  <p className="text-sm font-semibold text-[#1a2744] mb-3">แนวโน้มอัตราเข้าเวรรายวัน (%)</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={dailyChartData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" />
                      <XAxis dataKey="วันที่" tick={{ fontSize: 10, fill: '#4a6080' }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10, fill: '#4a6080' }} domain={[0, 100]} />
                      <Tooltip formatter={(v: number) => [`${v}%`, 'อัตราเข้าเวร']} />
                      <Line type="monotone" dataKey="มา" stroke="#1d6ae5" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Dept chart */}
          {deptChartData.length > 0 && (
            <div className="card">
              <p className="text-sm font-semibold text-[#1a2744] mb-3">อัตราเข้าเวรรายแผนก</p>
              <div className="space-y-2">
                {[...deptChartData].sort((a, b) => b.อัตรา - a.อัตรา).map(d => (
                  <div key={d.name} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ backgroundColor: '#f5f8ff' }}>
                    <span className="text-xs flex-1 truncate" style={{ color: '#1a2744' }}>{d.name}</span>
                    <span className="text-xs flex-shrink-0" style={{ color: '#4a6080' }}>{d.มา}/{d.มา + d.ไม่มา}</span>
                    <PctBadge pct={d.อัตรา} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab selector */}
          <div className="flex rounded-xl overflow-hidden border border-[#dce6f9] w-fit">
            {([['person','รายบุคคล'],['dept','รายแผนก'],['daily','รายวัน']] as [TabType,string][]).map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)}
                className="px-4 py-2 text-sm font-medium transition-colors"
                style={{ backgroundColor: tab === t ? '#1d6ae5' : 'white', color: tab === t ? 'white' : '#4a6080' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Tab: รายบุคคล */}
          {tab === 'person' && (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#dce6f9]" style={{ backgroundColor: '#f5f8ff' }}>
                    {['ชื่อ','ตำแหน่ง','แผนก','เวรทั้งหมด','มา','ไม่มา','% เข้าเวร','รูป'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-[#4a6080] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.teachers.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-10 text-[#94a3b8]">ไม่พบข้อมูล</td></tr>
                  ) : report.teachers.map(t => (
                    <tr key={t.teacher.id} className="border-b border-[#dce6f9] hover:bg-[#f5f8ff]">
                      <td className="px-3 py-2.5 font-medium text-[#1a2744]">{t.teacher.name}</td>
                      <td className="px-3 py-2.5 text-xs text-[#4a6080]">{t.teacher.position ?? '-'}</td>
                      <td className="px-3 py-2.5 text-xs text-[#4a6080]">{t.department || '-'}</td>
                      <td className="px-3 py-2.5 text-center font-medium">{t.total}</td>
                      <td className="px-3 py-2.5 text-center text-[#0d9068] font-medium">{t.present}</td>
                      <td className="px-3 py-2.5 text-center text-red-500 font-medium">{t.absent}</td>
                      <td className="px-3 py-2.5 min-w-[100px]"><PctBadge pct={t.rate} /></td>
                      <td className="px-3 py-2.5">
                        {t.photos.length > 0 && (
                          <button onClick={() => setPhotoModal(t)}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg text-[#1d6ae5] hover:bg-blue-50">
                            <Image className="w-3.5 h-3.5" /> {t.photos.length}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab: รายแผนก */}
          {tab === 'dept' && (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#dce6f9]" style={{ backgroundColor: '#f5f8ff' }}>
                    {['แผนกวิชา','จำนวนเวร','บันทึกรวม','มา','ไม่มา','% เข้าเวร'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-[#4a6080]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.byDept.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-[#94a3b8]">ไม่พบข้อมูล</td></tr>
                  ) : report.byDept.map(d => (
                    <tr key={d.departmentName} className="border-b border-[#dce6f9] hover:bg-[#f5f8ff]">
                      <td className="px-3 py-2.5 font-medium text-[#1a2744]">{d.departmentName}</td>
                      <td className="px-3 py-2.5 text-center">{d.scheduleCount}</td>
                      <td className="px-3 py-2.5 text-center">{d.totalLogs}</td>
                      <td className="px-3 py-2.5 text-center text-[#0d9068] font-medium">{d.presentLogs}</td>
                      <td className="px-3 py-2.5 text-center text-red-500 font-medium">{d.totalLogs - d.presentLogs}</td>
                      <td className="px-3 py-2.5 min-w-[100px]"><PctBadge pct={d.rate} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab: รายวัน */}
          {tab === 'daily' && (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#dce6f9]" style={{ backgroundColor: '#f5f8ff' }}>
                    {['วันที่','แผนก','มา','ไม่มา','% เข้าเวร'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-[#4a6080]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.daily.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-10 text-[#94a3b8]">ไม่พบข้อมูล</td></tr>
                  ) : report.daily.flatMap(d => d.depts.map((dept, i) => (
                    <tr key={`${d.date}-${dept.name}`} className="border-b border-[#dce6f9] hover:bg-[#f5f8ff]">
                      {i === 0 && (
                        <td className="px-3 py-2.5 font-medium text-[#1d6ae5] cursor-pointer hover:underline" rowSpan={d.depts.length}
                            onClick={() => setSelectedDay(d)}>
                          {fmtDate(d.date)}
                        </td>
                      )}
                      <td className="px-3 py-2.5 text-[#4a6080]">{dept.name}</td>
                      <td className="px-3 py-2.5 text-center text-[#0d9068] font-medium">{dept.present}</td>
                      <td className="px-3 py-2.5 text-center text-red-500 font-medium">{dept.total - dept.present}</td>
                      <td className="px-3 py-2.5 min-w-[100px]">
                        <PctBadge pct={dept.total > 0 ? Math.round(dept.present / dept.total * 100) : 0} />
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {photoModal && (
        <PhotoModal photos={photoModal.photos} name={photoModal.teacher.name} onClose={() => setPhotoModal(null)} />
      )}

      {selectedDay && (
        <DayDetailModal day={selectedDay} onClose={() => setSelectedDay(null)} />
      )}
    </div>
  );
}
