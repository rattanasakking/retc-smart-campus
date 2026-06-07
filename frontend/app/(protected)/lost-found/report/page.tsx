'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Download, MapPin, Calendar, ChevronDown, Package } from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
} from 'recharts';

interface Category { id: number; name: string }
interface LostItem {
  id: number; refNo: string | null; title: string;
  category: { id: number; name: string } | null;
  foundDate: string | null; foundLocation: string | null;
  status: 'found' | 'claimed' | 'archived';
  reporter: { name: string };
  claimedByName: string | null; claimedAt: string | null;
  createdAt: string;
}
interface ReportData {
  total: number; claimed: number; unclaimed: number;
  items: LostItem[];
  byCategory: { categoryId: number | null; _count: { _all: number } }[];
  monthly: number[];
}

const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const COLORS = ['#1d6ae5','#0d9068','#f59e0b','#e11d48','#8b5cf6','#06b6d4','#f97316','#84cc16'];

const thDate = (iso: string | null) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function LostFoundReportPage() {
  const [data, setData]         = useState<ReportData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]   = useState(true);
  const [month, setMonth]       = useState('');
  const [year, setYear]         = useState(String(new Date().getFullYear()));
  const [catFilter, setCatFilter] = useState('');

  const load = (y = year, m = month, c = catFilter) => {
    setLoading(true);
    const p = new URLSearchParams({ year: y });
    if (m) p.set('month', m);
    if (c) p.set('categoryId', c);
    api.get<{ success: boolean; data: ReportData }>(`/lostfound/report?${p}`)
      .then(r => { if (r.success) setData(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get<{ success: boolean; data: Category[] }>('/lostfound/categories')
      .then(r => { if (r.success) setCategories(r.data); })
      .catch(() => {});
    load();
  }, []); // eslint-disable-line

  const pieData = data?.byCategory
    .filter(b => b._count._all > 0)
    .map(b => ({
      name: categories.find(c => c.id === b.categoryId)?.name || 'ไม่ระบุ',
      value: b._count._all,
    })) ?? [];

  const barData = (data?.monthly ?? []).map((count, i) => ({
    month: MONTHS_TH[i], count,
  }));

  const pct = data && data.total > 0
    ? Math.round((data.claimed / data.total) * 100)
    : 0;

  const exportCsv = () => {
    if (!data?.items.length) return;
    const headers = ['รหัส','ชื่อของ','ประเภท','สถานที่พบ','วันที่พบ','สถานะ','ผู้มารับ','วันที่รับ'];
    const rows = data.items.map(i => [
      i.refNo || '',
      i.title,
      i.category?.name || '',
      i.foundLocation || '',
      thDate(i.foundDate || i.createdAt),
      i.status === 'claimed' ? 'มีเจ้าของแล้ว' : 'รอเจ้าของ',
      i.claimedByName || '',
      thDate(i.claimedAt),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lost-found-${year}${month ? '-' + month.padStart(2, '0') : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1a2744]">รายงานของหาย</h1>
          <p className="text-sm text-[#4a6080] mt-0.5">สถิติและรายงานสรุปของหายในวิทยาลัย</p>
        </div>
        <button onClick={exportCsv} disabled={!data?.items.length}
          className="btn-secondary flex items-center gap-1.5 text-sm disabled:opacity-40">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card-sm flex flex-wrap gap-3">
        <div className="relative">
          <select value={year} onChange={e => { setYear(e.target.value); load(e.target.value, month, catFilter); }}
            className="input-field appearance-none pr-8 w-32">
            {years.map(y => <option key={y} value={y}>{Number(y) + 543} ({y})</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-3 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
        </div>
        <div className="relative">
          <select value={month} onChange={e => { setMonth(e.target.value); load(year, e.target.value, catFilter); }}
            className="input-field appearance-none pr-8 w-36">
            <option value="">ทุกเดือน</option>
            {MONTHS_TH.map((m, i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-3 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
        </div>
        <div className="relative">
          <select value={catFilter} onChange={e => { setCatFilter(e.target.value); load(year, month, e.target.value); }}
            className="input-field appearance-none pr-8 w-40">
            <option value="">ทุกประเภท</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-3 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'ทั้งหมด',        value: data?.total ?? '-',    color: '#1d6ae5', bg: '#eff4ff' },
          { label: 'รอเจ้าของ',       value: data?.unclaimed ?? '-', color: '#b45309', bg: '#fffbeb' },
          { label: 'มีเจ้าของแล้ว',   value: data?.claimed ?? '-',   color: '#0d9068', bg: '#f0fdf4' },
          { label: '% คืนได้',        value: data ? `${pct}%` : '-', color: '#7c3aed', bg: '#f5f3ff' },
        ].map(k => (
          <div key={k.label} className="card-sm" style={{ backgroundColor: k.bg, borderColor: k.color + '33' }}>
            <p className="text-xs font-medium mb-1" style={{ color: k.color }}>{k.label}</p>
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      {!loading && data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pie — by category */}
          <div className="card">
            <h3 className="font-semibold text-[#1a2744] mb-4 text-sm">ประเภทของที่พบมากที่สุด</h3>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-[#94a3b8] text-sm">ไม่มีข้อมูล</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Monthly counts grid */}
          <div className="card">
            <h3 className="font-semibold text-[#1a2744] mb-4 text-sm">จำนวนรายการรายเดือน ปี {Number(year) + 543}</h3>
            <div className="grid grid-cols-4 gap-2">
              {barData.map(({ month, count }) => (
                <div key={month} className="rounded-lg p-3 text-center" style={{ backgroundColor: '#f5f8ff' }}>
                  <p className="text-lg font-bold" style={{ color: count > 0 ? '#1d6ae5' : '#94a3b8' }}>{count}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>{month}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-[#dce6f9]" style={{ backgroundColor: '#f5f8ff' }}>
          <h3 className="font-semibold text-sm text-[#1a2744]">รายการทั้งหมด</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#dce6f9]" style={{ backgroundColor: '#f5f8ff' }}>
              {['รหัส','ชื่อของ','ประเภท','สถานที่พบ','วันที่พบ','สถานะ','ผู้มารับ','วันที่รับ'].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-[#4a6080] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[#dce6f9]">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-3 py-2.5"><div className="skeleton h-3 rounded w-full" /></td>
                  ))}
                </tr>
              ))
            ) : !data?.items.length ? (
              <tr><td colSpan={8} className="text-center py-12 text-[#94a3b8]">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                ไม่มีข้อมูลในช่วงเวลาที่เลือก
              </td></tr>
            ) : data.items.map(item => (
              <tr key={item.id} className="border-b border-[#dce6f9] hover:bg-[#f5f8ff]">
                <td className="px-3 py-2.5 text-xs font-mono text-[#4a6080]">{item.refNo || '-'}</td>
                <td className="px-3 py-2.5 font-medium text-[#1a2744] max-w-[160px]">
                  <span className="line-clamp-1">{item.title}</span>
                </td>
                <td className="px-3 py-2.5 text-xs text-[#4a6080]">{item.category?.name || '-'}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1 text-xs text-[#4a6080]">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="line-clamp-1">{item.foundLocation || '-'}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1 text-xs text-[#4a6080]">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    {thDate(item.foundDate || item.createdAt)}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  {item.status === 'claimed'
                    ? <span className="badge-approved">มีเจ้าของ</span>
                    : <span className="badge-pending">รอเจ้าของ</span>
                  }
                </td>
                <td className="px-3 py-2.5 text-xs text-[#4a6080]">{item.claimedByName || '-'}</td>
                <td className="px-3 py-2.5 text-xs text-[#4a6080]">{thDate(item.claimedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
