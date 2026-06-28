'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Check, AlertTriangle, Loader2, Users, Clock, Info } from 'lucide-react';
import ThaiDatePicker from '@/components/ui/ThaiDatePicker';
import { api } from '@/lib/api';

interface Room {
  id: number; name: string; capacity: number;
  facilities?: string; image?: string; requireApproval: boolean; status: string;
}
interface ConflictBooking {
  id: number; title: string; startTime: string; endTime: string;
  user: { name: string };
}

const EQUIPMENTS = ['โปรเจกเตอร์', 'ไวท์บอร์ด', 'ลำโพง', 'แอร์', 'WiFi', 'กล้อง'];

const fmtTime = (d: string) => {
  const dt = new Date(d);
  return `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
};


const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2,'0'));
const MINS  = ['00','15','30','45'];

function TimePicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [h, m] = value.split(':');
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>{label}</label>
      <div className="flex gap-1 items-center">
        <select className="input-field w-16 text-center" value={h} onChange={(e) => onChange(`${e.target.value}:${m}`)}>
          {HOURS.map((hh) => <option key={hh} value={hh}>{hh}</option>)}
        </select>
        <span style={{ color: '#4a6080' }}>:</span>
        <select className="input-field w-16 text-center" value={m} onChange={(e) => onChange(`${h}:${e.target.value}`)}>
          {MINS.map((mm) => <option key={mm} value={mm}>{mm}</option>)}
        </select>
        <span className="text-xs" style={{ color: '#94a3b8' }}>น.</span>
      </div>
    </div>
  );
}

export default function RoomNewPage() {
  const router = useRouter();
  const params = useSearchParams();

  const [rooms, setRooms]           = useState<Room[]>([]);
  const [selectedRoom, setRoom]     = useState<Room | null>(null);
  const [date, setDate]             = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; });
  const [startTime, setStartTime]   = useState('09:00');
  const [endTime, setEndTime]       = useState('10:00');
  const [conflicts, setConflicts]   = useState<ConflictBooking[]>([]);
  const [checking, setChecking]     = useState(false);

  const [form, setForm] = useState({ title: '', attendees: '', purpose: '' });
  const [equipment, setEquipment] = useState<string[]>([]);

  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [toast, setToast]     = useState('');

  // Load rooms
  useEffect(() => {
    api.get<{ data: Room[] }>('/room/rooms').then((r) => {
      const list = Array.isArray(r.data) ? r.data : [];
      setRooms(list);
      // Pre-select from query params
      const rid = params.get('roomId');
      if (rid) {
        const found = list.find((rm) => rm.id === parseInt(rid));
        if (found) setRoom(found);
      }
    }).catch(() => {});
    const d = params.get('date');
    if (d) setDate(d);
  }, [params]);

  // Check conflicts when room + date + time change
  const checkConflicts = useCallback(async () => {
    if (!selectedRoom || !date || !startTime || !endTime) return;
    setChecking(true);
    try {
      const start = new Date(`${date}T${startTime}:00`);
      const end   = new Date(`${date}T${endTime}:00`);
      const dayEnd = new Date(`${date}T23:59:59`);
      const res = await api.get<{ data: ConflictBooking[] }>(
        `/room/calendar?roomId=${selectedRoom.id}&startDate=${new Date(`${date}T00:00:00`).toISOString()}&endDate=${dayEnd.toISOString()}`
      );
      const bks = Array.isArray(res.data) ? res.data : [];
      const overlaps = bks.filter((b) => {
        const bs = new Date(b.startTime), be = new Date(b.endTime);
        return bs < end && be > start;
      });
      setConflicts(overlaps as ConflictBooking[]);
    } catch { setConflicts([]); }
    finally { setChecking(false); }
  }, [selectedRoom, date, startTime, endTime]);

  useEffect(() => { checkConflicts(); }, [checkConflicts]);

  const toggleEquip = (e: string) =>
    setEquipment((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]);

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!selectedRoom) { setError('กรุณาเลือกห้อง'); return; }
    if (!form.title.trim()) { setError('กรุณากรอกหัวข้อการประชุม'); return; }
    if (conflicts.length > 0) { setError('ช่วงเวลาซ้อนทับกับการจองอื่น กรุณาเลือกเวลาอื่น'); return; }
    const start = new Date(`${date}T${startTime}:00`);
    const end   = new Date(`${date}T${endTime}:00`);
    if (end <= start) { setError('เวลาสิ้นสุดต้องหลังเวลาเริ่ม'); return; }

    setError(''); setSaving(true);
    try {
      await api.post('/room/bookings', {
        roomId:          selectedRoom.id,
        title:           form.title,
        attendees:       form.attendees ? parseInt(form.attendees) : undefined,
        startTime:       start.toISOString(),
        endTime:         end.toISOString(),
        purpose:         form.purpose || undefined,
        equipmentNeeded: equipment.length > 0 ? equipment : undefined,
      });
      setToast(selectedRoom.requireApproval ? 'ส่งคำขอจองสำเร็จ รอการอนุมัติ' : 'จองห้องสำเร็จ');
      setTimeout(() => router.push('/room'), 900);
    } catch (e: unknown) { setError((e as Error).message); setSaving(false); }
  };

  const facilityList = (room: Room): string[] => {
    try { return JSON.parse(room.facilities ?? '[]'); } catch { return []; }
  };

  const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const fmtDateThai = (d: string) => { const dt = new Date(d); return `${dt.getDate()} ${MONTHS_TH[dt.getMonth()]} ${dt.getFullYear()+543}`; };

  return (
    <div className="max-w-3xl space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 bg-green-50 border border-green-200 text-green-700">
          <Check className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-[#f5f8ff]">
          <ChevronLeft className="w-4 h-4" style={{ color: '#4a6080' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>จองห้องประชุม</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Step 1: Select room */}
        <div className="card">
          <p className="text-xs font-semibold mb-3 pb-2" style={{ color: '#94a3b8', borderBottom: '1px solid #f0f4ff' }}>
            1. เลือกห้องประชุม
          </p>
          {rooms.length === 0 ? (
            <div className="flex items-center justify-center py-8 gap-2" style={{ color: '#94a3b8' }}>
              <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลด...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rooms.map((room) => {
                const isSelected = selectedRoom?.id === room.id;
                const facList = facilityList(room);
                return (
                  <button key={room.id} type="button" onClick={() => setRoom(isSelected ? null : room)}
                    className="text-left rounded-xl p-4 transition-all"
                    style={{
                      border: `2px solid ${isSelected ? '#1d6ae5' : '#dce6f9'}`,
                      backgroundColor: isSelected ? '#eff6ff' : '#fff',
                    }}>
                    {room.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={room.image} alt={room.name} className="w-full h-28 object-cover rounded-lg mb-2" />
                    )}
                    <p className="font-semibold text-sm" style={{ color: '#1a2744' }}>{room.name}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: '#4a6080' }}>
                      <Users className="w-3 h-3" /> {room.capacity} คน
                    </div>
                    {facList.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {facList.slice(0, 3).map((f) => (
                          <span key={f} className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: '#e8f0fe', color: '#1d6ae5' }}>{f}</span>
                        ))}
                        {facList.length > 3 && <span className="text-[10px]" style={{ color: '#94a3b8' }}>+{facList.length-3}</span>}
                      </div>
                    )}
                    {room.requireApproval && (
                      <p className="text-[10px] mt-2 flex items-center gap-1" style={{ color: '#b45309' }}>
                        <Info className="w-3 h-3" /> ต้องรออนุมัติ
                      </p>
                    )}
                    {isSelected && (
                      <div className="flex items-center justify-center mt-2">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#1d6ae5', color: '#fff' }}>✓ เลือกแล้ว</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 2: Date + Time */}
        {selectedRoom && (
          <div className="card">
            <p className="text-xs font-semibold mb-3 pb-2" style={{ color: '#94a3b8', borderBottom: '1px solid #f0f4ff' }}>
              2. วันที่และเวลา
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>วันที่ *</label>
                <ThaiDatePicker value={date} onChange={setDate} min={new Date().toISOString().slice(0,10)} />
              </div>
              <TimePicker value={startTime} onChange={setStartTime} label="เวลาเริ่ม *" />
              <TimePicker value={endTime} onChange={setEndTime} label="เวลาสิ้นสุด *" />
            </div>

            {/* Summary */}
            {date && startTime && endTime && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-3" style={{ backgroundColor: '#f5f8ff' }}>
                <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#1d6ae5' }} />
                <span style={{ color: '#4a6080' }}>{fmtDateThai(date)} · {startTime} - {endTime} น.</span>
                <span className="ml-auto text-xs font-medium" style={{ color: '#1d6ae5' }}>
                  {(() => { const h = (parseInt(endTime)-parseInt(startTime)); const m = parseInt(endTime.split(':')[1])-parseInt(startTime.split(':')[1]); return `${h}${m > 0 ? `.${m}` : ''} ชม.`; })()}
                </span>
              </div>
            )}

            {/* Conflict warning */}
            {checking && <div className="flex items-center gap-2 text-xs" style={{ color: '#94a3b8' }}><Loader2 className="w-3 h-3 animate-spin" />ตรวจสอบการจอง...</div>}
            {!checking && conflicts.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: '#b45309' }}>
                  <AlertTriangle className="w-3.5 h-3.5" /> พบการจองซ้อนทับ
                </p>
                {conflicts.map((c) => (
                  <p key={c.id} className="text-xs" style={{ color: '#b45309' }}>
                    · {(c as ConflictBooking & { user: { name: string } }).user.name} — {fmtTime(c.startTime)}-{fmtTime(c.endTime)} ({c.title})
                  </p>
                ))}
              </div>
            )}
            {!checking && conflicts.length === 0 && date && selectedRoom && (
              <div className="flex items-center gap-2 text-xs" style={{ color: '#0d9068' }}>
                <Check className="w-3.5 h-3.5" /> ว่างในช่วงเวลานี้
              </div>
            )}
          </div>
        )}

        {/* Step 3: Details */}
        {selectedRoom && (
          <div className="card space-y-4">
            <p className="text-xs font-semibold pb-2" style={{ color: '#94a3b8', borderBottom: '1px solid #f0f4ff' }}>
              3. รายละเอียดการประชุม
            </p>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>หัวข้อการประชุม *</label>
              <input className="input-field" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="ประชุมคณะกรรมการ / อบรมครู..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>จำนวนผู้เข้าร่วม</label>
                <input type="number" min="1" max={selectedRoom.capacity} className="input-field" value={form.attendees} onChange={(e) => setForm((f) => ({ ...f, attendees: e.target.value }))} placeholder={`สูงสุด ${selectedRoom.capacity} คน`} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>วัตถุประสงค์</label>
              <textarea className="input-field resize-none" rows={3} value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} placeholder="อธิบายวัตถุประสงค์การใช้ห้อง..." />
            </div>
            {/* Equipment */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: '#4a6080' }}>อุปกรณ์เพิ่มเติมที่ต้องการ</label>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENTS.map((eq) => (
                  <button key={eq} type="button" onClick={() => toggleEquip(eq)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                    style={equipment.includes(eq)
                      ? { backgroundColor: '#1d6ae5', color: '#fff', border: '1px solid #1d6ae5' }
                      : { backgroundColor: '#f5f8ff', color: '#4a6080', border: '1px solid #dce6f9' }}>
                    {equipment.includes(eq) ? '✓ ' : ''}{eq}
                  </button>
                ))}
              </div>
            </div>

            {/* Approval notice */}
            {selectedRoom.requireApproval && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-sm" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#b45309' }} />
                <p style={{ color: '#b45309' }}>ห้องนี้ต้องรอการอนุมัติจากผู้ดูแล คำขอจะถูกส่งแจ้งเตือนผ่าน LINE</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="btn-secondary">ยกเลิก</button>
          <button type="submit" disabled={saving || !selectedRoom || conflicts.length > 0}
            className="btn-primary flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            ยืนยันการจอง
          </button>
        </div>
      </form>
    </div>
  );
}
