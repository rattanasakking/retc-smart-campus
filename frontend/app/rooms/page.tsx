'use client';
import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Clock, DoorOpen, Users, Loader2, MapPin, X } from 'lucide-react';

interface Booking {
  id: number; title: string; startTime: string; endTime: string;
  status: string; attendees: number | null;
  roomId: number; roomName: string; bookerName: string; department: string | null;
}
interface Room { id: number; name: string; capacity: number }

const MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const DOW = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];

function dayKey(iso: string) { return iso.slice(0, 10); }
function fmtDay(iso: string) {
  const d = new Date(iso);
  return `วัน${DOW[d.getDay()]}ที่ ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  approved: { label: 'อนุมัติแล้ว', bg: '#e6f9f0', color: '#0d9068' },
  pending:  { label: 'รออนุมัติ',   bg: '#fffbeb', color: '#b45309' },
};

export default function PublicRoomsPage() {
  const [rooms, setRooms]     = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate]       = useState('');
  const [roomId, setRoomId]   = useState('');

  useEffect(() => {
    fetch('/api/room/public/rooms').then((r) => r.json()).then((j) => setRooms(j.data ?? [])).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (date)   p.set('date', date);
    if (roomId) p.set('roomId', roomId);
    fetch(`/api/room/public/bookings?${p}`).then((r) => r.json())
      .then((j) => setBookings(j.data ?? []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [date, roomId]);

  useEffect(() => { load(); }, [load]);

  // group by day
  const groups: { key: string; items: Booking[] }[] = [];
  for (const b of bookings) {
    const k = dayKey(b.startTime);
    let g = groups.find((x) => x.key === k);
    if (!g) { g = { key: k, items: [] }; groups.push(g); }
    g.items.push(b);
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f8ff', fontFamily: "'Prompt','Sarabun',sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ backgroundColor: '#0f1e3c' }}>
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-3">
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
        <div className="relative max-w-4xl mx-auto px-4 py-10 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2 flex items-center justify-center gap-2"><CalendarDays size={26} /> ตารางการจองห้องประชุม</h2>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.72)' }}>ตรวจสอบตารางการใช้ห้องประชุมล่วงหน้า</p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-4xl mx-auto px-4 -mt-6 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg p-3 flex flex-col sm:flex-row gap-2" style={{ border: '1px solid #dce6f9' }}>
          <div className="relative flex-1">
            <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm focus:outline-none" style={{ backgroundColor: '#f5f8ff', color: '#1a2744' }} />
          </div>
          <div className="relative flex-1">
            <DoorOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm focus:outline-none appearance-none" style={{ backgroundColor: '#f5f8ff', color: '#1a2744' }}>
              <option value="">-- ทุกห้อง --</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          {(date || roomId) && (
            <button onClick={() => { setDate(''); setRoomId(''); }}
              className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5" style={{ backgroundColor: '#eef2fb', color: '#4a6080' }}>
              <X size={15} /> ล้าง
            </button>
          )}
        </div>
        {!date && <p className="text-xs text-center mt-2" style={{ color: '#94a3b8' }}>แสดงการจองตั้งแต่วันนี้ไปอีก 30 วัน — เลือกวันที่เพื่อดูเฉพาะวัน</p>}
      </div>

      {/* List */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-16" style={{ color: '#94a3b8' }}><Loader2 size={30} className="animate-spin inline" /></div>
        ) : groups.length === 0 ? (
          <div className="bg-white rounded-2xl p-14 text-center" style={{ border: '1px solid #dce6f9' }}>
            <CalendarDays size={44} className="mx-auto mb-4" style={{ color: '#cbd5e1' }} />
            <h4 className="text-xl font-bold mb-1" style={{ color: '#1a2744' }}>ไม่มีการจองในช่วงที่เลือก</h4>
            <p style={{ color: '#4a6080' }}>ลองเปลี่ยนวันที่หรือเลือกห้องอื่น</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <div key={g.key}>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 sticky top-16 py-1.5" style={{ color: '#1a2744' }}>
                  <span className="w-1.5 h-5 rounded-full" style={{ backgroundColor: '#2979ff' }} />
                  {fmtDay(g.key)}
                  <span className="text-xs font-normal" style={{ color: '#94a3b8' }}>({g.items.length} รายการ)</span>
                </h3>
                <div className="space-y-2.5">
                  {g.items.map((b) => {
                    const st = STATUS[b.status] ?? { label: b.status, bg: '#f1f5f9', color: '#64748b' };
                    return (
                      <div key={b.id} className="bg-white rounded-xl p-4 flex items-start gap-4" style={{ border: '1px solid #dce6f9' }}>
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
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="text-center text-sm py-8" style={{ color: '#94a3b8' }}>
        © {new Date().getFullYear() + 543} วิทยาลัยเทคนิคร้อยเอ็ด — ระบบจองห้องประชุม
      </footer>
    </div>
  );
}
