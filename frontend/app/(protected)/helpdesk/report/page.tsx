'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { ChevronLeft, Download, Loader2, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportData {
  total: number; completed: number; totalCost: number;
  trend: { month: string; total: number; completed: number }[];
  byStatus: { status: string; count: number }[];
  tickets: {
    id: number; ticketNo: string; title: string; status: string; urgency: string;
    createdAt: string; reporter: string; technician: string; cost: number | string;
  }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  pending: 'รอรับเรื่อง', assigned: 'มอบหมาย', in_progress: 'กำลังซ่อม',
  waiting_parts: 'รออะไหล่', completed: 'เสร็จสิ้น', cancelled: 'ยกเลิก',
};
const STATUS_COLOR: Record<string, string> = {
  pending: '#3b82f6', assigned: '#f59e0b', in_progress: '#8b5cf6',
  waiting_parts: '#f97316', completed: '#10b981', cancelled: '#94a3b8',
};
const URGENCY_LABEL: Record<string, string> = { critical: '🚨 วิกฤต', urgent: '⚠️ เร่งด่วน', normal: '✅ ปกติ' };
const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const fmt = (d: string) => { const dt = new Date(d); return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear() + 543}`; };

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HelpdeskReportPage() {
  const router = useRouter();
  const [data, setData]     = useState<ReportData | null>(null);
  const [loading, setLoad]  = useState(true);
  const [error, setError]   = useState('');

  // Filters
  const today = new Date();
  const firstDay = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`;
  const lastDay  = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${new Date(today.getFullYear(), today.getMonth()+1, 0).getDate()}`;
  const [from, setFrom] = useState(firstDay);
  const [to,   setTo]   = useState(lastDay);
  const [statusF, setStatusF] = useState('');
  const [typeF,   setTypeF]   = useState('');

  const load = useCallback(async () => {
    setLoad(true); setError('');
    try {
      const p = new URLSearchParams();
      if (from)    p.set('from', from);
      if (to)      p.set('to', to);
      if (statusF) p.set('status', statusF);
      if (typeF)   p.set('type', typeF);
      const res = await api.get<{ data: ReportData }>(`/helpdesk/report?${p}`);
      setData(res.data);
    } catch { setError('โหลดข้อมูลไม่สำเร็จ'); }
    finally { setLoad(false); }
  }, [from, to, statusF, typeF]);

  useEffect(() => { load(); }, [load]);

  // Export CSV
  const exportCSV = () => {
    if (!data) return;
    const header = 'Ticket No,หัวข้อ,ผู้แจ้ง,ช่าง,ความเร่งด่วน,สถานะ,วันที่แจ้ง,ค่าซ่อม\n';
    const rows = data.tickets.map((t) =>
      `${t.ticketNo},"${t.title}","${t.reporter}","${t.technician}",${URGENCY_LABEL[t.urgency] ?? t.urgency},${STATUS_LABEL[t.status] ?? t.status},${fmt(t.createdAt)},${Number(t.cost).toLocaleString('th-TH')}`
    ).join('\n');
    const blob = new Blob(['﻿' + header + rows], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `helpdesk-report-${from}-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/helpdesk')} className="p-2 rounded-xl hover:bg-[#f5f8ff]">
            <ChevronLeft className="w-4 h-4" style={{ color: '#4a6080' }} />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>รายงาน Helpdesk</h1>
            <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>สรุปการแจ้งซ่อมและสถิติ</p>
          </div>
        </div>
        <button onClick={exportCSV} disabled={!data} className="btn-secondary flex items-center gap-1.5 text-sm">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4" style={{ border: '1px solid #dce6f9' }}>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium" style={{ color: '#4a6080' }}>ตั้งแต่</label>
            <input type="date" className="input-field text-sm py-1.5 w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium" style={{ color: '#4a6080' }}>ถึง</label>
            <input type="date" className="input-field text-sm py-1.5 w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <select className="input-field text-sm py-1.5 w-auto" value={statusF} onChange={(e) => setStatusF(e.target.value)}>
            <option value="">สถานะทั้งหมด</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button onClick={load} className="btn-primary text-sm py-1.5">ค้นหา</button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3" style={{ color: '#94a3b8' }}>
          <Loader2 className="w-6 h-6 animate-spin" /> กำลังโหลด...
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      ) : data ? (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'ทั้งหมด',     value: data.total,            text: '#1d6ae5', bg: '#eff6ff' },
              { label: 'เสร็จสิ้น',   value: data.completed,        text: '#0d9068', bg: '#e6f9f0' },
              { label: 'อัตราสำเร็จ', value: `${data.total > 0 ? Math.round((data.completed/data.total)*100) : 0}%`, text: '#7c3aed', bg: '#f5f3ff' },
              { label: 'ค่าซ่อมรวม',  value: `${data.totalCost.toLocaleString('th-TH')} ฿`, text: '#b45309', bg: '#fffbeb' },
            ].map(({ label, value, text, bg }) => (
              <div key={label} className="bg-white rounded-xl p-3 text-center" style={{ border: '1px solid #dce6f9' }}>
                <p className="text-xl font-bold" style={{ color: text }}>{value}</p>
                <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Line chart */}
            <div className="md:col-span-2 bg-white rounded-xl p-4" style={{ border: '1px solid #dce6f9' }}>
              <p className="text-sm font-semibold mb-4" style={{ color: '#1a2744' }}>แนวโน้มรายเดือน</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #dce6f9' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="total" stroke="#1d6ae5" strokeWidth={2} dot={false} name="ทั้งหมด" />
                  <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={false} name="เสร็จ" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Pie chart */}
            <div className="bg-white rounded-xl p-4" style={{ border: '1px solid #dce6f9' }}>
              <p className="text-sm font-semibold mb-4" style={{ color: '#1a2744' }}>สถานะ</p>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={data.byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={60} label={false}>
                    {data.byStatus.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLOR[entry.status] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, STATUS_LABEL[name as string] ?? name]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="space-y-1 mt-2">
                {data.byStatus.map((s) => (
                  <div key={s.status} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLOR[s.status] ?? '#94a3b8' }} />
                    <span className="flex-1" style={{ color: '#4a6080' }}>{STATUS_LABEL[s.status] ?? s.status}</span>
                    <span className="font-semibold" style={{ color: '#1a2744' }}>{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Ticket table */}
          <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #dce6f9' }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f4ff' }}>
              <p className="text-sm font-semibold" style={{ color: '#1a2744' }}>รายการทั้งหมด</p>
              <span className="text-xs" style={{ color: '#94a3b8' }}>{data.tickets.length} รายการ</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#f8faff', borderBottom: '1px solid #f0f4ff' }}>
                    {['Ticket No', 'หัวข้อ', 'ผู้แจ้ง', 'ช่าง', 'ความเร่งด่วน', 'สถานะ', 'วันที่', 'ค่าซ่อม'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: '#94a3b8' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.tickets.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-sm" style={{ color: '#94a3b8' }}>ไม่มีข้อมูล</td></tr>
                  ) : data.tickets.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f5f8ff' }} className="hover:bg-[#fafbff]">
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: '#1d6ae5' }}>{t.ticketNo}</td>
                      <td className="px-4 py-3 text-xs max-w-[180px] truncate" style={{ color: '#1a2744' }}>{t.title}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{t.reporter}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{t.technician}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{URGENCY_LABEL[t.urgency] ?? t.urgency}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                          style={{ backgroundColor: (STATUS_COLOR[t.status] ?? '#94a3b8') + '22', color: STATUS_COLOR[t.status] ?? '#64748b' }}>
                          {STATUS_LABEL[t.status] ?? t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#4a6080' }}>{fmt(t.createdAt)}</td>
                      <td className="px-4 py-3 text-xs text-right" style={{ color: '#1a2744' }}>
                        {Number(t.cost) > 0 ? `${Number(t.cost).toLocaleString('th-TH')} ฿` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
