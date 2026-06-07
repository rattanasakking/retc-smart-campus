'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, FileBarChart, Download } from 'lucide-react';
import { api } from '@/lib/api';

interface LeaveRequest {
  id: number;
  status: string;
  totalDays: number;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  reason: string;
  user: { id: number; name: string; department?: string; personnelType?: { name: string } };
  leaveType: { id: number; name: string; icon?: string };
}

interface ReportData {
  requests: LeaveRequest[];
  summary: {
    totalRequests: number;
    totalDays: number;
    byType: Record<string, number>;
    byPerson: { user: { id: number; name: string; department?: string }; total: number; byType: Record<string, number> }[];
  };
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'รออนุมัติ', APPROVED: 'อนุมัติ', REJECTED: 'ไม่อนุมัติ', CANCELLED: 'ยกเลิก',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700', APPROVED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-600', CANCELLED: 'bg-gray-100 text-gray-500',
};

export default function LeaveReportPage() {
  const router = useRouter();

  const [data, setData]       = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const currentYear = new Date().getFullYear() + 543;
  const [yearFilter, setYear]   = useState(String(currentYear));
  const [monthFilter, setMonth] = useState('');
  const [typeFilter, setType]   = useState('');
  const [tab, setTab]           = useState<'list' | 'summary'>('list');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year: yearFilter });
      if (monthFilter) params.set('month', monthFilter);
      if (typeFilter)  params.set('leaveTypeId', typeFilter);
      const res = await api.get<any>(`/personnel/leaves/report?${params}`);
      setData(res.data);
    } finally { setLoading(false); }
  }, [yearFilter, monthFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  }

  function exportCSV() {
    if (!data?.requests.length) return;
    const header = 'ชื่อ,หน่วยงาน,ประเภทการลา,วันที่เริ่ม,วันที่สิ้นสุด,จำนวนวัน,สถานะ,เหตุผล';
    const rows = data.requests.map((r) =>
      [r.user.name, r.user.department ?? '', r.leaveType.name,
       r.startDate.slice(0, 10), r.endDate.slice(0, 10), r.totalDays,
       STATUS_LABEL[r.status] ?? r.status, `"${r.reason}"`].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `leave-report-${yearFilter}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const years  = [currentYear, currentYear - 1, currentYear - 2];
  const months = [1,2,3,4,5,6,7,8,9,10,11,12];
  const sel    = 'border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400';

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FileBarChart size={20} /> รายงานการลา
            </h1>
          </div>
        </div>
        <button onClick={exportCSV} disabled={!data?.requests.length}
          className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-40">
          <Download size={15} /> ส่งออก CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={yearFilter} onChange={(e) => setYear(e.target.value)} className={sel}>
          {years.map((y) => <option key={y} value={y}>ปี {y}</option>)}
        </select>
        <select value={monthFilter} onChange={(e) => setMonth(e.target.value)} className={sel}>
          <option value="">ทุกเดือน</option>
          {months.map((m) => <option key={m} value={m}>เดือน {m}</option>)}
        </select>
      </div>

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard label="คำขอทั้งหมด" value={data.summary.totalRequests} unit="รายการ" />
          <SummaryCard label="วันลารวม" value={data.summary.totalDays} unit="วัน" />
          {Object.entries(data.summary.byType).slice(0, 2).map(([name, days]) => (
            <SummaryCard key={name} label={name} value={days} unit="วัน" />
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b text-sm">
        {(['list', 'summary'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'list' ? 'รายการทั้งหมด' : 'สรุปรายบุคคล'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <Loader2 className="animate-spin mr-2" size={20} /> กำลังโหลด...
        </div>
      ) : !data || data.requests.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl shadow">
          <FileBarChart size={40} className="mx-auto mb-2 opacity-40" />
          <p>ไม่พบข้อมูลในช่วงเวลาที่เลือก</p>
        </div>
      ) : tab === 'list' ? (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs uppercase">
                  <th className="py-3 px-4 text-left">บุคลากร</th>
                  <th className="py-3 px-4 text-left">ประเภทการลา</th>
                  <th className="py-3 px-4 text-left">วันที่</th>
                  <th className="py-3 px-4 text-center">วัน</th>
                  <th className="py-3 px-4 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.requests.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/leave/${r.id}`)}>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-gray-800">{r.user.name}</div>
                      <div className="text-xs text-gray-400">{r.user.department ?? ''}</div>
                    </td>
                    <td className="py-2.5 px-4 text-gray-700">
                      {r.leaveType.icon} {r.leaveType.name}
                    </td>
                    <td className="py-2.5 px-4 text-gray-500 text-xs">
                      {formatDate(r.startDate)} – {formatDate(r.endDate)}
                    </td>
                    <td className="py-2.5 px-4 text-center font-medium text-gray-800">{r.totalDays}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status] ?? ''}`}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs uppercase">
                  <th className="py-3 px-4 text-left">บุคลากร</th>
                  <th className="py-3 px-4 text-center">รวมทั้งหมด</th>
                  {data.summary.byType && Object.keys(data.summary.byType).map((k) => (
                    <th key={k} className="py-3 px-4 text-center">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.summary.byPerson.map((p) => (
                  <tr key={p.user.id} className="hover:bg-gray-50">
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-gray-800">{p.user.name}</div>
                      <div className="text-xs text-gray-400">{p.user.department ?? ''}</div>
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold text-blue-700">{p.total}</td>
                    {Object.keys(data.summary.byType).map((k) => (
                      <td key={k} className="py-2.5 px-4 text-center text-gray-600">
                        {p.byType[k] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-800">{value} <span className="text-sm font-normal text-gray-400">{unit}</span></p>
    </div>
  );
}
