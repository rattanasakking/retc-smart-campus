'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, DoorOpen, Users, Loader2, MapPin, X, List, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';

interface Booking {
  id: number; title: string; startTime: string; endTime: string;
  status: string; attendees: number | null;
  roomId: number; roomName: string; bookerName: string; department: string | null;
}
interface Room { id: number; name: string; capacity: number }

const MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const DOW = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
const DOW_SHORT = ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'];

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function dayKey(iso: string) { return iso.slice(0, 10); }
function fmtDayLong(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return `วัน${DOW[d.getDay()]}ที่ ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  approved: { label: 'อนุมัติแล้ว', bg: '#e6f9f0', color: '#0d9068', dot: '#10b981' },
  pending:  { label: 'รออนุมัติ',   bg: '#fffbeb', color: '#b45309', dot: '#f59e0b' },
};

export default function PublicRoomsPage() {
  const [rooms, setRooms]       = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState<'calendar' | 'list'>('calendar');
  const [roomId, setRoomId]     = useState('');
  const [date, setDate]         = useState('');                 // list: เลือกวัน
  const [cursor, setCursor]     = useState(() => new Date());   // calendar: เดือนที่แสดง
  const [dayModal, setDayModal] = useState<string | null>(null);// calendar: วันที่กดดู

  const cy = cursor.getFullYear();
  const cm = cursor.getMonth();

  useEffect(() => {
    fetch('/api/room/public/rooms').then((r) => r.json()).then((j) => setRooms(j.data ?? [])).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (roomId) p.set('roomId', roomId);
    if (view === 'calendar') {
      p.set('dateFrom', ymd(new Date(cy, cm, 1)));
      p.set('dateTo', ymd(new Date(cy, cm + 1, 0)));
    } else if (date) {
      p.set('date', date);
    }
    fetch(`/api/room/public/bookings?${p}`).then((r) => r.json())
      .then((j) => setBookings(j.data ?? []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [view, roomId, date, cy, cm]);

  useEffect(() => { load(); }, [load]);

  // จัดกลุ่มตามวัน
  const byDay = useMemo(() => {
    const m: Record<string, Booking[]> = {};
    for (const b of bookings) { const k = dayKey(b.startTime); (m[k] ??= []).push(b); }
    return m;
  }, [bookings]);

  const listGroups = useMemo(() => {
    const keys = Object.keys(byDay).sort();
    return keys.map((k) => ({ key: k, items: byDay[k] }));
  }, [byDay]);

  // ── ตารางปฏิทิน ──
  const cells = useMemo(() => {
    const startDow = new Date(cy, cm, 1).getDay();
    const days = new Date(cy, cm + 1, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) arr.push(null);
    for (let d = 1; d <= days; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [cy, cm]);

  const todayKey = ymd(new Date());
  const changeMonth = (delta: number) => setCursor(new Date(cy, cm + delta, 1));

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f8ff', fontFamily: "'Prompt','Sarabun',sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ backgroundColor: '#0f1e3c' }}>
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logoretc.png" alt="โลโก้" className="w-10 h-10 object-contain rounded-lg p-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold text-white leading-tight truncate">ตารางการใช้ห้องประชุม</h1>
            <p className="text-[11px] tracking-wider truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>วิทยาลัยเทคนิคร้อยเอ็ด</p>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#0f1e3c 0%,#1a2f5c 55%,#2979ff 140%)' }}>
        <div aria-hidden className="absolute -top-24 -right-16 w-72 h-72 rounded-full" style={{ background: 'rgba(41,121,255,0.25)', filter: 'blur(20px)' }} />
        <div className="relative max-w-5xl mx-auto px-4 py-9 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-1.5 flex items-center justify-center gap-2"><CalendarDays size={26} /> ตารางการจองห้องประชุม</h2>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.72)' }}>ตรวจสอบตารางการใช้ห้องประชุมล่วงหน้า</p>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-5xl mx-auto px-4 -mt-6 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg p-3 flex flex-col sm:flex-row gap-2 items-stretch" style={{ border: '1px solid #dce6f9' }}>
          {/* view toggle */}
          <div className="flex rounded-xl p-1 flex-shrink-0" style={{ backgroundColor: '#f5f8ff' }}>
            <button onClick={() => setView('calendar')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-colors"
              style={view === 'calendar' ? { backgroundColor: '#2979ff', color: '#fff' } : { color: '#4a6080' }}>
              <LayoutGrid size={15} /> ปฏิทิน
            </button>
            <button onClick={() => setView('list')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-colors"
              style={view === 'list' ? { backgroundColor: '#2979ff', color: '#fff' } : { color: '#4a6080' }}>
              <List size={15} /> รายการ
            </button>
          </div>

          <div className="relative flex-1">
            <DoorOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)}
              className="w-full h-full pl-10 pr-3 py-2.5 rounded-xl text-sm focus:outline-none appearance-none" style={{ backgroundColor: '#f5f8ff', color: '#1a2744' }}>
              <option value="">-- ทุกห้อง --</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          {view === 'list' && (
            <div className="relative flex-1">
              <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full h-full pl-10 pr-3 py-2.5 rounded-xl text-sm focus:outline-none" style={{ backgroundColor: '#f5f8ff', color: '#1a2744' }} />
              {date && <button onClick={() => setDate('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={15} /></button>}
            </div>
          )}
        </div>

        {/* legend */}
        <div className="flex items-center justify-center gap-4 mt-2 text-xs" style={{ color: '#4a6080' }}>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS.approved.dot }} /> อนุมัติแล้ว</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS.pending.dot }} /> รออนุมัติ</span>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {view === 'calendar' ? (
          <div className="bg-white rounded-2xl shadow-sm p-3 sm:p-5" style={{ border: '1px solid #dce6f9' }}>
            {/* month nav */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => changeMonth(-1)} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100" style={{ color: '#4a6080' }}><ChevronLeft size={18} /></button>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold" style={{ color: '#1a2744' }}>{MONTHS[cm]} {cy + 543}</h3>
                <button onClick={() => setCursor(new Date())} className="text-xs font-medium px-2.5 py-1 rounded-lg" style={{ backgroundColor: '#e8f0fe', color: '#1d6ae5' }}>วันนี้</button>
              </div>
              <button onClick={() => changeMonth(1)} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100" style={{ color: '#4a6080' }}><ChevronRight size={18} /></button>
            </div>

            {loading ? (
              <div className="text-center py-16" style={{ color: '#94a3b8' }}><Loader2 size={28} className="animate-spin inline" /></div>
            ) : (
              <>
                {/* weekday header */}
                <div className="grid grid-cols-7 mb-1">
                  {DOW_SHORT.map((d, i) => (
                    <div key={d} className="text-center text-[11px] font-bold py-1.5" style={{ color: i === 0 ? '#dc2626' : i === 6 ? '#1d6ae5' : '#94a3b8' }}>{d}</div>
                  ))}
                </div>
                {/* grid */}
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((d, idx) => {
                    if (d === null) return <div key={idx} className="rounded-lg" style={{ minHeight: 92, backgroundColor: '#fafbfe' }} />;
                    const key = ymd(new Date(cy, cm, d));
                    const items = byDay[key] ?? [];
                    const isToday = key === todayKey;
                    const dow = new Date(cy, cm, d).getDay();
                    return (
                      <button key={idx} onClick={() => items.length && setDayModal(key)}
                        className="rounded-lg p-1.5 text-left flex flex-col transition-colors"
                        style={{ minHeight: 92, border: isToday ? '2px solid #2979ff' : '1px solid #eef2fb', backgroundColor: '#fff', cursor: items.length ? 'pointer' : 'default' }}>
                        <span className="text-xs font-bold mb-1" style={{ color: isToday ? '#1d6ae5' : dow === 0 ? '#dc2626' : dow === 6 ? '#1d6ae5' : '#1a2744' }}>{d}</span>
                        <div className="flex-1 space-y-0.5 overflow-hidden">
                          {items.slice(0, 3).map((b) => {
                            const st = STATUS[b.status] ?? { bg: '#f1f5f9', color: '#64748b' };
                            return (
                              <div key={b.id} className="text-[9px] leading-tight px-1 py-0.5 rounded truncate" style={{ backgroundColor: st.bg, color: st.color }} title={`${fmtTime(b.startTime)} ${b.roomName} · ${b.title}`}>
                                {fmtTime(b.startTime)} {b.roomName}
                              </div>
                            );
                          })}
                          {items.length > 3 && <div className="text-[9px] font-bold px-1" style={{ color: '#2979ff' }}>+{items.length - 3} รายการ</div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ) : (
          // ── list view ──
          loading ? (
            <div className="text-center py-16" style={{ color: '#94a3b8' }}><Loader2 size={30} className="animate-spin inline" /></div>
          ) : listGroups.length === 0 ? (
            <div className="bg-white rounded-2xl p-14 text-center" style={{ border: '1px solid #dce6f9' }}>
              <CalendarDays size={44} className="mx-auto mb-4" style={{ color: '#cbd5e1' }} />
              <h4 className="text-xl font-bold mb-1" style={{ color: '#1a2744' }}>ไม่มีการจองในช่วงที่เลือก</h4>
              <p style={{ color: '#4a6080' }}>ลองเปลี่ยนวันที่หรือเลือกห้องอื่น</p>
            </div>
          ) : (
            <div className="space-y-6">
              {!date && <p className="text-xs text-center" style={{ color: '#94a3b8' }}>แสดงการจองตั้งแต่วันนี้ไปอีก 30 วัน — เลือกวันที่เพื่อดูเฉพาะวัน</p>}
              {listGroups.map((g) => <DayGroup key={g.key} dayKeyStr={g.key} items={g.items} />)}
            </div>
          )
        )}
      </div>

      {/* Day detail modal (calendar) */}
      {dayModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setDayModal(null)}>
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white" style={{ borderColor: '#eef2fb' }}>
              <h3 className="font-bold" style={{ color: '#1a2744' }}>{fmtDayLong(dayModal)}</h3>
              <button onClick={() => setDayModal(null)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-2.5">
              {(byDay[dayModal] ?? []).map((b) => <BookingRow key={b.id} b={b} />)}
            </div>
          </div>
        </div>
      )}

      <footer className="text-center text-sm py-8" style={{ color: '#94a3b8' }}>
        © {new Date().getFullYear() + 543} วิทยาลัยเทคนิคร้อยเอ็ด — ระบบจองห้องประชุม
      </footer>
    </div>
  );
}

function DayGroup({ dayKeyStr, items }: { dayKeyStr: string; items: Booking[] }) {
  return (
    <div>
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#1a2744' }}>
        <span className="w-1.5 h-5 rounded-full" style={{ backgroundColor: '#2979ff' }} />
        {fmtDayLong(dayKeyStr)}
        <span className="text-xs font-normal" style={{ color: '#94a3b8' }}>({items.length} รายการ)</span>
      </h3>
      <div className="space-y-2.5">{items.map((b) => <BookingRow key={b.id} b={b} />)}</div>
    </div>
  );
}

function BookingRow({ b }: { b: Booking }) {
  const st = STATUS[b.status] ?? { label: b.status, bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8' };
  return (
    <div className="bg-white rounded-xl p-4 flex items-start gap-4" style={{ border: '1px solid #dce6f9' }}>
      <div className="flex flex-col items-center justify-center px-3 py-2 rounded-lg flex-shrink-0" style={{ backgroundColor: '#eef2fb', minWidth: 78 }}>
        <span className="text-sm font-bold" style={{ color: '#1d6ae5' }}>{fmtTime(b.startTime)}</span>
        <span className="text-[10px]" style={{ color: '#94a3b8' }}>ถึง {fmtTime(b.endTime)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold truncate" style={{ color: '#1a2744' }}>{b.title}</p>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs" style={{ color: '#4a6080' }}>
          <span className="flex items-center gap-1"><MapPin size={12} style={{ color: '#94a3b8' }} /> {b.roomName}</span>
          <span className="flex items-center gap-1"><Users size={12} style={{ color: '#94a3b8' }} /> {b.bookerName}{b.department ? ` · ${b.department}` : ''}</span>
          {b.attendees ? <span className="flex items-center gap-1"><Clock size={12} style={{ color: '#94a3b8' }} /> {b.attendees} คน</span> : null}
        </div>
      </div>
    </div>
  );
}
