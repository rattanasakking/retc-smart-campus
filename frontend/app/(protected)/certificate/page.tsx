'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Award, Layers, Stamp, Plus, ExternalLink } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api';
import CertTabBar from '@/components/certificate/CertTabBar';

interface Stats { projectCount: number; certCount: number; year: number; monthly: number[] }

const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

export default function CertDashboard() {
  const [stats, setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: Stats }>('/certificate/stats')
      .then((r) => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const chartData = (stats?.monthly ?? []).map((v, i) => ({ month: MONTHS[i], count: v }));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Award size={22} style={{ color: '#c2410c' }} /> ระบบเกียรติบัตรออนไลน์
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">ออก จัดการ และตรวจสอบเกียรติบัตร</p>
        </div>
        <a href="/verify" target="_blank" rel="noreferrer"
           className="flex items-center gap-2 bg-white border border-orange-200 text-orange-700 px-4 py-2 rounded-lg text-sm hover:bg-orange-50">
          <ExternalLink size={15} /> หน้าค้นหาสาธารณะ
        </a>
      </div>

      <CertTabBar />

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="skeleton h-28 rounded-2xl" /><div className="skeleton h-28 rounded-2xl" />
          </div>
          <div className="skeleton h-72 rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center gap-5">
              <div className="p-4 rounded-xl text-white shadow-lg" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>
                <Layers size={26} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium mb-1">รูปแบบเกียรติบัตร</p>
                <p className="text-4xl font-extrabold text-slate-800">{stats?.projectCount ?? 0}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center gap-5">
              <div className="p-4 rounded-xl text-white shadow-lg" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                <Stamp size={26} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium mb-1">ออกเกียรติบัตรแล้ว</p>
                <p className="text-4xl font-extrabold text-slate-800">{stats?.certCount ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-bold text-slate-700 mb-4">สถิติการออกเกียรติบัตรรายเดือน ปี {(stats?.year ?? new Date().getFullYear()) + 543}</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(v) => [`${v} ใบ`, 'ออกเกียรติบัตร']} />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/certificate/certs" className="bg-white border border-slate-200 rounded-xl p-4 hover:border-orange-300 hover:shadow-sm transition flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center"><Plus size={18} className="text-orange-600" /></div>
              <div><p className="font-bold text-slate-800 text-sm">ออกเกียรติบัตร</p><p className="text-xs text-slate-500">เดี่ยว / นำเข้า CSV</p></div>
            </Link>
            <Link href="/certificate/projects" className="bg-white border border-slate-200 rounded-xl p-4 hover:border-orange-300 hover:shadow-sm transition flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Layers size={18} className="text-blue-600" /></div>
              <div><p className="font-bold text-slate-800 text-sm">รูปแบบเกียรติบัตร</p><p className="text-xs text-slate-500">อัปโหลด + จัดวางข้อความ</p></div>
            </Link>
            <Link href="/certificate/reports" className="bg-white border border-slate-200 rounded-xl p-4 hover:border-orange-300 hover:shadow-sm transition flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center"><Award size={18} className="text-indigo-600" /></div>
              <div><p className="font-bold text-slate-800 text-sm">รายงาน</p><p className="text-xs text-slate-500">สรุปการออกเกียรติบัตร</p></div>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
