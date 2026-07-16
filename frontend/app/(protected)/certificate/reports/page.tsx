'use client';
import { useCallback, useEffect, useState } from 'react';
import { FileText, Printer, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import CertTabBar from '@/components/certificate/CertTabBar';

interface Project { id: number; name: string }
interface CertRow { id: number; certNo: string; firstname: string; lastname: string; position: string | null; award: string | null; projectName: string | null; issueDate: string; issuerName: string | null }
interface SeriesRow { id: number; projectName: string | null; prefix: string; year: string | null; startNum: number; quantity: number; reqFirstname: string | null; reqLastname: string | null; reqDepartment: string | null; createdAt: string }

const MONTHS: Record<string, string> = { '1':'มกราคม','2':'กุมภาพันธ์','3':'มีนาคม','4':'เมษายน','5':'พฤษภาคม','6':'มิถุนายน','7':'กรกฎาคม','8':'สิงหาคม','9':'กันยายน','10':'ตุลาคม','11':'พฤศจิกายน','12':'ธันวาคม' };

function thaiDate(d: string) {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()+543}`;
}

export default function CertReportsPage() {
  const [tab, setTab] = useState<'certs' | 'series'>('certs');
  const [isAdmin, setIsAdmin] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  const [month, setMonth] = useState('all');
  const [year, setYear]   = useState('all');
  const [proj, setProj]   = useState('all');
  const [years, setYears] = useState<number[]>([]);

  const [certRows, setCertRows]   = useState<CertRow[]>([]);
  const [seriesRows, setSeriesRows] = useState<SeriesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userDept, setUserDept] = useState('');

  useEffect(() => {
    api.get<{ data: { isCertAdmin: boolean } }>('/certificate/me').then((r) => setIsAdmin(r.data.isCertAdmin)).catch(() => {});
    api.get<{ data: Project[] }>('/certificate/projects').then((r) => setProjects(r.data ?? [])).catch(() => {});
    api.get<{ data: { name: string; department?: string; position?: string; isSuperAdmin: boolean } }>('/auth/me')
      .then((r) => { setUserName(r.data.name); setUserDept(r.data.department || (r.data.isSuperAdmin ? 'ผู้ดูแลระบบ' : '')); }).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    if (tab === 'certs') {
      const p = new URLSearchParams({ month, year, projectId: proj });
      api.get<{ data: { rows: CertRow[]; years: number[] } }>(`/certificate/reports/certs?${p}`)
        .then((r) => { setCertRows(r.data.rows ?? []); setYears(r.data.years ?? []); }).catch(() => {}).finally(() => setLoading(false));
    } else {
      const p = new URLSearchParams({ month, year });
      api.get<{ data: { rows: SeriesRow[]; years: number[] } }>(`/certificate/reports/series?${p}`)
        .then((r) => { setSeriesRows(r.data.rows ?? []); setYears(r.data.years ?? []); }).catch(() => {}).finally(() => setLoading(false));
    }
  }, [tab, month, year, proj]);

  useEffect(() => { load(); }, [load]);

  const totalSeriesCerts = seriesRows.reduce((a, s) => a + s.quantity, 0);
  const sel = 'px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400';

  return (
    <div className="p-4 md:p-6 space-y-4">
      <style>{`@media print { body * { visibility: hidden; } #printArea, #printArea * { visibility: visible; } #printArea { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; border: none !important; box-shadow: none !important; } .no-print { display: none !important; } @page { size: A4 landscape; margin: 1.5cm; } }`}</style>

      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FileText size={20} style={{ color: '#c2410c' }} /> รายงาน</h1>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"><Printer size={15} /> พิมพ์รายงาน</button>
      </div>

      <div className="no-print"><CertTabBar /></div>

      {/* report type + filters */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap gap-2 items-center no-print">
        <div className="flex rounded-lg overflow-hidden border border-slate-200">
          <button onClick={() => setTab('certs')} className={`px-4 py-2 text-sm font-bold ${tab === 'certs' ? 'bg-orange-600 text-white' : 'bg-white text-slate-600'}`}>การออกเกียรติบัตร</button>
          {isAdmin && <button onClick={() => setTab('series')} className={`px-4 py-2 text-sm font-bold ${tab === 'series' ? 'bg-orange-600 text-white' : 'bg-white text-slate-600'}`}>การออกเลขชุด</button>}
        </div>
        <div className="flex-1" />
        {tab === 'certs' && (
          <select value={proj} onChange={(e) => setProj(e.target.value)} className={sel}>
            <option value="all">ทุกโครงการ</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <select value={month} onChange={(e) => setMonth(e.target.value)} className={sel}>
          <option value="all">ทุกเดือน</option>
          {Object.entries(MONTHS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)} className={sel}>
          <option value="all">ทุกปี</option>
          {years.map((y) => <option key={y} value={y}>{y + 543}</option>)}
        </select>
      </div>

      {/* printable */}
      <div id="printArea" className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="text-center mb-6 border-b border-slate-200 pb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logoretc.png" alt="โลโก้" className="w-20 h-20 object-contain mx-auto mb-3" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <h3 className="text-2xl font-bold text-slate-800">{tab === 'certs' ? 'รายงานสรุปการออกเกียรติบัตร' : 'รายงานสรุปการออกเลขชุดเกียรติบัตร'}</h3>
          <h4 className="text-lg font-semibold text-slate-700 mt-1">วิทยาลัยเทคนิคร้อยเอ็ด</h4>
          <p className="text-slate-600 mt-2">ประจำเดือน: <b>{month === 'all' ? 'ทั้งหมด' : MONTHS[month]}</b> ปี พ.ศ.: <b>{year === 'all' ? 'ทั้งหมด' : Number(year) + 543}</b></p>
        </div>

        {loading ? (
          <div className="py-10 text-center text-slate-400"><Loader2 className="animate-spin inline" /></div>
        ) : tab === 'certs' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse border border-slate-300">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b-2 border-slate-400">
                <tr>
                  <th className="px-3 py-3 border border-slate-300 text-center w-12">ลำดับ</th>
                  <th className="px-3 py-3 border border-slate-300">เลขที่</th>
                  <th className="px-3 py-3 border border-slate-300">ชื่อ - นามสกุล</th>
                  <th className="px-3 py-3 border border-slate-300">ตำแหน่ง</th>
                  <th className="px-3 py-3 border border-slate-300">โครงการ</th>
                  <th className="px-3 py-3 border border-slate-300">รางวัล</th>
                  <th className="px-3 py-3 border border-slate-300 text-center">วันที่ออก</th>
                  <th className="px-3 py-3 border border-slate-300 text-center">ผู้ออก</th>
                </tr>
              </thead>
              <tbody>
                {certRows.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-10 text-center text-slate-500 border border-slate-300">ไม่พบข้อมูล</td></tr>
                ) : certRows.map((r, i) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 border border-slate-300 text-center">{i + 1}</td>
                    <td className="px-3 py-2.5 border border-slate-300 font-mono text-blue-700 text-xs whitespace-nowrap">{r.certNo}</td>
                    <td className="px-3 py-2.5 border border-slate-300 font-bold whitespace-nowrap">{r.firstname} {r.lastname}</td>
                    <td className="px-3 py-2.5 border border-slate-300 text-xs">{r.position || '-'}</td>
                    <td className="px-3 py-2.5 border border-slate-300 text-xs max-w-[180px] truncate">{r.projectName ?? '-'}</td>
                    <td className="px-3 py-2.5 border border-slate-300 text-xs">{r.award || '-'}</td>
                    <td className="px-3 py-2.5 border border-slate-300 text-center text-xs whitespace-nowrap">{thaiDate(r.issueDate)}</td>
                    <td className="px-3 py-2.5 border border-slate-300 text-center text-xs whitespace-nowrap">{r.issuerName ?? 'ระบบ'}</td>
                  </tr>
                ))}
              </tbody>
              {certRows.length > 0 && (
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400">
                  <tr><td colSpan={7} className="px-4 py-3 border border-slate-300 text-right">รวมทั้งหมด</td><td className="px-4 py-3 border border-slate-300 text-center text-blue-700">{certRows.length} ใบ</td></tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse border border-slate-300">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b-2 border-slate-400">
                <tr>
                  <th className="px-4 py-3 border border-slate-300 text-center w-12">ลำดับ</th>
                  <th className="px-4 py-3 border border-slate-300">เลขที่ (ช่วงรหัส)</th>
                  <th className="px-4 py-3 border border-slate-300">โครงการ</th>
                  <th className="px-4 py-3 border border-slate-300">ผู้ขอ / แผนก</th>
                  <th className="px-4 py-3 border border-slate-300 text-center">วันที่ออกเลข</th>
                  <th className="px-4 py-3 border border-slate-300 text-center w-20">จำนวน</th>
                </tr>
              </thead>
              <tbody>
                {seriesRows.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-500 border border-slate-300">ไม่พบข้อมูล</td></tr>
                ) : seriesRows.map((s, i) => {
                  const start = String(s.startNum).padStart(3, '0');
                  const end = String(s.startNum + s.quantity - 1).padStart(3, '0');
                  const range = `${s.prefix}${start}${s.year ?? ''} - ${s.prefix}${end}${s.year ?? ''}`;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 border border-slate-300 text-center">{i + 1}</td>
                      <td className="px-4 py-2.5 border border-slate-300 font-mono text-blue-700 text-xs">{range}</td>
                      <td className="px-4 py-2.5 border border-slate-300 font-medium">{s.projectName ?? '-'}</td>
                      <td className="px-4 py-2.5 border border-slate-300">
                        <div className="font-bold text-sm">{(s.reqFirstname || s.reqLastname) ? `${s.reqFirstname ?? ''} ${s.reqLastname ?? ''}` : 'ไม่ระบุ'}</div>
                        <div className="text-xs text-slate-500">{s.reqDepartment || '-'}</div>
                      </td>
                      <td className="px-4 py-2.5 border border-slate-300 text-center text-xs whitespace-nowrap">{thaiDate(s.createdAt)}</td>
                      <td className="px-4 py-2.5 border border-slate-300 text-center font-bold text-emerald-700">{s.quantity}</td>
                    </tr>
                  );
                })}
              </tbody>
              {seriesRows.length > 0 && (
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400">
                  <tr><td colSpan={5} className="px-4 py-3 border border-slate-300 text-right">รวมจำนวนเกียรติบัตรทั้งหมดที่ขอออกเลข</td><td className="px-4 py-3 border border-slate-300 text-center text-emerald-700">{totalSeriesCerts.toLocaleString()}</td></tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        <div className="mt-16 mb-6 flex justify-end pr-4 md:pr-16">
          <div className="text-center w-64">
            <p className="mb-12 text-slate-800 text-sm">ลงชื่อ.......................................................ผู้รายงาน</p>
            <p className="text-slate-800 font-bold">( {userName} )</p>
            <p className="mt-2 text-slate-700 text-sm">ตำแหน่ง {userDept}</p>
            <p className="mt-1 text-slate-600 text-sm">วันที่ {thaiDate(new Date().toISOString())}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
