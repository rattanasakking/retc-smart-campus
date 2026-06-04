'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Monitor, Wrench, CalendarCheck2, ShieldCheck, DoorOpen,
  ClipboardList, AlertTriangle, Bell, PackageSearch,
  Car, HeadphonesIcon, Package, ArrowLeftRight, Calendar,
} from 'lucide-react';
import { api, USER_KEY } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Kpi {
  totalEquipment:     number;
  openRepairs:        number;
  pendingPM:          number;
  criticalRepairs:    number;
  todayDuty:          number;
  todayBookings:      number;
  todayWorkLogs:      number;
  unclaimedLostFound: number;
}

interface TrendItem { month: string; count: number }

interface RepairByStatus {
  pending:       number;
  assigned:      number;
  in_progress:   number;
  waiting_parts: number;
  completed:     number;
  cancelled:     number;
}

interface Alert {
  type:     string;
  title:    string;
  subtitle: string;
  urgency:  string;
  time:     string;
  reporter: string;
}

interface DutyRow {
  teacherName: string;
  location:    string;
  shiftType:   string;
  status:      string;
}

interface BookingRow {
  roomName:  string;
  title:     string;
  startTime: string;
  endTime:   string;
  status:    string;
}

interface CategoryStat { name: string; count: number }

interface Summary {
  kpi:                 Kpi;
  recentAlerts:        Alert[];
  repairTrend:         TrendItem[];
  repairByStatus:      RepairByStatus;
  equipmentByCategory: CategoryStat[];
  todayDutyList:       DutyRow[];
  todayBookingList:    BookingRow[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SHIFT_LABEL: Record<string, string> = {
  morning: 'เช้า', afternoon: 'บ่าย', evening: 'เย็น', holiday: 'วันหยุด',
};
const SHIFT_COLOR: Record<string, string> = {
  morning: 'text-yellow-600', afternoon: 'text-orange-500', evening: 'text-purple-600', holiday: 'text-blue-600',
};

const PIE_META: Record<string, { name: string; color: string }> = {
  pending:       { name: 'รอดำเนินการ', color: '#f59e0b' },
  assigned:      { name: 'มอบหมายแล้ว', color: '#3b82f6' },
  in_progress:   { name: 'กำลังซ่อม',   color: '#8b5cf6' },
  waiting_parts: { name: 'รอชิ้นส่วน',  color: '#f97316' },
  completed:     { name: 'เสร็จแล้ว',   color: '#10b981' },
  cancelled:     { name: 'ยกเลิก',      color: '#94a3b8' },
};

const CHART_STYLE = {
  backgroundColor: '#ffffff',
  border: '1px solid #dce6f9',
  borderRadius: 8,
  color: '#1a2744',
  fontSize: 12,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

interface KpiCardProps {
  value:     number;
  label:     string;
  unit:      string;
  Icon:      React.ElementType;
  iconBg:    string;
  iconColor: string;
  badge?:    { text: string; color: string } | null;
}

function KpiCard({ value, label, unit, Icon, iconBg, iconColor, badge }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl p-4 flex flex-col gap-2" style={{ border: '1px solid #dce6f9' }}>
      <div className="flex items-start justify-between">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
        {badge && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badge.color}`}>
            {badge.text}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: '#1a2744' }}>{value.toLocaleString()}</p>
        <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>
          {label} <span style={{ color: '#94a3b8' }}>({unit})</span>
        </p>
      </div>
    </div>
  );
}

// ─── Quick Menu (mobile) ──────────────────────────────────────────────────────

const QUICK_ITEMS = [
  { href: '/equipment',       label: 'ครุภัณฑ์',        Icon: Monitor,          color: '#1d6ae5', bg: '#eff4ff' },
  { href: '/helpdesk/new',    label: 'แจ้งซ่อม',        Icon: Wrench,           color: '#dc2626', bg: '#fef2f2' },
  { href: '/helpdesk/pm',     label: 'PM บำรุงรักษา',  Icon: CalendarCheck2,   color: '#7c3aed', bg: '#f3e8ff' },
  { href: '/equipment/borrows', label: 'ยืม-คืน',       Icon: ArrowLeftRight,   color: '#0d9068', bg: '#e6f9f0' },
  { href: '/room',            label: 'จองห้องประชุม',   Icon: DoorOpen,         color: '#b45309', bg: '#fffbeb' },
  { href: '/duty',            label: 'เวรรับนักเรียน',  Icon: CalendarCheck2,   color: '#1d6ae5', bg: '#eff4ff' },
  { href: '/lost-found',      label: 'ของหาย',          Icon: PackageSearch,    color: '#16a34a', bg: '#f0fdf4' },
  { href: '/helpdesk',        label: 'Helpdesk',         Icon: HeadphonesIcon,   color: '#4a6080', bg: '#f5f8ff' },
] as const;

function QuickMenu() {
  return (
    <div className="md:hidden bg-white rounded-2xl p-4 shadow-sm" style={{ border: '1px solid #dce6f9' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-sm" style={{ color: '#1a2744' }}>เมนูด่วน</p>
        <Link href="/dashboard" className="text-xs font-medium" style={{ color: '#1d6ae5' }}>ดูทั้งหมด →</Link>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {QUICK_ITEMS.map(({ href, label, Icon, color, bg }) => (
          <Link key={href} href={href}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-colors active:scale-95"
            style={{ backgroundColor: bg }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ backgroundColor: bg }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <span className="text-[10px] font-medium text-center leading-tight" style={{ color: '#1a2744' }}>
              {label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Mobile Greeting ─────────────────────────────────────────────────────────

function MobileGreeting() {
  const [userName, setUserName]   = useState('');
  const [userRole, setUserRole]   = useState('');
  const [logoUrl, setLogoUrl]     = useState<string | null>(null);
  const todayTH = new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem(USER_KEY) || '{}');
      setUserName(u.name ?? '');
      setUserRole(u.role ?? '');
      if (u.avatar) setLogoUrl(u.avatar);
    } catch { /* */ }
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'สวัสดีตอนเช้า ☀️' : hour < 17 ? 'สวัสดีตอนบ่าย 🌤️' : 'สวัสดีตอนเย็น 🌙';
  const ROLE_LABEL: Record<string, string> = { admin: 'ผู้ดูแลระบบ', executive: 'ผู้บริหาร', teacher: 'ครู/อาจารย์', staff: 'เจ้าหน้าที่' };

  return (
    <div className="md:hidden rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #0f1e3c 0%, #1d3a72 100%)' }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{greeting}</p>
          <p className="text-lg font-bold text-white mt-0.5">{userName || 'ผู้ใช้งาน'}</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {ROLE_LABEL[userRole] ?? userRole}
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
          <Calendar className="w-3.5 h-3.5" />
          <span>{todayTH}</span>
        </div>
      </div>
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
      .catch((e)  => setFetchError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const kpi = data?.kpi;

  const repairPieData = data
    ? Object.entries(data.repairByStatus)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({
          name:  PIE_META[k]?.name  ?? k,
          value: v,
          color: PIE_META[k]?.color ?? '#94a3b8',
        }))
    : [];

  const todayTH = new Date().toLocaleDateString('th-TH', { dateStyle: 'full' });

  return (
    <div className="space-y-5 max-w-[1600px]">

      {/* ── Mobile Greeting ── */}
      <MobileGreeting />

      {/* ── Quick Menu (mobile) ── */}
      <QuickMenu />

      {/* ── Header (desktop) ── */}
      <div className="hidden md:block">
        <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>ภาพรวมระบบ</h1>
        <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>{todayTH}</p>
      </div>

      {fetchError && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {fetchError}
        </div>
      )}

      {/* ── Row 1: KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : <>
              <KpiCard
                value={kpi?.totalEquipment ?? 0}
                label="ครุภัณฑ์ทั้งหมด" unit="รายการ"
                Icon={Monitor} iconBg="#e8f0fe" iconColor="#1d6ae5"
              />
              <KpiCard
                value={kpi?.openRepairs ?? 0}
                label="แจ้งซ่อมค้างอยู่" unit="รายการ"
                Icon={Wrench} iconBg="#fef2f2" iconColor="#dc2626"
                badge={
                  (kpi?.criticalRepairs ?? 0) > 0
                    ? { text: `${kpi!.criticalRepairs} วิกฤต`, color: 'bg-red-500 text-white' }
                    : null
                }
              />
              <KpiCard
                value={kpi?.pendingPM ?? 0}
                label="PM รอดำเนินการ" unit="รายการ"
                Icon={CalendarCheck2} iconBg="#f0fdf4" iconColor="#16a34a"
              />
              <KpiCard
                value={kpi?.todayDuty ?? 0}
                label="เวรวันนี้" unit="รายการ"
                Icon={ShieldCheck} iconBg="#e6f9f0" iconColor="#0d9068"
              />
              <KpiCard
                value={kpi?.todayBookings ?? 0}
                label="จองห้องวันนี้" unit="รายการ"
                Icon={DoorOpen} iconBg="#fffbeb" iconColor="#b45309"
              />
              <KpiCard
                value={kpi?.unclaimedLostFound ?? 0}
                label="ของได้รอเจ้าของ" unit="รายการ"
                Icon={PackageSearch} iconBg="#f3e8ff" iconColor="#7c3aed"
              />
            </>
        }
      </div>

      {/* ── Row 2: Charts + Alerts ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Bar Chart */}
        <div className="card">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#1a2744' }}>
            <Wrench className="w-4 h-4" style={{ color: '#dc2626' }} /> แนวโน้มแจ้งซ่อม 6 เดือน
          </h2>
          {loading ? (
            <Skeleton className="h-48 rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={192}>
              <BarChart data={data?.repairTrend ?? []} barSize={20}>
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={CHART_STYLE} cursor={{ fill: '#e8f0fe' }} />
                <Bar dataKey="count" name="รายการ" fill="#2979ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Donut Chart */}
        <div className="card">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#1a2744' }}>
            <Monitor className="w-4 h-4" style={{ color: '#1d6ae5' }} /> สถานะแจ้งซ่อม
          </h2>
          {loading ? (
            <Skeleton className="h-48 rounded-lg" />
          ) : repairPieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm" style={{ color: '#94a3b8' }}>
              ไม่มีข้อมูล
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={192}>
              <PieChart>
                <Pie
                  data={repairPieData} cx="45%" cy="50%"
                  innerRadius={52} outerRadius={72} paddingAngle={3} dataKey="value"
                >
                  {repairPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={CHART_STYLE} />
                <Legend
                  iconType="circle" iconSize={8}
                  formatter={(v) => <span className="text-xs" style={{ color: '#4a6080' }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Alerts */}
        <div className="card">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#1a2744' }}>
            <Bell className="w-4 h-4 text-red-500" /> แจ้งเตือนล่าสุด
          </h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : (data?.recentAlerts?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <ShieldCheck className="w-8 h-8 text-green-500 opacity-60" />
              <p className="text-sm" style={{ color: '#94a3b8' }}>ไม่มีการแจ้งเตือน</p>
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-52">
              {data!.recentAlerts.map((a, i) => (
                <div
                  key={i}
                  className="flex gap-3 p-3 rounded-lg"
                  style={{
                    backgroundColor: '#f5f8ff',
                    borderLeft: `3px solid ${a.urgency === 'critical' ? '#dc2626' : a.urgency === 'urgent' ? '#f97316' : '#dce6f9'}`,
                  }}
                >
                  {a.type === 'repair' ? (
                    <Wrench className={`w-4 h-4 mt-0.5 flex-shrink-0 ${a.urgency === 'critical' ? 'text-red-500' : 'text-orange-400'}`} />
                  ) : (
                    <PackageSearch className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#7c3aed' }} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: '#1a2744' }}>{a.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>{a.subtitle}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{a.reporter}</p>
                  </div>
                  {a.urgency !== 'normal' && (
                    <span className={`flex-shrink-0 self-start text-[10px] font-bold px-1.5 py-0.5 rounded-full ${a.urgency === 'critical' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>
                      {a.urgency === 'critical' ? 'วิกฤต' : 'เร่งด่วน'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Tables + Progress ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Today Duty List */}
        <div className="card">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#1a2744' }}>
            <ShieldCheck className="w-4 h-4" style={{ color: '#0d9068' }} /> ตารางเวรวันนี้
          </h2>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
          ) : (data?.todayDutyList?.length ?? 0) === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: '#94a3b8' }}>ไม่มีเวรวันนี้</p>
          ) : (
            <div className="space-y-2">
              {data!.todayDutyList.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2 rounded-lg"
                  style={{ backgroundColor: '#f5f8ff', border: '1px solid #f0f4ff' }}
                >
                  <div className="min-w-0">
                    <p className="text-sm truncate" style={{ color: '#1a2744' }}>{d.teacherName}</p>
                    <p className="text-xs truncate" style={{ color: '#4a6080' }}>{d.location}</p>
                  </div>
                  <span className={`text-xs font-semibold flex-shrink-0 ml-2 ${SHIFT_COLOR[d.shiftType] ?? 'text-gray-500'}`}>
                    {SHIFT_LABEL[d.shiftType] ?? d.shiftType}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today Booking List */}
        <div className="card">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#1a2744' }}>
            <DoorOpen className="w-4 h-4" style={{ color: '#b45309' }} /> การจองห้องวันนี้
          </h2>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
          ) : (data?.todayBookingList?.length ?? 0) === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: '#94a3b8' }}>ไม่มีการจองวันนี้</p>
          ) : (
            <div className="space-y-2">
              {data!.todayBookingList.map((b, i) => (
                <div
                  key={i}
                  className="px-3 py-2 rounded-lg"
                  style={{ backgroundColor: '#f5f8ff', border: '1px solid #f0f4ff' }}
                >
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
          )}
        </div>

        {/* Equipment by Category */}
        <div className="card">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#1a2744' }}>
            <Monitor className="w-4 h-4" style={{ color: '#1d6ae5' }} /> ครุภัณฑ์ตามหมวดหมู่
          </h2>
          {loading ? (
            <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}</div>
          ) : (data?.equipmentByCategory?.length ?? 0) === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: '#94a3b8' }}>ไม่มีข้อมูล</p>
          ) : (() => {
            const maxCount = Math.max(...data!.equipmentByCategory.map((c) => c.count), 1);
            return (
              <div className="space-y-3">
                {data!.equipmentByCategory.map((cat) => {
                  const pct = Math.round((cat.count / maxCount) * 100);
                  return (
                    <div key={cat.name}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs truncate max-w-[65%]" style={{ color: '#1a2744' }}>{cat.name}</span>
                        <span className="text-xs flex-shrink-0" style={{ color: '#4a6080' }}>{cat.count} รายการ</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#e8f0fe' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: '#2979ff' }}
                        />
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs pt-1" style={{ color: '#94a3b8' }}>* แสดงเปรียบเทียบจากหมวดหมู่ที่มีมากสุด</p>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Row 4: WorkLog KPI ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{ backgroundColor: '#ffffff', border: '1px solid #dce6f9' }}
      >
        <ClipboardList className="w-4 h-4 flex-shrink-0" style={{ color: '#4a6080' }} />
        <span className="text-sm" style={{ color: '#1a2744' }}>
          บันทึกปฏิบัติงานวันนี้:&nbsp;
          <span className="font-bold" style={{ color: '#1d6ae5' }}>{kpi?.todayWorkLogs ?? 0}</span> รายการ
        </span>
      </div>

    </div>
  );
}
