'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import {
  CalendarCheck, ClipboardList, Monitor, Wrench, DoorOpen,
  PackageSearch, Printer, Download, ChevronDown,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import * as XLSX from 'xlsx';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DutySection    { total: number; present: number; absent: number; byDept: NameCount[] }
interface WorklogSection { total: number; approved: number; pending: number; byType: NameCount[] }
interface EqSection      { total: number; active: number; damaged: number; disposed: number; borrowed: number }
interface HdSection      { total: number; completed: number; pending: number; cancelled: number; avgDays: number; totalCost: number; byType: NameCount[]; trend: MonthCount[] }
interface RoomSection    { totalBookings: number; approved: number; totalHours: number; byRoom: NameCount[] }
interface LFSection      { total: number; claimed: number; unclaimed: number }
interface NameCount      { name: string; count: number }
interface MonthCount     { month: string; count: number }
interface OverviewData {
  dateRange: { start: string; end: string };
  duty: DutySection;
  worklog: WorklogSection;
  equipment: EqSection;
  helpdesk: HdSection;
  room: RoomSection;
  lostfound: LFSection;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CHART_COLORS = ['#1d6ae5','#0d9068','#f59e0b','#e11d48','#8b5cf6','#06b6d4','#f97316','#84cc16'];
const THAI_MONTHS  = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

function fmtNum(n: number | undefined) { return (n ?? 0).toLocaleString('th-TH'); }
function fmtCurrency(n: number | undefined) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(n ?? 0);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionCard({ title, icon, children, id }: { title: string; icon: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="card space-y-4 print-section">
      <div className="flex items-center gap-2.5 pb-3 border-b border-[#dce6f9]">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eff4ff' }}>
          <div className="text-[#1d6ae5]">{icon}</div>
        </div>
        <h2 className="font-bold text-[#1a2744]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function KpiCard({ label, value, sub, color = '#1d6ae5', bg = '#eff4ff' }: { label: string; value: string | number; sub?: string; color?: string; bg?: string }) {
  return (
    <div className="rounded-xl p-3 border" style={{ backgroundColor: bg, borderColor: color + '33' }}>
      <p className="text-xs font-medium mb-0.5" style={{ color }}>{label}</p>
      <p className="text-2xl font-bold leading-tight" style={{ color }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: color + 'aa' }}>{sub}</p>}
    </div>
  );
}

function EmptyChart() {
  return <div className="flex items-center justify-center h-40 text-[#94a3b8] text-sm">ไม่มีข้อมูล</div>;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="card space-y-3">
          <div className="skeleton h-5 w-40 rounded" />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, j) => <div key={j} className="skeleton h-20 rounded-xl" />)}
          </div>
          <div className="skeleton h-40 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabType = 'year' | 'semester' | 'month';

const YEARS_CE = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

export default function ReportOverviewPage() {
  const [data, setData]       = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<TabType>('year');
  const [year, setYear]       = useState(String(new Date().getFullYear()));
  const [semester, setSemester] = useState('1');
  const [month, setMonth]     = useState(String(new Date().getMonth() + 1));
  const didMount              = useRef(false);

  const load = (t = tab, y = year, s = semester, m = month) => {
    setLoading(true);
    const p = new URLSearchParams({ year: y });
    if (t === 'semester') p.set('semester', s);
    if (t === 'month')    p.set('month', m);
    api.get<{ success: boolean; data: OverviewData }>(`/report/overview?${p}`)
      .then(r => { if (r.success) setData(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!didMount.current) { didMount.current = true; load(); }
  }, []); // eslint-disable-line

  const filterLabel = () => {
    const thYear = Number(year) + 543;
    if (tab === 'year') return `ปีการศึกษา ${thYear} (${year})`;
    if (tab === 'semester') return `ภาคเรียนที่ ${semester}/${thYear}`;
    return `${THAI_MONTHS[Number(month) - 1]} ${thYear}`;
  };

  // ── Excel Export ──────────────────────────────────────────────────────────
  const exportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    const addSheet = (name: string, rows: (string | number)[][]) => {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
    };

    addSheet('สรุปรวม', [
      [`รายงานภาพรวม RETC Smart Campus`],
      [`ช่วงเวลา: ${filterLabel()}`],
      [],
      ['หมวดหมู่', 'ตัวชี้วัด', 'จำนวน'],
      ['เวรรับนักเรียน', 'รายการทั้งหมด', data.duty.total],
      ['', 'มาปฏิบัติ', data.duty.present],
      ['', 'ขาดเวร', data.duty.absent],
      ['บันทึกปฏิบัติงาน', 'รายการทั้งหมด', data.worklog.total],
      ['', 'อนุมัติแล้ว', data.worklog.approved],
      ['', 'รอดำเนินการ', data.worklog.pending],
      ['ครุภัณฑ์', 'ทั้งหมด', data.equipment.total],
      ['', 'ปกติ', data.equipment.active],
      ['', 'ชำรุด', data.equipment.damaged],
      ['', 'ยืม', data.equipment.borrowed],
      ['Helpdesk', 'ทั้งหมด', data.helpdesk.total],
      ['', 'เสร็จแล้ว', data.helpdesk.completed],
      ['', 'รอดำเนินการ', data.helpdesk.pending],
      ['', 'ค่าซ่อมรวม (บาท)', data.helpdesk.totalCost],
      ['จองห้องประชุม', 'ทั้งหมด', data.room.totalBookings],
      ['', 'อนุมัติ', data.room.approved],
      ['', 'ชั่วโมงรวม', data.room.totalHours],
      ['ของหาย', 'ทั้งหมด', data.lostfound.total],
      ['', 'คืนเจ้าของแล้ว', data.lostfound.claimed],
      ['', 'ยังไม่คืน', data.lostfound.unclaimed],
    ]);

    if (data.duty.byDept.length) {
      addSheet('เวร-รายแผนก', [
        ['แผนก', 'จำนวนเวร'],
        ...data.duty.byDept.map(d => [d.name, d.count]),
      ]);
    }
    if (data.worklog.byType.length) {
      addSheet('งาน-รายประเภท', [
        ['ประเภทงาน', 'จำนวน'],
        ...data.worklog.byType.map(t => [t.name, t.count]),
      ]);
    }
    if (data.helpdesk.byType.length) {
      addSheet('ซ่อม-รายประเภท', [
        ['ประเภท', 'จำนวน'],
        ...data.helpdesk.byType.map(t => [t.name, t.count]),
      ]);
    }
    if (data.helpdesk.trend.length) {
      addSheet('ซ่อม-รายเดือน', [
        ['เดือน', 'จำนวน'],
        ...data.helpdesk.trend.map(t => [t.month, t.count]),
      ]);
    }
    if (data.room.byRoom.length) {
      addSheet('ห้อง-รายห้อง', [
        ['ห้อง', 'จำนวนครั้ง'],
        ...data.room.byRoom.map(r => [r.name, r.count]),
      ]);
    }

    XLSX.writeFile(wb, `retc-report-${year}.xlsx`);
  };

  const d = data;

  // ── EquipmentDonut data ───────────────────────────────────────────────────
  const eqDonut = d ? [
    { name: 'ปกติ',    value: d.equipment.active,   color: '#0d9068' },
    { name: 'ชำรุด',   value: d.equipment.damaged,  color: '#f59e0b' },
    { name: 'ยืม',     value: d.equipment.borrowed, color: '#1d6ae5' },
    { name: 'จำหน่าย', value: d.equipment.disposed, color: '#94a3b8' },
  ].filter(e => e.value > 0) : [];

  // ── % return rate ─────────────────────────────────────────────────────────
  const lfPct = d && d.lostfound.total > 0
    ? Math.round((d.lostfound.claimed / d.lostfound.total) * 100)
    : 0;

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      {/* Print styles */}
      <style>{`
        @media print {
          aside, [data-topbar], .no-print { display: none !important; }
          .print-section { page-break-inside: avoid; margin-bottom: 24px; }
          body { background: white !important; font-size: 12px; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1a2744]">รายงานภาพรวม</h1>
          <p className="text-sm text-[#4a6080] mt-0.5">{filterLabel()}</p>
        </div>
        <div className="flex gap-2 no-print">
          <button onClick={() => window.print()}
            className="btn-secondary flex items-center gap-1.5 text-sm">
            <Printer className="w-4 h-4" /> พิมพ์ PDF
          </button>
          <button onClick={exportExcel} disabled={!d}
            className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-40">
            <Download className="w-4 h-4" /> Export Excel
          </button>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 no-print">
        <div className="flex rounded-xl overflow-hidden border border-[#dce6f9]">
          {([['year','รายปี'],['semester','รายภาคเรียน'],['month','รายเดือน']] as [TabType, string][]).map(([t, label]) => (
            <button key={t}
              onClick={() => { setTab(t); load(t); }}
              className="px-4 py-2 text-sm font-medium transition-colors"
              style={{
                backgroundColor: tab === t ? '#1d6ae5' : 'white',
                color: tab === t ? 'white' : '#4a6080',
              }}
            >{label}</button>
          ))}
        </div>

        {/* Year */}
        <div className="relative">
          <select value={year}
            onChange={e => { setYear(e.target.value); load(tab, e.target.value); }}
            className="input-field appearance-none pr-8 w-44 py-2">
            {YEARS_CE.map(y => (
              <option key={y} value={y}>{y + 543} ({y})</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
        </div>

        {/* Semester selector */}
        {tab === 'semester' && (
          <div className="relative">
            <select value={semester}
              onChange={e => { setSemester(e.target.value); load(tab, year, e.target.value); }}
              className="input-field appearance-none pr-8 w-36 py-2">
              <option value="1">ภาคเรียนที่ 1</option>
              <option value="2">ภาคเรียนที่ 2</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
          </div>
        )}

        {/* Month selector */}
        {tab === 'month' && (
          <div className="relative">
            <select value={month}
              onChange={e => { setMonth(e.target.value); load(tab, year, semester, e.target.value); }}
              className="input-field appearance-none pr-8 w-36 py-2">
              {THAI_MONTHS.map((m, i) => (
                <option key={i+1} value={i+1}>{m}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
          </div>
        )}
      </div>

      {/* ── Loading ───────────────────────────────────────────────────────── */}
      {loading && <LoadingSkeleton />}

      {/* ── Sections ──────────────────────────────────────────────────────── */}
      {!loading && d && (
        <div className="space-y-5">

          {/* ── 1. Duty ──────────────────────────────────────────────────── */}
          <SectionCard id="s-duty" title="เวรรับนักเรียน" icon={<CalendarCheck className="w-4 h-4" />}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="รายการทั้งหมด" value={fmtNum(d.duty.total)}   color="#1d6ae5" bg="#eff4ff" />
              <KpiCard label="มาปฏิบัติ"      value={fmtNum(d.duty.present)} color="#0d9068" bg="#f0fdf4" />
              <KpiCard label="ขาดเวร"          value={fmtNum(d.duty.absent)}  color="#e11d48" bg="#fff1f2" />
              <KpiCard label="% เข้าร่วม"
                value={d.duty.total > 0 ? `${Math.round((d.duty.present / (d.duty.present + d.duty.absent || 1)) * 100)}%` : '-'}
                color="#7c3aed" bg="#f5f3ff" />
            </div>
            {d.duty.byDept.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-[#4a6080] mb-2">จำนวนเวรรายแผนก</p>
                <div className="space-y-1.5">
                  {[...d.duty.byDept].sort((a, b) => b.count - a.count).map((dep, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ backgroundColor: '#f5f8ff' }}>
                      <span className="text-xs flex-1 truncate" style={{ color: '#1a2744' }}>{dep.name}</span>
                      <span className="text-xs font-semibold flex-shrink-0" style={{ color: '#1d6ae5' }}>{dep.count} เวร</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <EmptyChart />}
          </SectionCard>

          {/* ── 2. WorkLog ───────────────────────────────────────────────── */}
          <SectionCard id="s-worklog" title="บันทึกปฏิบัติงาน" icon={<ClipboardList className="w-4 h-4" />}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <KpiCard label="รายการทั้งหมด" value={fmtNum(d.worklog.total)}    color="#1d6ae5" bg="#eff4ff" />
              <KpiCard label="อนุมัติแล้ว"    value={fmtNum(d.worklog.approved)} color="#0d9068" bg="#f0fdf4" />
              <KpiCard label="รอดำเนินการ"    value={fmtNum(d.worklog.pending)}  color="#b45309" bg="#fffbeb" />
            </div>
            {d.worklog.byType.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-64">
                  <p className="text-xs font-semibold text-[#4a6080] mb-2">สัดส่วนประเภทงาน</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={d.worklog.byType} dataKey="count" nameKey="name"
                           cx="50%" cy="50%" outerRadius={80}>
                        {d.worklog.byType.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [v, 'รายการ']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5">
                  {d.worklog.byType.slice(0, 8).map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-xs text-[#1a2744] flex-1 truncate">{t.name}</span>
                      <span className="text-xs font-semibold text-[#1a2744]">{t.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <EmptyChart />}
          </SectionCard>

          {/* ── 3. Equipment ─────────────────────────────────────────────── */}
          <SectionCard id="s-equipment" title="ครุภัณฑ์" icon={<Monitor className="w-4 h-4" />}>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <KpiCard label="ทั้งหมด"   value={fmtNum(d.equipment.total)}    color="#1d6ae5" bg="#eff4ff" />
              <KpiCard label="ปกติ"      value={fmtNum(d.equipment.active)}   color="#0d9068" bg="#f0fdf4" />
              <KpiCard label="ชำรุด"     value={fmtNum(d.equipment.damaged)}  color="#f59e0b" bg="#fffbeb" />
              <KpiCard label="ยืม"       value={fmtNum(d.equipment.borrowed)} color="#1d6ae5" bg="#eff4ff" />
              <KpiCard label="จำหน่าย"  value={fmtNum(d.equipment.disposed)} color="#94a3b8" bg="#f8faff" />
            </div>
            {eqDonut.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-64">
                  <p className="text-xs font-semibold text-[#4a6080] mb-2">สถานะครุภัณฑ์</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={eqDonut} dataKey="value" nameKey="name"
                           cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                        {eqDonut.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [v, 'รายการ']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  {eqDonut.map((e, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
                      <span className="text-[#4a6080]">{e.name}</span>
                      <span className="font-semibold text-[#1a2744] ml-auto">{fmtNum(e.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <EmptyChart />}
          </SectionCard>

          {/* ── 4. Helpdesk ──────────────────────────────────────────────── */}
          <SectionCard id="s-helpdesk" title="Helpdesk แจ้งซ่อม" icon={<Wrench className="w-4 h-4" />}>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <KpiCard label="ทั้งหมด"       value={fmtNum(d.helpdesk.total)}        color="#1d6ae5" bg="#eff4ff" />
              <KpiCard label="เสร็จแล้ว"     value={fmtNum(d.helpdesk.completed)}    color="#0d9068" bg="#f0fdf4" />
              <KpiCard label="รอดำเนินการ"   value={fmtNum(d.helpdesk.pending)}      color="#f59e0b" bg="#fffbeb" />
              <KpiCard label="เฉลี่ย (วัน)"  value={`${d.helpdesk.avgDays} วัน`}    color="#7c3aed" bg="#f5f3ff" />
              <KpiCard label="ค่าซ่อมรวม"   value={fmtCurrency(d.helpdesk.totalCost)} color="#e11d48" bg="#fff1f2" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Trend line chart */}
              <div>
                <p className="text-xs font-semibold text-[#4a6080] mb-2">แนวโน้มรายเดือน</p>
                {d.helpdesk.trend.some(t => t.count > 0) ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={d.helpdesk.trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#4a6080' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#4a6080' }} allowDecimals={false} />
                      <Tooltip formatter={(v: number) => [v, 'รายการ']} />
                      <Line type="monotone" dataKey="count" stroke="#1d6ae5" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <EmptyChart />}
              </div>
              {/* By type */}
              <div>
                <p className="text-xs font-semibold text-[#4a6080] mb-2">ประเภทการซ่อม</p>
                {d.helpdesk.byType.length > 0 ? (
                  <div className="space-y-1.5">
                    {d.helpdesk.byType.slice(0, 6).map((t, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#f5f8ff' }}>
                        <span className="text-xs flex-1 truncate" style={{ color: '#1a2744' }}>{t.name}</span>
                        <span className="text-xs font-semibold flex-shrink-0" style={{ color: '#1d6ae5' }}>{t.count}</span>
                      </div>
                    ))}
                  </div>
                ) : <EmptyChart />}
              </div>
            </div>
          </SectionCard>

          {/* ── 5. Room Booking ──────────────────────────────────────────── */}
          <SectionCard id="s-room" title="จองห้องประชุม" icon={<DoorOpen className="w-4 h-4" />}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <KpiCard label="ทั้งหมด"         value={fmtNum(d.room.totalBookings)} color="#1d6ae5" bg="#eff4ff" />
              <KpiCard label="อนุมัติแล้ว"      value={fmtNum(d.room.approved)}      color="#0d9068" bg="#f0fdf4" />
              <KpiCard label="ชั่วโมงรวม"       value={`${fmtNum(d.room.totalHours)} ชม.`} color="#7c3aed" bg="#f5f3ff" />
            </div>
            {d.room.byRoom.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-[#4a6080] mb-2">ห้องที่ใช้มากที่สุด</p>
                <div className="space-y-1.5">
                  {d.room.byRoom.slice(0, 8).map((r, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ backgroundColor: '#f5f8ff' }}>
                      <span className="text-[11px] w-5 text-center font-bold flex-shrink-0" style={{ color: i === 0 ? '#0d9068' : '#94a3b8' }}>{i + 1}</span>
                      <span className="text-xs flex-1 truncate" style={{ color: '#1a2744' }}>{r.name}</span>
                      <span className="text-xs font-semibold flex-shrink-0" style={{ color: '#0d9068' }}>{r.count} ครั้ง</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <EmptyChart />}
          </SectionCard>

          {/* ── 6. Lost Found ────────────────────────────────────────────── */}
          <SectionCard id="s-lostfound" title="ของหาย" icon={<PackageSearch className="w-4 h-4" />}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="ทั้งหมด"           value={fmtNum(d.lostfound.total)}    color="#1d6ae5" bg="#eff4ff" />
              <KpiCard label="คืนเจ้าของแล้ว"   value={fmtNum(d.lostfound.claimed)}  color="#0d9068" bg="#f0fdf4" />
              <KpiCard label="ยังไม่คืน"          value={fmtNum(d.lostfound.unclaimed)} color="#f59e0b" bg="#fffbeb" />
              <KpiCard label="% คืนได้"           value={`${lfPct}%`}                  color="#7c3aed" bg="#f5f3ff"
                sub={`${d.lostfound.claimed} / ${d.lostfound.total} รายการ`} />
            </div>
            {d.lostfound.total > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#4a6080] mb-2">อัตราการคืนของ</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#4a6080' }}>
                    คืนได้ {d.lostfound.claimed} จาก {d.lostfound.total} รายการ
                  </span>
                  <span className="inline-block text-sm font-bold px-3 py-0.5 rounded-full"
                    style={{
                      backgroundColor: lfPct >= 80 ? '#e6f9f0' : lfPct >= 50 ? '#fffbeb' : '#fef2f2',
                      color: lfPct >= 80 ? '#0d9068' : lfPct >= 50 ? '#b45309' : '#dc2626',
                    }}>{lfPct}%</span>
                </div>
              </div>
            )}
          </SectionCard>

        </div>
      )}

      {/* Empty state */}
      {!loading && !d && (
        <div className="text-center py-20 text-[#94a3b8]">
          <p>ไม่สามารถโหลดข้อมูลได้</p>
        </div>
      )}
    </div>
  );
}
