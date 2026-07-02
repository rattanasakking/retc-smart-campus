'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, ChevronLeft, ChevronRight, Loader2, Check, AlertTriangle,
  Calendar, List, Clock, Users, X, Settings, Trash2,
} from 'lucide-react';
import { api, USER_KEY } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Room { id: number; name: string; capacity: number; facilities?: string; image?: string; requireApproval: boolean; status: string }
interface Booking {
  id: number; title: string; startTime: string; endTime: string; status: string;
  attendees?: number; purpose?: string;
  room: { id: number; name: string; capacity: number; requireApproval: boolean };
  user: { id: number; name: string; department?: string };
  approvals: { approver: { name: string }; status: string; note?: string }[];
}
interface CalBooking {
  id: number; title: string; startTime: string; endTime: string; status: string;
  roomId: number; userId: number;
  user: { id: number; name: string };
  room: { id: number; name: string };
}
interface ReportData {
  period: { year: number; month: number };
  rooms: { id: number; name: string; capacity: number; bookings: number; hours: number; utilization: number }[];
  total: { bookings: number; hours: number };
  statusBreakdown?: { approved: number; pending: number; rejected: number; cancelled: number; completed: number };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; bg: string; text: string }> = {
  pending:   { label: '⏳ รออนุมัติ', bg: '#fffbeb', text: '#b45309' },
  approved:  { label: '✅ อนุมัติ',   bg: '#e6f9f0', text: '#0d9068' },
  rejected:  { label: '❌ ปฏิเสธ',   bg: '#fef2f2', text: '#dc2626' },
  cancelled: { label: '🚫 ยกเลิก',   bg: '#f1f5f9', text: '#64748b' },
  completed: { label: '🏁 เสร็จสิ้น', bg: '#eff6ff', text: '#1d6ae5' },
};
const CAL_STATUS_BG: Record<string, string> = {
  pending:  '#fef9c3', approved:  '#d1fae5', rejected: '#fee2e2',
  cancelled:'#f1f5f9', completed: '#dbeafe',
};
const CAL_STATUS_BORDER: Record<string, string> = {
  pending:  '#f59e0b', approved: '#10b981', rejected: '#ef4444',
  cancelled:'#94a3b8', completed:'#3b82f6',
};

const THAI_DAYS  = ['จ.','อ.','พ.','พฤ.','ศ.','ส.','อา.'];
const MONTHS_TH  = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const MONTHS_SH  = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

const fmtTime    = (d: string) => { const dt = new Date(d); return `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`; };
const fmtDate    = (d: string | Date) => { const dt = new Date(d); return `${dt.getDate()} ${MONTHS_SH[dt.getMonth()]} ${dt.getFullYear()+543}`; };
const isoDate    = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

function getWeekStart(d: Date): Date {
  const dt = new Date(d); const day = dt.getDay();
  dt.setDate(dt.getDate() + (day === 0 ? -6 : 1 - day));
  dt.setHours(0,0,0,0); return dt;
}
function getWeekDates(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate()+i); return d; });
}

// ─── Booking detail popup ─────────────────────────────────────────────────────

function BookingPopup({ booking, isAdmin, userId, onClose, onRefresh }: {
  booking: Booking; isAdmin: boolean; userId: number; onClose: () => void; onRefresh: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [rejNote, setRejNote] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [showRej, setShowRej] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const sm = STATUS[booking.status] ?? STATUS.pending;
  const canCancel = (booking.user.id === userId) && ['pending','approved'].includes(booking.status) && new Date(booking.startTime) > new Date();

  const handleCancel = async () => {
    if (!confirm('ยืนยันการยกเลิก?')) return;
    setCancelling(true);
    try { await api.put(`/room/bookings/${booking.id}/cancel`, {}); onRefresh(); onClose(); }
    catch { setCancelling(false); }
  };
  const handleApprove = async () => {
    try { await api.put(`/room/bookings/${booking.id}/approve`, {}); onRefresh(); onClose(); }
    catch { /* ignore */ }
  };
  const handleReject = async () => {
    setRejecting(true);
    try { await api.put(`/room/bookings/${booking.id}/reject`, { note: rejNote }); onRefresh(); onClose(); }
    catch { setRejecting(false); }
  };
  const handleDelete = async () => {
    if (!confirm('ลบการจองนี้ออกจากระบบ? ไม่สามารถย้อนกลับได้')) return;
    setDeleting(true);
    try { await api.delete(`/room/bookings/${booking.id}`); onRefresh(); onClose(); }
    catch { setDeleting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl shadow-xl z-10 bg-white" style={{ border: '1px solid #dce6f9' }}>
        <div className="flex items-start justify-between px-5 py-4" style={{ borderBottom: '1px solid #dce6f9' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: sm.bg, color: sm.text }}>{sm.label}</span>
            </div>
            <h3 className="font-semibold" style={{ color: '#1a2744' }}>{booking.title}</h3>
          </div>
          <button onClick={onClose}><X className="w-4 h-4" style={{ color: '#94a3b8' }} /></button>
        </div>
        <div className="px-5 py-4 space-y-3 text-sm">
          {[
            ['🏢 ห้อง', booking.room.name],
            ['📅 วันที่', fmtDate(booking.startTime)],
            ['⏰ เวลา', `${fmtTime(booking.startTime)} - ${fmtTime(booking.endTime)} น.`],
            ['👤 ผู้จอง', `${booking.user.name}${booking.user.department ? ` (${booking.user.department})` : ''}`],
            booking.attendees ? ['👥 จำนวน', `${booking.attendees} คน`] : null,
            booking.purpose   ? ['📝 วัตถุประสงค์', booking.purpose] : null,
          ].filter((item): item is string[] => item !== null).map(([label, val]) => (
            <div key={label as string} className="flex gap-3">
              <span className="w-36 flex-shrink-0" style={{ color: '#94a3b8' }}>{label as string}</span>
              <span style={{ color: '#1a2744' }}>{val as string}</span>
            </div>
          ))}
        </div>
        {/* Actions */}
        <div className="px-5 py-4 flex flex-wrap gap-2" style={{ borderTop: '1px solid #dce6f9' }}>
          {isAdmin && booking.status === 'pending' && !showRej && (
            <>
              <button onClick={handleApprove} className="btn-primary text-sm flex items-center gap-1.5"><Check className="w-3.5 h-3.5" />อนุมัติ</button>
              <button onClick={() => setShowRej(true)} className="text-sm px-3 py-1.5 rounded-xl" style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>ปฏิเสธ</button>
            </>
          )}
          {showRej && (
            <div className="w-full space-y-2">
              <input className="input-field" value={rejNote} onChange={(e) => setRejNote(e.target.value)} placeholder="เหตุผลการปฏิเสธ..." />
              <div className="flex gap-2">
                <button onClick={() => setShowRej(false)} className="btn-secondary text-sm">ยกเลิก</button>
                <button onClick={handleReject} disabled={rejecting} className="text-sm px-3 py-1.5 rounded-xl flex items-center gap-1.5" style={{ backgroundColor: '#dc2626', color: '#fff' }}>
                  {rejecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} ยืนยันปฏิเสธ
                </button>
              </div>
            </div>
          )}
          {canCancel && (
            <button onClick={handleCancel} disabled={cancelling} className="btn-secondary text-sm flex items-center gap-1.5">
              {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} ยกเลิกการจอง
            </button>
          )}
          {isAdmin && ['rejected', 'cancelled'].includes(booking.status) && (
            <button onClick={handleDelete} disabled={deleting}
              className="text-sm px-3 py-1.5 rounded-xl flex items-center gap-1.5 ml-auto"
              style={{ backgroundColor: '#fff0f0', color: '#dc2626', border: '1px solid #fecaca' }}>
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} ลบ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RoomPage() {
  const router   = useRouter();
  const [rooms, setRooms]           = useState<Room[]>([]);
  const [calData, setCalData]       = useState<CalBooking[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [pending, setPending]       = useState<Booking[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [weekStart, setWeekStart]   = useState<Date>(() => getWeekStart(new Date()));
  const [activeTab, setActiveTab]   = useState<'calendar'|'mine'|'pending'|'report'>('calendar');
  const [calView, setCalView]       = useState<'status'|'week'|'list'>('status');
  const [statusData, setStatusData] = useState<(Room & { isBusy: boolean; upcomingBookings: { id: number; title: string; startTime: string; endTime: string; status: string }[] })[]>([]);
  const [roomFilter, setRoomFilter] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isAdmin, setAdmin]         = useState(false);
  const [userId, setUserId]         = useState(0);
  const [toast, setToast]           = useState('');
  const [toastErr, setToastErr]     = useState('');
  const [reportMonth, setReportMonth] = useState(String(new Date().getMonth()+1));
  const [reportYear,  setReportYear]  = useState(String(new Date().getFullYear()+543));

  const showToast = (msg: string, err = false) => {
    if (err) { setToastErr(msg); setToast(''); } else { setToast(msg); setToastErr(''); }
    setTimeout(() => { setToast(''); setToastErr(''); }, 3000);
  };

  useEffect(() => {
    // Read userId immediately from localStorage for quick render
    const raw = localStorage.getItem(USER_KEY);
    if (raw) { try { const u = JSON.parse(raw); setUserId(u.id); } catch { /* */ } }
    // Fetch fresh user data to get up-to-date modulePermissions
    api.get<{ data: { id: number; isSuperAdmin: boolean; role: string; modulePermissions?: string[] } }>('/auth/me')
      .then((res) => {
        const u = res.data;
        const admin = !!u.isSuperAdmin || u.role === 'admin' || u.role === 'executive'
          || (u.modulePermissions ?? []).includes('ROOM_BOOKING');
        setAdmin(admin);
        setUserId(u.id);
        // Update localStorage so next render is correct
        if (raw) { try { localStorage.setItem(USER_KEY, JSON.stringify({ ...JSON.parse(raw), modulePermissions: u.modulePermissions ?? [] })); } catch { /* */ } }
      })
      .catch(() => {
        // Fallback: read from localStorage
        if (raw) { try { const u = JSON.parse(raw); setAdmin(!!u.isSuperAdmin || u.role === 'admin' || u.role === 'executive'); } catch { /* */ } }
      });
  }, []);

  // Load rooms
  useEffect(() => {
    api.get<{ data: Room[] }>('/room/rooms').then((r) => setRooms(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  // Load room status cards
  const loadStatus = useCallback(async () => {
    try {
      const res = await api.get<{ data: typeof statusData }>('/room/status');
      setStatusData(Array.isArray(res.data) ? res.data : []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (calView === 'status') loadStatus(); }, [calView, loadStatus]);

  // Load calendar data
  const loadCal = useCallback(async () => {
    const dates = getWeekDates(weekStart);
    const end   = new Date(dates[6]); end.setHours(23,59,59,999);
    try {
      const res = await api.get<{ data: CalBooking[] }>(
        `/room/calendar?startDate=${weekStart.toISOString()}&endDate=${end.toISOString()}${roomFilter ? `&roomId=${roomFilter}` : ''}`
      );
      setCalData(Array.isArray(res.data) ? res.data : []);
    } catch { /* ignore */ }
  }, [weekStart, roomFilter]);

  useEffect(() => { loadCal(); }, [loadCal]);

  // Load my bookings + pending
  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const [myRes, pendRes] = await Promise.all([
        api.get<{ data: Booking[]; pagination: { total: number } }>('/room/bookings?mine=true&limit=50'),
        isAdmin ? api.get<{ data: Booking[]; pagination: { total: number } }>('/room/bookings?status=pending&limit=30') : Promise.resolve(null),
      ]);
      setMyBookings(Array.isArray(myRes.data) ? myRes.data : []);
      if (pendRes) setPending(Array.isArray(pendRes.data) ? pendRes.data : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [isAdmin]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  // Load report
  const loadReport = useCallback(async () => {
    try {
      const res = await api.get<{ data: ReportData }>(`/room/report?month=${reportMonth}&year=${reportYear}`);
      setReportData(res.data);
    } catch { /* ignore */ }
  }, [reportMonth, reportYear]);

  useEffect(() => { if (activeTab === 'report') loadReport(); }, [activeTab, loadReport]);

  const refresh = () => { loadCal(); loadBookings(); };

  // Week navigation
  const weekDates = getWeekDates(weekStart);
  const prevWeek  = () => { const d = new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(d); };
  const nextWeek  = () => { const d = new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(d); };

  const weekLabel = () => {
    const first = weekDates[0], last = weekDates[6];
    if (first.getMonth() === last.getMonth()) return `${MONTHS_TH[first.getMonth()]} ${first.getFullYear()+543}`;
    return `${MONTHS_SH[first.getMonth()]} - ${MONTHS_SH[last.getMonth()]} ${last.getFullYear()+543}`;
  };

  // Get cal bookings for a specific room + day
  const getCellBookings = (roomId: number, date: Date) => {
    const s = new Date(date); s.setHours(0,0,0,0);
    const e = new Date(date); e.setHours(23,59,59,999);
    return calData.filter((b) => b.roomId === roomId && new Date(b.startTime) >= s && new Date(b.startTime) <= e);
  };

  const filteredRooms = roomFilter ? rooms.filter((r) => r.id === parseInt(roomFilter)) : rooms;

  const CHART_COLORS = ['#1d6ae5','#7c3aed','#0d9068','#b45309','#dc2626'];

  return (
    <div className="space-y-4">
      {/* Toast */}
      {(toast || toastErr) && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 ${toastErr ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {toastErr ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast || toastErr}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>จองห้องประชุม</h1>
          <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>ตรวจสอบและจัดการการจองห้องประชุม</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <button onClick={() => router.push('/room/manage/bookings')} className="btn-secondary flex items-center gap-1.5 text-sm">
                <List className="w-3.5 h-3.5" /> จัดการการจอง
              </button>
              <button onClick={() => router.push('/room/manage')} className="btn-secondary flex items-center gap-1.5 text-sm">
                <Settings className="w-3.5 h-3.5" /> จัดการห้อง
              </button>
            </>
          )}
          <button onClick={() => router.push('/room/new')} className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus className="w-3.5 h-3.5" /> จองห้อง
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0" style={{ borderBottom: '1px solid #dce6f9' }}>
        {([
          { key: 'calendar', label: 'ปฏิทิน',         icon: Calendar },
          { key: 'mine',     label: 'การจองของฉัน',    icon: Clock    },
          { key: 'pending',  label: `รออนุมัติ${pending.length > 0 ? ` (${pending.length})` : ''}`, icon: AlertTriangle, adminOnly: true },
          { key: 'report',   label: 'รายงาน',           icon: List,    adminOnly: true },
        ] as { key: 'calendar' | 'mine' | 'pending' | 'report'; label: string; icon: React.ElementType; adminOnly?: boolean }[]).map(({ key, label, icon: Icon, adminOnly }) => {
          if (adminOnly && !isAdmin) return null;
          return (
            <button key={key} onClick={() => setActiveTab(key)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors"
              style={activeTab === key ? { color: '#1d6ae5', borderBottom: '2px solid #1d6ae5', marginBottom: -1, backgroundColor: '#f8faff' } : { color: '#4a6080' }}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Calendar ── */}
      {activeTab === 'calendar' && (
        <div className="space-y-3">
          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)} className="input-field text-sm py-1.5 w-auto">
              <option value="">ห้องทั้งหมด</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            {/* Week nav */}
            <div className="flex items-center gap-2">
              <button onClick={prevWeek} className="p-1.5 rounded-lg hover:bg-[#f5f8ff]"><ChevronLeft className="w-4 h-4" style={{ color: '#4a6080' }} /></button>
              <span className="text-sm font-medium min-w-[140px] text-center" style={{ color: '#1a2744' }}>{weekLabel()}</span>
              <button onClick={nextWeek} className="p-1.5 rounded-lg hover:bg-[#f5f8ff]"><ChevronRight className="w-4 h-4" style={{ color: '#4a6080' }} /></button>
              <button onClick={() => setWeekStart(getWeekStart(new Date()))} className="text-xs px-2 py-1 rounded" style={{ color: '#1d6ae5', backgroundColor: '#e8f0fe' }}>วันนี้</button>
            </div>
            {/* View toggle */}
            <div className="flex rounded-xl overflow-hidden ml-auto" style={{ border: '1px solid #dce6f9' }}>
              {[{ v: 'status', l: 'สถานะ', icon: Users }, { v: 'week', l: 'สัปดาห์', icon: Calendar }, { v: 'list', l: 'รายการ', icon: List }].map(({ v, l, icon: Icon }) => (
                <button key={v} onClick={() => setCalView(v as typeof calView)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
                  style={calView === v ? { backgroundColor: '#1d6ae5', color: '#fff' } : { color: '#4a6080', backgroundColor: '#fff' }}>
                  <Icon className="w-3 h-3" />{l}
                </button>
              ))}
            </div>
          </div>

          {/* Status card view */}
          {calView === 'status' && (
            <div>
              <p className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#1a2744' }}>
                <Users className="w-4 h-4" style={{ color: '#1d6ae5' }} />
                สถานะห้องประชุม ณ ปัจจุบัน
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {statusData.map((room) => (
                  <div key={room.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    style={{ border: '1px solid #dce6f9' }}
                    onClick={() => router.push(`/room/new?roomId=${room.id}`)}>
                    {/* Image */}
                    <div className="relative h-44 bg-gray-100 overflow-hidden">
                      {room.image ? (
                        <img src={room.image} alt={room.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#e8f0fe' }}>
                          <Users className="w-12 h-12" style={{ color: '#a5c0f0' }} />
                        </div>
                      )}
                      {/* Gradient overlay */}
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)' }} />
                      {/* Status badge */}
                      <div className="absolute top-3 right-3">
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shadow"
                          style={room.isBusy
                            ? { backgroundColor: '#dc2626', color: '#fff' }
                            : { backgroundColor: '#16a34a', color: '#fff' }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-white opacity-90" />
                          {room.isBusy ? 'ไม่ว่าง' : 'ห้องว่าง'}
                        </span>
                      </div>
                      {/* Room name on image */}
                      <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
                        <p className="text-white font-bold text-base leading-tight">{room.name}</p>
                        <p className="text-white/80 text-xs flex items-center gap-1 mt-0.5">
                          <Users className="w-3 h-3" /> ความจุ {room.capacity} ท่าน
                        </p>
                      </div>
                    </div>
                    {/* Upcoming bookings */}
                    <div className="px-4 py-3">
                      <p className="text-xs font-semibold mb-2" style={{ color: '#4a6080' }}>การจองที่กำลังจะมาถึง</p>
                      {room.upcomingBookings.length === 0 ? (
                        <p className="text-xs text-center py-3" style={{ color: '#94a3b8' }}>ว่างยาวๆ ไม่มีคิวจองเร็วๆ นี้</p>
                      ) : (
                        <div className="space-y-2">
                          {room.upcomingBookings.map((b) => (
                            <div key={b.id} className="flex items-start justify-between gap-2"
                              onClick={(e) => { e.stopPropagation(); api.get<{ data: Booking }>(`/room/bookings/${b.id}`).then(r => setSelectedBooking(r.data)).catch(() => {}); }}>
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate" style={{ color: '#1a2744' }}>{b.title}</p>
                                <p className="text-[11px]" style={{ color: '#94a3b8' }}>
                                  {fmtDate(b.startTime)}
                                </p>
                              </div>
                              <span className="flex-shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                                style={{ backgroundColor: '#e8f0fe', color: '#1d6ae5' }}>
                                {fmtTime(b.startTime)}-{fmtTime(b.endTime)} น.
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weekly grid view */}
          {calView === 'week' && (
            <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #dce6f9' }}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr style={{ backgroundColor: '#f8faff', borderBottom: '1px solid #dce6f9' }}>
                      <th className="w-36 px-4 py-3 text-left text-xs font-semibold" style={{ color: '#94a3b8' }}>ห้อง</th>
                      {weekDates.map((d, i) => {
                        const isToday = isoDate(d) === isoDate(new Date());
                        return (
                          <th key={i} className="px-2 py-3 text-center text-xs font-semibold min-w-[100px]"
                            style={{ color: isToday ? '#1d6ae5' : '#94a3b8' }}>
                            <div>{THAI_DAYS[i]}</div>
                            <div className={`text-sm font-bold mt-0.5 ${isToday ? 'w-7 h-7 rounded-full flex items-center justify-center mx-auto' : ''}`}
                              style={{ backgroundColor: isToday ? '#1d6ae5' : 'transparent', color: isToday ? '#fff' : '#1a2744' }}>
                              {d.getDate()}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRooms.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-10 text-center text-sm" style={{ color: '#94a3b8' }}>ไม่มีข้อมูลห้อง</td></tr>
                    ) : filteredRooms.map((room) => (
                      <tr key={room.id} style={{ borderBottom: '1px solid #f5f8ff' }}>
                        <td className="px-4 py-3 align-top">
                          <p className="text-xs font-semibold" style={{ color: '#1a2744' }}>{room.name}</p>
                          <p className="text-[11px]" style={{ color: '#94a3b8' }}>{room.capacity} คน</p>
                        </td>
                        {weekDates.map((d, i) => {
                          const cellBks = getCellBookings(room.id, d);
                          return (
                            <td key={i} className="px-1.5 py-2 align-top cursor-pointer hover:bg-[#f8faff] transition-colors"
                              style={{ minHeight: 60, verticalAlign: 'top' }}
                              onClick={() => { if (cellBks.length === 0) router.push(`/room/new?roomId=${room.id}&date=${isoDate(d)}`); }}>
                              <div className="space-y-1">
                                {cellBks.map((b) => (
                                  <button key={b.id} onClick={(e) => { e.stopPropagation(); /* load full booking then show popup */ api.get<{ data: Booking }>(`/room/bookings/${b.id}`).then(r => setSelectedBooking(r.data)).catch(()=>{}); }}
                                    className="w-full text-left px-2 py-1 rounded-lg text-[11px] truncate"
                                    style={{ backgroundColor: CAL_STATUS_BG[b.status] ?? '#f5f8ff', border: `1px solid ${CAL_STATUS_BORDER[b.status] ?? '#dce6f9'}` }}>
                                    <p className="font-medium truncate" style={{ color: '#1a2744' }}>{b.title}</p>
                                    <p style={{ color: '#4a6080' }}>{fmtTime(b.startTime)}-{fmtTime(b.endTime)}</p>
                                  </button>
                                ))}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* List view */}
          {calView === 'list' && (
            <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #dce6f9' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: '#f8faff', borderBottom: '1px solid #f0f4ff' }}>
                      {['วันที่', 'ห้อง', 'หัวข้อ', 'ผู้จอง', 'เวลา', 'สถานะ'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#94a3b8' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {calData.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: '#94a3b8' }}>ไม่มีการจองในสัปดาห์นี้</td></tr>
                    ) : calData.map((b) => {
                      const sm = STATUS[b.status] ?? STATUS.pending;
                      return (
                        <tr key={b.id} style={{ borderBottom: '1px solid #f5f8ff' }} className="hover:bg-[#fafbff] cursor-pointer"
                          onClick={() => api.get<{ data: Booking }>(`/room/bookings/${b.id}`).then(r => setSelectedBooking(r.data)).catch(()=>{})}>
                          <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{fmtDate(b.startTime)}</td>
                          <td className="px-4 py-3 text-xs font-medium" style={{ color: '#1a2744' }}>{b.room.name}</td>
                          <td className="px-4 py-3 text-xs max-w-[160px] truncate" style={{ color: '#1a2744' }}>{b.title}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{b.user.name}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{fmtTime(b.startTime)}-{fmtTime(b.endTime)}</td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: sm.bg, color: sm.text }}>{sm.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: My Bookings ── */}
      {activeTab === 'mine' && (
        <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #dce6f9' }}>
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3" style={{ color: '#94a3b8' }}><Loader2 className="w-5 h-5 animate-spin" />กำลังโหลด...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#f8faff', borderBottom: '1px solid #f0f4ff' }}>
                    {['ห้อง','หัวข้อ','วันที่','เวลา','จำนวน','สถานะ','จัดการ'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#94a3b8' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {myBookings.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: '#94a3b8' }}>ไม่มีการจอง</td></tr>
                  ) : myBookings.map((b) => {
                    const sm = STATUS[b.status] ?? STATUS.pending;
                    const canCancel = ['pending','approved'].includes(b.status) && new Date(b.startTime) > new Date();
                    return (
                      <tr key={b.id} style={{ borderBottom: '1px solid #f5f8ff' }} className="hover:bg-[#fafbff]">
                        <td className="px-4 py-3 text-xs font-medium" style={{ color: '#1a2744' }}>{b.room.name}</td>
                        <td className="px-4 py-3 text-xs max-w-[160px] truncate" style={{ color: '#1a2744' }}>{b.title}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{fmtDate(b.startTime)}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{fmtTime(b.startTime)}-{fmtTime(b.endTime)}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{b.attendees ? `${b.attendees} คน` : '-'}</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: sm.bg, color: sm.text }}>{sm.label}</span></td>
                        <td className="px-4 py-3">
                          {canCancel && (
                            <button onClick={() => api.put(`/room/bookings/${b.id}/cancel`, {}).then(() => { showToast('ยกเลิกสำเร็จ'); loadBookings(); loadCal(); }).catch((e: unknown) => showToast((e as Error).message, true))}
                              className="text-xs px-2 py-1 rounded" style={{ color: '#dc2626', backgroundColor: '#fef2f2' }}>ยกเลิก</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Pending (admin) ── */}
      {activeTab === 'pending' && isAdmin && (
        <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #dce6f9' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#f8faff', borderBottom: '1px solid #f0f4ff' }}>
                  {['ห้อง','หัวข้อ','ผู้จอง','วันที่','เวลา','จำนวน','จัดการ'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#94a3b8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: '#94a3b8' }}>ไม่มีรายการรออนุมัติ ✅</td></tr>
                ) : pending.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #f5f8ff' }} className="hover:bg-[#fafbff]">
                    <td className="px-4 py-3 text-xs font-medium" style={{ color: '#1a2744' }}>{b.room.name}</td>
                    <td className="px-4 py-3 text-xs max-w-[160px] truncate" style={{ color: '#1a2744' }}>{b.title}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{b.user.name}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{fmtDate(b.startTime)}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{fmtTime(b.startTime)}-{fmtTime(b.endTime)}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{b.attendees ? `${b.attendees} คน` : '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => api.put(`/room/bookings/${b.id}/approve`, {}).then(() => { showToast('อนุมัติสำเร็จ'); loadBookings(); loadCal(); }).catch((e: unknown) => showToast((e as Error).message, true))}
                          className="px-2 py-1 rounded text-xs" style={{ backgroundColor: '#e6f9f0', color: '#0d9068' }}>อนุมัติ</button>
                        <button onClick={() => api.put(`/room/bookings/${b.id}/reject`, {}).then(() => { showToast('ปฏิเสธสำเร็จ'); loadBookings(); loadCal(); }).catch((e: unknown) => showToast((e as Error).message, true))}
                          className="px-2 py-1 rounded text-xs" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>ปฏิเสธ</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab: Report (admin) ── */}
      {activeTab === 'report' && isAdmin && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="bg-white rounded-xl p-4 flex flex-wrap gap-3" style={{ border: '1px solid #dce6f9' }}>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium" style={{ color: '#4a6080' }}>เดือน</label>
              <select className="input-field text-sm py-1.5 w-auto" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)}>
                {MONTHS_TH.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium" style={{ color: '#4a6080' }}>ปี พ.ศ.</label>
              <select className="input-field text-sm py-1.5 w-auto" value={reportYear} onChange={(e) => setReportYear(e.target.value)}>
                {[0,1,2].map((i) => { const y = new Date().getFullYear()+543-i; return <option key={y} value={y}>{y}</option>; })}
              </select>
            </div>
            <button onClick={loadReport} className="btn-primary text-sm py-1.5">ค้นหา</button>
          </div>

          {reportData && (() => {
            const sb = reportData.statusBreakdown;
            const pieData = sb ? [
              { name: 'อนุมัติ',   value: (sb.approved ?? 0) + (sb.completed ?? 0), color: '#10b981' },
              { name: 'รออนุมัติ', value: sb.pending   ?? 0, color: '#f59e0b' },
              { name: 'ปฏิเสธ',   value: sb.rejected  ?? 0, color: '#ef4444' },
              { name: 'ยกเลิก',   value: sb.cancelled ?? 0, color: '#94a3b8' },
            ].filter(d => d.value > 0) : [];
            const barData = [...reportData.rooms].sort((a,b) => b.hours - a.hours).map(r => ({ name: r.name.replace('ห้อง','').replace('ห้องประชุม','').trim(), hours: r.hours, bookings: r.bookings }));
            return (
            <>
              {/* KPI */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'การจองทั้งหมด', value: reportData.total.bookings, text: '#1d6ae5', bg: '#eff6ff' },
                  { label: 'ชั่วโมงการใช้งาน', value: `${reportData.total.hours} ชม.`, text: '#0d9068', bg: '#e6f9f0' },
                  { label: 'ห้องที่ใช้งาน', value: `${reportData.rooms.filter(r=>r.bookings>0).length}/${reportData.rooms.length}`, text: '#7c3aed', bg: '#f5f3ff' },
                ].map(({ label, value, text, bg }) => (
                  <div key={label} className="bg-white rounded-xl p-3 text-center" style={{ border: '1px solid #dce6f9' }}>
                    <p className="text-xl font-bold" style={{ color: text }}>{value}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 gap-3">
                {/* Bar chart - ชั่วโมงการใช้งาน */}
                <div className="bg-white rounded-xl p-4" style={{ border: '1px solid #dce6f9' }}>
                  <p className="text-sm font-semibold mb-3" style={{ color: '#1a2744' }}>ชั่วโมงการใช้งานแต่ละห้อง</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={barData} margin={{ top: 4, right: 8, left: -16, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} angle={-35} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit=" ชม." />
                      <Tooltip
                        contentStyle={{ borderRadius: 10, border: '1px solid #dce6f9', fontSize: 12 }}
                        formatter={(v: number) => [`${v} ชม.`, 'ชั่วโมง']}
                      />
                      <Bar dataKey="hours" radius={[6,6,0,0]}>
                        {barData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Pie chart + utilization bars */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Pie - สถานะการจอง */}
                  {pieData.length > 0 && (
                    <div className="bg-white rounded-xl p-4" style={{ border: '1px solid #dce6f9' }}>
                      <p className="text-sm font-semibold mb-2" style={{ color: '#1a2744' }}>สถานะการจอง</p>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="45%" innerRadius={45} outerRadius={68} paddingAngle={3} dataKey="value">
                            {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #dce6f9', fontSize: 12 }} formatter={(v: number, _n, p) => [v, p.payload.name]} />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Utilization bars */}
                  <div className="bg-white rounded-xl p-4" style={{ border: '1px solid #dce6f9' }}>
                    <p className="text-sm font-semibold mb-3" style={{ color: '#1a2744' }}>% การใช้งาน</p>
                    <div className="space-y-2.5">
                      {[...reportData.rooms].sort((a,b) => b.utilization - a.utilization).map((r, i) => (
                        <div key={r.id}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="truncate max-w-[120px]" style={{ color: '#1a2744' }}>{r.name.replace('ห้อง','').replace('ห้องประชุม','').trim()}</span>
                            <span className="font-semibold" style={{ color: r.utilization >= 80 ? '#0d9068' : r.utilization >= 50 ? '#b45309' : '#1d6ae5' }}>{r.utilization}%</span>
                          </div>
                          <div className="w-full rounded-full h-2" style={{ backgroundColor: '#f0f4ff' }}>
                            <div className="h-2 rounded-full transition-all" style={{
                              width: `${r.utilization}%`,
                              backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #dce6f9' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: '#f8faff', borderBottom: '1px solid #f0f4ff' }}>
                      {['ห้อง','ความจุ','จอง (ครั้ง)','ชั่วโมง','% การใช้งาน'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#94a3b8' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.rooms.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f5f8ff' }} className="hover:bg-[#fafbff]">
                        <td className="px-4 py-3 font-medium text-xs" style={{ color: '#1a2744' }}>{r.name}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{r.capacity} คน</td>
                        <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{r.bookings}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{r.hours}</td>
                        <td className="px-4 py-3">
                          <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full"
                            style={{
                              backgroundColor: r.utilization >= 80 ? '#e6f9f0' : r.utilization >= 50 ? '#fffbeb' : '#f0f4ff',
                              color: r.utilization >= 80 ? '#0d9068' : r.utilization >= 50 ? '#b45309' : '#1d6ae5',
                            }}>
                            {r.utilization}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          );})()}
        </div>
      )}

      {/* Booking popup */}
      {selectedBooking && (
        <BookingPopup
          booking={selectedBooking} isAdmin={isAdmin} userId={userId}
          onClose={() => setSelectedBooking(null)}
          onRefresh={() => { setSelectedBooking(null); refresh(); }}
        />
      )}
    </div>
  );
}
