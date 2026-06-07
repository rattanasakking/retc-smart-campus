'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Download, Check, AlertTriangle, Loader2, BarChart3,
} from 'lucide-react';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkType { id: number; name: string; color: string }
interface Division  { id: number; name: string }
interface WorkUnit  { id: number; name: string; divisionId: number }

interface UserStat {
  user:      { id: number; name: string; employeeId: string; position: string | null };
  total:     number;
  approved:  number;
  submitted: number;
  returned:  number;
  draft:     number;
  rate:      number;
}

interface WorkTypeStat { name: string; count: number }

interface ReportData {
  total:      number;
  approved:   number;
  submitted:  number;
  returned:   number;
  byUser:     UserStat[];
  byWorkType: WorkTypeStat[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function PctBadge({ pct }: { pct: number }) {
  const color = pct >= 80 ? '#0d9068' : pct >= 50 ? '#b45309' : '#dc2626';
  const bg    = pct >= 80 ? '#e6f9f0' : pct >= 50 ? '#fffbeb' : '#fef2f2';
  return (
    <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full"
      style={{ backgroundColor: bg, color }}>{pct}%</span>
  );
}

const POS_LABEL: Record<string, string> = {
  teacher: 'ครู', work_unit_chief: 'หน.งาน', department_chief: 'หน.แผนก',
  director: 'ผอ.', deputy_director: 'รอง ผอ.', division_chief: 'หน.ฝ่าย',
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkLogReportPage() {
  const router = useRouter();
  const [report, setReport]       = useState<ReportData | null>(null);
  const [loading, setLoading]     = useState(false);
  const [period, setPeriod]       = useState('month');
  const [month, setMonth]         = useState(String(new Date().getMonth() + 1));
  const [year, setYear]           = useState(String(new Date().getFullYear() + 543));
  const [workTypeId, setTypeId]   = useState('');
  const [divisionId, setDivId]    = useState('');
  const [workUnitId, setUnitId]   = useState('');
  const [workTypes, setTypes]     = useState<WorkType[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [allUnits, setAllUnits]   = useState<WorkUnit[]>([]);
  const [toast, setToast]         = useState('');
  const [toastErr, setToastErr]   = useState('');

  const showToast = (msg: string, isErr = false) => {
    if (isErr) { setToastErr(msg); setToast(''); } else { setToast(msg); setToastErr(''); }
    setTimeout(() => { setToast(''); setToastErr(''); }, 3000);
  };

  useEffect(() => {
    Promise.all([
      api.get<{ data: WorkType[] }>('/worklog/types'),
      api.get<{ data: Division[] }>('/settings/divisions'),
      api.get<{ data: WorkUnit[] }>('/settings/workunits'),
    ]).then(([t, d, u]) => {
      setTypes(t.data);
      setDivisions(d.data);
      setAllUnits(u.data);
    }).catch(() => {});
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (period === 'month') { params.set('month', month); params.set('year', year); }
      if (period === 'year')  params.set('year', year);
      if (workTypeId) params.set('workTypeId', workTypeId);
      if (workUnitId) params.set('workUnitId', workUnitId);
      else if (divisionId) params.set('divisionId', divisionId);
      const res = await api.get<{ data: ReportData }>(`/worklog/report?${params}`);
      setReport(res.data);
    } catch (e: unknown) {
      showToast((e as Error).message, true);
    } finally {
      setLoading(false);
    }
  }, [period, month, year, workTypeId, divisionId, workUnitId]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const filteredUnits = divisionId
    ? allUnits.filter((u) => u.divisionId === parseInt(divisionId))
    : allUnits;

  // Export CSV
  const exportCSV = () => {
    if (!report) return;
    const BOM    = '﻿';
    const header = ['ชื่อ', 'รหัสพนักงาน', 'ตำแหน่ง', 'บันทึกทั้งหมด', 'อนุมัติ', 'รออนุมัติ', 'ส่งคืน', '% อนุมัติ'];
    const rows   = report.byUser.map((u) => [
      u.user.name, u.user.employeeId,
      POS_LABEL[u.user.position ?? ''] ?? (u.user.position ?? ''),
      u.total, u.approved, u.submitted, u.returned, `${u.rate}%`,
    ]);
    const csv    = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob   = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href       = url;
    a.download   = `worklog_report_${period}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const YEARS  = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() + 543 - i));
  const PERIODS = [
    { value: 'week',     label: 'รายสัปดาห์' },
    { value: 'month',    label: 'รายเดือน' },
    { value: 'semester', label: 'รายภาคเรียน' },
    { value: 'year',     label: 'รายปี' },
  ];

  return (
    <div className="space-y-5 max-w-4xl">
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
          <button onClick={() => router.push('/worklog')} className="p-2 rounded-xl hover:bg-[#f5f8ff] transition-colors">
            <ChevronLeft className="w-4 h-4" style={{ color: '#4a6080' }} />
          </button>
          <BarChart3 className="w-5 h-5" style={{ color: '#1d6ae5' }} />
          <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>รายงานปฏิบัติงาน</h1>
        </div>
        <button
          onClick={exportCSV}
          disabled={!report || report.byUser.length === 0}
          className="btn-secondary flex items-center gap-1.5 text-sm py-2 disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1" style={{ borderBottom: '1px solid #dce6f9' }}>
        {PERIODS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setPeriod(value)}
            className="px-4 py-2.5 text-sm font-medium transition-colors"
            style={
              period === value
                ? { color: '#1d6ae5', borderBottom: '2px solid #1d6ae5', marginBottom: -1 }
                : { color: '#4a6080' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {(period === 'month' || period === 'year') && (
          <>
            {period === 'month' && (
              <select className="input-field text-sm py-2 w-auto" value={month} onChange={(e) => setMonth(e.target.value)}>
                {MONTHS_SHORT.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            )}
            <select className="input-field text-sm py-2 w-auto" value={year} onChange={(e) => setYear(e.target.value)}>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </>
        )}
        <select className="input-field text-sm py-2 w-auto" value={workTypeId} onChange={(e) => setTypeId(e.target.value)}>
          <option value="">ทุกประเภทงาน</option>
          {workTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="input-field text-sm py-2 w-auto" value={divisionId} onChange={(e) => { setDivId(e.target.value); setUnitId(''); }}>
          <option value="">ทุกฝ่าย</option>
          {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="input-field text-sm py-2 w-auto" value={workUnitId} onChange={(e) => setUnitId(e.target.value)} disabled={filteredUnits.length === 0}>
          <option value="">ทุกงาน</option>
          {filteredUnits.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3" style={{ color: '#94a3b8' }}>
          <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลด...
        </div>
      ) : report ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'บันทึกทั้งหมด', value: report.total,     color: '#1d6ae5', bg: '#e8f0fe' },
              { label: 'อนุมัติแล้ว',   value: report.approved,  color: '#0d9068', bg: '#e6f9f0' },
              { label: 'รออนุมัติ',     value: report.submitted, color: '#b45309', bg: '#fffbeb' },
              { label: 'ส่งคืน',        value: report.returned,  color: '#1d6ae5', bg: '#e8f0fe' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className="bg-white rounded-xl p-3 text-center" style={{ border: '1px solid #dce6f9' }}>
                <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Work type freq list */}
          {report.byWorkType.length > 0 && (
            <div className="card">
              <p className="text-sm font-semibold mb-3" style={{ color: '#1a2744' }}>ประเภทงานที่ทำบ่อย</p>
              <div className="space-y-1.5">
                {report.byWorkType.slice(0, 10).map((wt, i) => (
                  <div key={wt.name} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ backgroundColor: '#f5f8ff' }}>
                    <span className="text-[11px] w-5 text-center font-bold flex-shrink-0" style={{ color: i === 0 ? '#1d6ae5' : '#94a3b8' }}>{i + 1}</span>
                    <span className="text-xs flex-1 truncate" style={{ color: '#1a2744' }}>{wt.name}</span>
                    <span className="text-xs font-semibold flex-shrink-0" style={{ color: '#4a6080' }}>{wt.count} รายการ</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User table */}
          <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #dce6f9' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #f0f4ff', backgroundColor: '#f8faff' }}>
                  {['ชื่อ', 'บันทึก', 'อนุมัติ', 'รอ', 'ส่งคืน', '% อนุมัติ'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#94a3b8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.byUser.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: '#94a3b8' }}>ไม่มีข้อมูล</td></tr>
                ) : report.byUser.map((u) => (
                  <tr key={u.user.id} style={{ borderBottom: '1px solid #f5f8ff' }} className="hover:bg-[#fafbff]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm" style={{ color: '#1a2744' }}>{u.user.name}</p>
                      <p className="text-xs" style={{ color: '#94a3b8' }}>
                        {POS_LABEL[u.user.position ?? ''] ?? u.user.position ?? ''} · {u.user.employeeId}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center font-medium" style={{ color: '#1a2744' }}>{u.total}</td>
                    <td className="px-4 py-3 text-center font-medium" style={{ color: '#0d9068' }}>{u.approved}</td>
                    <td className="px-4 py-3 text-center" style={{ color: u.submitted > 0 ? '#b45309' : '#94a3b8' }}>{u.submitted}</td>
                    <td className="px-4 py-3 text-center" style={{ color: u.returned > 0 ? '#1d6ae5' : '#94a3b8' }}>{u.returned}</td>
                    <td className="px-4 py-3 min-w-[120px]"><PctBadge pct={u.rate} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
