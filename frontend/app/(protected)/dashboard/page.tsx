'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Monitor, Wrench, CalendarCheck2, ShieldCheck, DoorOpen,
  ClipboardList, AlertTriangle, PackageSearch,
  Calendar, Users, CalendarX,
} from 'lucide-react';
import { api, USER_KEY } from '@/lib/api';
import { loadQuickMenuConfig, getVisibleItems } from '@/lib/quickMenu';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Kpi {
  totalEquipment: number; openRepairs: number; pendingPM: number;
  criticalRepairs: number; todayDuty: number; todayBookings: number;
  todayWorkLogs: number; unclaimedLostFound: number;
  totalPersonnel: number; pendingLeaves: number;
  dutyLoggedSchedules: number;
}
interface RepairByStatus { pending: number; assigned: number; in_progress: number; waiting_parts: number; completed: number; cancelled: number }
interface DutyRow        { teacherName: string; location: string; shiftType: string; status: string }
interface BookingRow     { roomName: string; title: string; startTime: string; endTime: string; status: string }
interface Stat           { name: string; count: number }
interface Summary {
  kpi: Kpi;
  repairByStatus: RepairByStatus;
  equipmentByCategory: Stat[];
  todayDutyList: DutyRow[];
  todayBookingList: BookingRow[];
  personnelByType: Stat[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SHIFT_LABEL: Record<string, string> = { morning: 'เช้า', afternoon: 'บ่าย', evening: 'เย็น', holiday: 'วันหยุด' };
const SHIFT_COLOR: Record<string, string> = { morning: '#d97706', afternoon: '#ea580c', evening: '#7c3aed', holiday: '#2563eb' };

const REPAIR_PIE: Record<string, { name: string; color: string }> = {
  pending:       { name: 'รอดำเนินการ', color: '#f59e0b' },
  assigned:      { name: 'มอบหมายแล้ว', color: '#3b82f6' },
  in_progress:   { name: 'กำลังซ่อม',   color: '#8b5cf6' },
  waiting_parts: { name: 'รอชิ้นส่วน',  color: '#f97316' },
  completed:     { name: 'เสร็จแล้ว',   color: '#10b981' },
  cancelled:     { name: 'ยกเลิก',      color: '#94a3b8' },
};

const PERSONNEL_COLORS = ['#1d6ae5', '#0d9068', '#7c3aed', '#dc2626', '#b45309', '#64748b'];

const CHART_STYLE = { backgroundColor: '#fff', border: '1px solid #dce6f9', borderRadius: 8, color: '#1a2744', fontSize: 12 };

// ─── Helper ────────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  value: number; label: string; unit: string;
  Icon: React.ElementType; iconBg: string; iconColor: string;
  badge?: { text: string; color: string } | null;
  href?: string;
}
function KpiCard({ value, label, unit, Icon, iconBg, iconColor, badge, href }: KpiCardProps) {
  const inner = (
    <div className="bg-white rounded-xl p-4 flex flex-col gap-2 h-full" style={{ border: '1px solid #dce6f9' }}>
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconBg }}>
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
        {badge && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badge.color}`}>{badge.text}</span>}
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: '#1a2744' }}>{value.toLocaleString()}</p>
        <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>
          {label} <span style={{ color: '#94a3b8' }}>({unit})</span>
        </p>
      </div>
    </div>
  );
  return href
    ? <Link href={href} className="block h-full hover:scale-[1.02] transition-transform">{inner}</Link>
    : inner;
}

// ─── Quick Menu (mobile) ──────────────────────────────────────────────────────

function QuickMenu() {
  const [items, setItems] = useState(getVisibleItems(loadQuickMenuConfig(), null));
  useEffect(() => {
    api.get<any>('/auth/my-modules').then((r) => {
      setItems(getVisibleItems(loadQuickMenuConfig(), r.data?.modules ?? null));
    }).catch(() => {});
  }, []);
  if (items.length === 0) return null;
  return (
    <div className="md:hidden bg-white rounded-2xl p-4 shadow-sm" style={{ border: '1px solid #dce6f9' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-sm" style={{ color: '#1a2744' }}>เมนูด่วน</p>
        <Link href="/settings/quick-menu" className="text-xs font-medium" style={{ color: '#1d6ae5' }}>ตั้งค่า →</Link>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {items.slice(0, 8).map(({ href, label, Icon, color, bg }) => (
          <Link key={href} href={href}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl active:scale-95 transition-transform"
            style={{ backgroundColor: bg }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: bg }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <span className="text-[10px] font-medium text-center leading-tight" style={{ color: '#1a2744' }}>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Mobile Greeting ─────────────────────────────────────────────────────────

function MobileGreeting() {
  const [name, setName]   = useState('');
  const [role, setRole]   = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const todayTH = new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'สวัสดีตอนเช้า ☀️' : hour < 17 ? 'สวัสดีตอนบ่าย 🌤️' : 'สวัสดีตอนเย็น 🌙';
  const ROLE_LABEL: Record<string, string> = { admin: 'ผู้ดูแลระบบ', executive: 'ผู้บริหาร', teacher: 'ครู/อาจารย์', staff: 'เจ้าหน้าที่' };

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem(USER_KEY) || '{}');
      setName(u.name ?? ''); setRole(u.role ?? '');
      if (u.avatar) setAvatar(u.avatar);
    } catch { /* */ }
  }, []);

  return (
    <div className="md:hidden rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #0f1e3c 0%, #1d3a72 100%)' }}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {avatar
            ? <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white/20" />
            : <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">{name[0]}</div>
          }
          <div>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{greeting}</p>
            <p className="text-lg font-bold text-white mt-0.5">{name || 'ผู้ใช้งาน'}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{ROLE_LABEL[role] ?? role}</p>
          </div>
        </div>
        <div className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
          <Calendar className="w-3.5 h-3.5" />
          <span className="text-[10px]">{todayTH}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Desktop Header Banner ────────────────────────────────────────────────────

function DesktopHeader({ totalPersonnel, todayWorkLogs, pendingLeaves }: { totalPersonnel: number; todayWorkLogs: number; pendingLeaves: number }) {
  const [name, setName]     = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'สวัสดีตอนเช้า' : hour < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';
  const todayTH  = new Date().toLocaleDateString('th-TH', { dateStyle: 'full' });

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem(USER_KEY) || '{}');
      setName(u.name ?? '');
      if (u.avatar) setAvatar(u.avatar);
    } catch { /* */ }
  }, []);

  return (
    <div className="hidden md:flex items-center justify-between rounded-2xl px-6 py-4"
      style={{ background: 'linear-gradient(135deg, #0f1e3c 0%, #1d3a72 100%)' }}>
      <div className="flex items-center gap-4">
        {avatar
          ? <img src={avatar} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white/20" />
          : <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-bold">{name[0]}</div>
        }
        <div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{greeting}</p>
          <p className="text-white text-xl font-bold">{name || 'ผู้ใช้งาน'}</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{todayTH}</p>
        </div>
      </div>
      <div className="flex gap-8 text-right divide-x divide-white/10">
        <div className="pl-8">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>บุคลากรทั้งหมด</p>
          <p className="text-2xl font-bold text-white">{totalPersonnel.toLocaleString()}</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>คน</p>
        </div>
        <div className="pl-8">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>ใบลารออนุมัติ</p>
          <p className="text-2xl font-bold" style={{ color: pendingLeaves > 0 ? '#fbbf24' : 'white' }}>{pendingLeaves}</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>รายการ</p>
        </div>
        <div className="pl-8">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>บันทึกงานวันนี้</p>
          <p className="text-2xl font-bold text-white">{todayWorkLogs}</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>รายการ</p>
        </div>
      </div>
    </div>
  );
}

// ─── Personnel Pie Chart ──────────────────────────────────────────────────────

function PersonnelPieChart({ data, total, loading }: { data: Stat[]; total: number; loading: boolean }) {
  if (loading) return <Skeleton className="h-52 rounded-lg" />;
  if (data.length === 0) return (
    <div className="h-52 flex items-center justify-center text-sm" style={{ color: '#94a3b8' }}>
      ไม่มีข้อมูล
    </div>
  );

  const pieData = data.map((d, i) => ({
    ...d,
    color: PERSONNEL_COLORS[i % PERSONNEL_COLORS.length],
    pct: total > 0 ? Math.round((d.count / total) * 100) : 0,
  }));

  return (
    <div className="flex gap-4 items-center">
      {/* Donut */}
      <div className="flex-shrink-0 relative">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={44} outerRadius={65}
              paddingAngle={2} dataKey="count" startAngle={90} endAngle={-270}>
              {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Pie>
            <Tooltip contentStyle={CHART_STYLE}
              formatter={(v: number, n: string) => [`${v} คน`, n]} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xl font-bold" style={{ color: '#1a2744' }}>{total}</p>
          <p className="text-[10px]" style={{ color: '#94a3b8' }}>คนทั้งหมด</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 min-w-0 space-y-2">
        {pieData.map((e) => (
          <div key={e.name} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
            <span className="text-xs truncate flex-1" style={{ color: '#1a2744' }}>{e.name}</span>
            <span className="text-xs font-semibold flex-shrink-0" style={{ color: e.color }}>{e.count} คน</span>
            <span className="text-[10px] w-8 text-right flex-shrink-0" style={{ color: '#94a3b8' }}>{e.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Equipment Stat List (no bars) ────────────────────────────────────────────

function EquipmentStatList({ data, loading }: { data: Stat[]; loading: boolean }) {
  if (loading) return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}
    </div>
  );
  if (data.length === 0) return (
    <p className="text-sm text-center py-8" style={{ color: '#94a3b8' }}>ไม่มีข้อมูล</p>
  );
  const total = data.reduce((s, c) => s + c.count, 0);
  return (
    <div className="space-y-1.5">
      {data.map((cat, i) => {
        const pct = total > 0 ? Math.round((cat.count / total) * 100) : 0;
        const dot = ['#1d6ae5','#0d9068','#7c3aed','#dc2626','#b45309','#64748b'][i % 6];
        return (
          <div key={cat.name} className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
            style={{ backgroundColor: '#f5f8ff' }}>
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
            <span className="text-xs flex-1 truncate" style={{ color: '#1a2744' }}>{cat.name}</span>
            <span className="text-xs font-semibold flex-shrink-0" style={{ color: '#4a6080' }}>
              {cat.count.toLocaleString()}
            </span>
            <span className="text-[10px] w-8 text-right flex-shrink-0" style={{ color: '#94a3b8' }}>
              {pct}%
            </span>
          </div>
        );
      })}
      <p className="text-[11px] pt-1" style={{ color: '#94a3b8' }}>
        รวมทั้งหมด {total.toLocaleString()} รายการ
      </p>
    </div>
  );
}

// ─── Duty Progress Card ───────────────────────────────────────────────────────

function DutyProgressCard({ logged, total, loading }: { logged: number; total: number; loading: boolean }) {
  if (loading) return <Skeleton className="h-44 rounded-lg" />;
  if (total === 0) return (
    <div className="h-44 flex flex-col items-center justify-center gap-2">
      <ShieldCheck className="w-8 h-8 opacity-30" style={{ color: '#0d9068' }} />
      <p className="text-sm" style={{ color: '#94a3b8' }}>ไม่มีเวรวันนี้</p>
    </div>
  );

  const pct = Math.round((logged / total) * 100);
  const remaining = total - logged;
  const pctColor = pct === 100 ? '#0d9068' : pct >= 50 ? '#b45309' : '#94a3b8';
  const pctBg    = pct === 100 ? '#e6f9f0' : pct >= 50 ? '#fffbeb' : '#f5f8ff';

  return (
    <div className="flex flex-col gap-3">
      <div className="text-center rounded-xl py-4" style={{ backgroundColor: pctBg }}>
        <p className="text-4xl font-bold" style={{ color: pctColor }}>{pct}%</p>
        <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>บันทึกแล้ว</p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#0d9068' }} />
          <span className="text-xs flex-1" style={{ color: '#1a2744' }}>บันทึกแล้ว</span>
          <span className="text-sm font-bold flex-shrink-0" style={{ color: '#0d9068' }}>{logged}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#dce6f9' }} />
          <span className="text-xs flex-1" style={{ color: '#1a2744' }}>ยังไม่บันทึก</span>
          <span className="text-sm font-bold flex-shrink-0" style={{ color: '#94a3b8' }}>{remaining}</span>
        </div>
      </div>
      <p className="text-[11px]" style={{ color: '#94a3b8' }}>รวม {total} เวรวันนี้</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData]             = useState<Summary | null>(null);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    api.get<{ success: boolean; data: Summary }>('/dashboard/summary')
      .then((res) => setData(res.data))
      .catch((e) => setFetchError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const kpi = data?.kpi;
  const totalPersonnel      = kpi?.totalPersonnel      ?? 0;
  const pendingLeaves       = kpi?.pendingLeaves       ?? 0;
  const todayDuty           = kpi?.todayDuty           ?? 0;
  const dutyLoggedSchedules = kpi?.dutyLoggedSchedules ?? 0;

  const repairPieData = data
    ? Object.entries(data.repairByStatus)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: REPAIR_PIE[k]?.name ?? k, value: v, color: REPAIR_PIE[k]?.color ?? '#94a3b8' }))
    : [];

  return (
    <div className="space-y-4 max-w-[1600px]">

      {/* Mobile Greeting */}
      <MobileGreeting />

      {/* Quick Menu — mobile only */}
      <QuickMenu />

      {/* Desktop Header */}
      <DesktopHeader
        totalPersonnel={loading ? 0 : totalPersonnel}
        pendingLeaves={loading ? 0 : pendingLeaves}
        todayWorkLogs={loading ? 0 : (kpi?.todayWorkLogs ?? 0)}
      />

      {fetchError && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {fetchError}
        </div>
      )}

      {/* ── Row 1: KPI Cards (8 cards) ── */}
      <div>
        <p className="hidden md:block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>
          ภาพรวมระบบ
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
            : <>
              <KpiCard value={kpi?.totalEquipment ?? 0}     label="ครุภัณฑ์ทั้งหมด"  unit="รายการ" Icon={Monitor}        iconBg="#e8f0fe" iconColor="#1d6ae5" href="/equipment" />
              <KpiCard value={kpi?.openRepairs ?? 0}         label="แจ้งซ่อมค้างอยู่" unit="รายการ" Icon={Wrench}         iconBg="#fef2f2" iconColor="#dc2626" href="/helpdesk"
                badge={(kpi?.criticalRepairs ?? 0) > 0 ? { text: `${kpi!.criticalRepairs} วิกฤต`, color: 'bg-red-500 text-white' } : null} />
              <KpiCard value={kpi?.pendingPM ?? 0}           label="PM รอดำเนินการ"   unit="รายการ" Icon={CalendarCheck2}  iconBg="#f0fdf4" iconColor="#16a34a" href="/helpdesk/pm" />
              <KpiCard value={kpi?.todayDuty ?? 0}           label="เวรวันนี้"         unit="รายการ" Icon={ShieldCheck}    iconBg="#e6f9f0" iconColor="#0d9068" href="/duty" />
              <KpiCard value={kpi?.todayBookings ?? 0}       label="จองห้องวันนี้"    unit="รายการ" Icon={DoorOpen}       iconBg="#fffbeb" iconColor="#b45309" href="/room" />
              <KpiCard value={kpi?.unclaimedLostFound ?? 0}  label="ของหายรอเจ้าของ" unit="รายการ" Icon={PackageSearch}  iconBg="#f3e8ff" iconColor="#7c3aed" href="/lost-found" />
              <KpiCard value={totalPersonnel}                label="บุคลากรทั้งหมด"   unit="คน"     Icon={Users}          iconBg="#e0f2fe" iconColor="#0369a1" href="/personnel" />
              <KpiCard value={pendingLeaves}                 label="ใบลารออนุมัติ"    unit="รายการ" Icon={CalendarX}      iconBg="#fdf4ff" iconColor="#7e22ce" href="/leave"
                badge={pendingLeaves > 0 ? { text: `${pendingLeaves} รอ`, color: 'bg-purple-500 text-white' } : null} />
            </>
          }
        </div>
      </div>

      {/* ── Row 2: Charts (3 cards desktop) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Duty Progress */}
        <div className="card">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#1a2744' }}>
            <ShieldCheck className="w-4 h-4" style={{ color: '#0d9068' }} /> เวรรับนักเรียนวันนี้
          </h2>
          <DutyProgressCard
            logged={dutyLoggedSchedules}
            total={todayDuty}
            loading={loading}
          />
        </div>

        {/* Repair Status Donut */}
        <div className="card">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#1a2744' }}>
            <Wrench className="w-4 h-4" style={{ color: '#1d6ae5' }} /> สถานะแจ้งซ่อม
          </h2>
          {loading ? <Skeleton className="h-44 rounded-lg" /> :
           repairPieData.length === 0
            ? <div className="h-44 flex items-center justify-center text-sm" style={{ color: '#94a3b8' }}>ไม่มีข้อมูล</div>
            : (
              <div className="flex gap-3 items-center">
                <div className="flex-shrink-0">
                  <ResponsiveContainer width={120} height={120}>
                    <PieChart>
                      <Pie data={repairPieData} cx="50%" cy="50%" innerRadius={36} outerRadius={56}
                        paddingAngle={2} dataKey="value">
                        {repairPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={CHART_STYLE} formatter={(v: number) => [`${v} รายการ`]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5 min-w-0">
                  {repairPieData.map((e) => (
                    <div key={e.name} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
                      <span className="text-[11px] flex-1 truncate" style={{ color: '#4a6080' }}>{e.name}</span>
                      <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: '#1a2744' }}>{e.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
        </div>

        {/* Personnel by Type Pie */}
        <div className="card">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#1a2744' }}>
            <Users className="w-4 h-4" style={{ color: '#0369a1' }} /> ประเภทบุคลากร
          </h2>
          <PersonnelPieChart
            data={data?.personnelByType ?? []}
            total={totalPersonnel}
            loading={loading}
          />
        </div>

      </div>

      {/* ── Row 3: Tables + Equipment ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Today Duty */}
        <div className="card">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#1a2744' }}>
            <ShieldCheck className="w-4 h-4" style={{ color: '#0d9068' }} /> ตารางเวรวันนี้
          </h2>
          {loading
            ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
            : (data?.todayDutyList?.length ?? 0) === 0
              ? <p className="text-sm text-center py-8" style={{ color: '#94a3b8' }}>ไม่มีเวรวันนี้</p>
              : (
                <div className="space-y-2">
                  {data!.todayDutyList.map((d, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg"
                      style={{ backgroundColor: '#f5f8ff', border: '1px solid #f0f4ff' }}>
                      <div className="min-w-0">
                        <p className="text-sm truncate" style={{ color: '#1a2744' }}>{d.teacherName}</p>
                        <p className="text-xs truncate" style={{ color: '#4a6080' }}>{d.location}</p>
                      </div>
                      <span className="text-xs font-semibold flex-shrink-0 ml-2"
                        style={{ color: SHIFT_COLOR[d.shiftType] ?? '#64748b' }}>
                        {SHIFT_LABEL[d.shiftType] ?? d.shiftType}
                      </span>
                    </div>
                  ))}
                </div>
              )
          }
        </div>

        {/* Today Bookings */}
        <div className="card">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#1a2744' }}>
            <DoorOpen className="w-4 h-4" style={{ color: '#b45309' }} /> การจองห้องวันนี้
          </h2>
          {loading
            ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
            : (data?.todayBookingList?.length ?? 0) === 0
              ? <p className="text-sm text-center py-8" style={{ color: '#94a3b8' }}>ไม่มีการจองวันนี้</p>
              : (
                <div className="space-y-2">
                  {data!.todayBookingList.map((b, i) => (
                    <div key={i} className="px-3 py-2 rounded-lg"
                      style={{ backgroundColor: '#f5f8ff', border: '1px solid #f0f4ff' }}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate" style={{ color: '#1a2744' }}>{b.roomName}</p>
                        <span className="badge-approved text-[10px] flex-shrink-0">อนุมัติ</span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>
                        {new Date(b.startTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                        {' – '}
                        {new Date(b.endTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                        {' · '}{b.title}
                      </p>
                    </div>
                  ))}
                </div>
              )
          }
        </div>

        {/* Equipment by Category — no score bars */}
        <div className="card">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#1a2744' }}>
            <Monitor className="w-4 h-4" style={{ color: '#1d6ae5' }} /> ครุภัณฑ์ตามหมวดหมู่
          </h2>
          <EquipmentStatList data={data?.equipmentByCategory ?? []} loading={loading} />
        </div>
      </div>

      {/* Mobile: WorkLog note */}
      <div className="md:hidden flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{ backgroundColor: '#ffffff', border: '1px solid #dce6f9' }}>
        <ClipboardList className="w-4 h-4 flex-shrink-0" style={{ color: '#4a6080' }} />
        <span className="text-sm" style={{ color: '#1a2744' }}>
          บันทึกปฏิบัติงานวันนี้:&nbsp;
          <span className="font-bold" style={{ color: '#1d6ae5' }}>{kpi?.todayWorkLogs ?? 0}</span> รายการ
        </span>
      </div>

    </div>
  );
}
