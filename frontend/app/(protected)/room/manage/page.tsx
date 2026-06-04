'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Plus, Pencil, Trash2, Loader2, Check, AlertTriangle, X, Upload, Search } from 'lucide-react';
import { api } from '@/lib/api';

interface Room {
  id: number; name: string; capacity: number;
  facilities?: string; image?: string; requireApproval: boolean;
  status: string; note?: string;
}

const FACILITIES_OPTIONS = ['โปรเจกเตอร์','ไวท์บอร์ด','ลำโพง','แอร์','WiFi','กล้องวงจรปิด','ระบบเสียง','เวที'];
const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  active:      { label: '✅ ใช้งาน', bg: '#e6f9f0', text: '#0d9068' },
  maintenance: { label: '🔧 ปรับปรุง', bg: '#fffbeb', text: '#b45309' },
  inactive:    { label: '❌ ปิด',   bg: '#f1f5f9', text: '#64748b' },
};

function RoomModal({ room, onClose, onSave }: {
  room: Room | null; onClose: () => void; onSave: () => void;
}) {
  const isEdit = !!room;
  const [form, setForm] = useState({
    name: room?.name ?? '',
    capacity: String(room?.capacity ?? ''),
    requireApproval: room?.requireApproval ?? false,
    status: room?.status ?? 'active',
    note:   room?.note ?? '',
    image:  room?.image ?? '',
  });
  const [facilities, setFacilities] = useState<string[]>(() => {
    try { return JSON.parse(room?.facilities ?? '[]'); } catch { return []; }
  });
  const [imagePreview, setImagePreview] = useState(room?.image ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const toggle = (f: string) => setFacilities((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);

  const handleImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => { const url = e.target?.result as string; setImagePreview(url); setForm((f) => ({ ...f, image: url })); };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.capacity) { setErr('กรุณากรอกชื่อและความจุ'); return; }
    setErr(''); setSaving(true);
    try {
      const body = { ...form, capacity: parseInt(form.capacity), facilities };
      if (isEdit) await api.put(`/room/rooms/${room!.id}`, body);
      else        await api.post('/room/rooms', body);
      onSave();
    } catch (e: unknown) { setErr((e as Error).message); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => !saving && onClose()} />
      <div className="relative w-full max-w-lg rounded-2xl shadow-xl z-10 bg-white max-h-[90vh] flex flex-col" style={{ border: '1px solid #dce6f9' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #dce6f9' }}>
          <h3 className="font-semibold" style={{ color: '#1a2744' }}>{isEdit ? 'แก้ไขห้องประชุม' : 'เพิ่มห้องประชุม'}</h3>
          <button onClick={onClose}><X className="w-4 h-4" style={{ color: '#4a6080' }} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {err && <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm"><AlertTriangle className="w-4 h-4 flex-shrink-0" />{err}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>ชื่อห้อง *</label>
              <input className="input-field" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="ห้องประชุมใหญ่" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>ความจุ (คน) *</label>
              <input type="number" min="1" className="input-field" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} placeholder="50" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>สถานะ</label>
              <select className="input-field" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="active">✅ ใช้งาน</option>
                <option value="maintenance">🔧 ปรับปรุง</option>
                <option value="inactive">❌ ปิดใช้</option>
              </select>
            </div>
          </div>

          {/* Facilities */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: '#4a6080' }}>อุปกรณ์ / สิ่งอำนวยความสะดวก</label>
            <div className="flex flex-wrap gap-2">
              {FACILITIES_OPTIONS.map((f) => (
                <button key={f} type="button" onClick={() => toggle(f)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                  style={facilities.includes(f)
                    ? { backgroundColor: '#1d6ae5', color: '#fff', border: '1px solid #1d6ae5' }
                    : { backgroundColor: '#f5f8ff', color: '#4a6080', border: '1px solid #dce6f9' }}>
                  {facilities.includes(f) ? '✓ ' : ''}{f}
                </button>
              ))}
            </div>
          </div>

          {/* Require approval toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#f5f8ff', border: '1px solid #dce6f9' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: '#1a2744' }}>ต้องอนุมัติก่อนใช้งาน</p>
              <p className="text-xs" style={{ color: '#4a6080' }}>ผู้ใช้ต้องรอ Admin อนุมัติการจอง</p>
            </div>
            <button type="button" onClick={() => setForm((f) => ({ ...f, requireApproval: !f.requireApproval }))}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.requireApproval ? 'bg-[#1d6ae5]' : 'bg-gray-300'}`}>
              <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                style={{ left: form.requireApproval ? '1.25rem' : '0.125rem' }} />
            </button>
          </div>

          {/* Image */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: '#4a6080' }}>รูปภาพห้อง</label>
            {imagePreview ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="preview" className="w-48 h-32 object-cover rounded-xl" style={{ border: '1px solid #dce6f9' }} />
                <button type="button" onClick={() => { setImagePreview(''); setForm((f) => ({ ...f, image: '' })); }}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors hover:bg-[#f5f8ff]"
                style={{ borderColor: '#dce6f9', color: '#94a3b8' }}>
                <Upload className="w-4 h-4" />
                <span className="text-sm">อัพโหลดรูปภาพ</span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImage(f); }} />
              </label>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>หมายเหตุ</label>
            <textarea className="input-field resize-none" rows={2} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="ข้อมูลเพิ่มเติม..." />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: '1px solid #dce6f9' }}>
          <button onClick={onClose} disabled={saving} className="btn-secondary">ยกเลิก</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มห้อง'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RoomManagePage() {
  const router = useRouter();
  const [rooms, setRooms]       = useState<Room[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<Room | null | 'new'>(undefined as unknown as null);
  const [search, setSearch]     = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);
  const [toast, setToast]       = useState('');
  const [toastErr, setToastErr] = useState('');

  const showToast = (msg: string, err = false) => {
    if (err) { setToastErr(msg); setToast(''); } else { setToast(msg); setToastErr(''); }
    setTimeout(() => { setToast(''); setToastErr(''); }, 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: Room[] }>('/room/rooms/all');
      setRooms(Array.isArray(res.data) ? res.data : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (room: Room) => {
    if (!confirm(`ยืนยันการลบ "${room.name}"?\nการจองที่เสร็จสิ้นแล้วจะยังคงอยู่ในประวัติ`)) return;
    setDeleting(room.id);
    try {
      await api.delete(`/room/rooms/${room.id}`);
      showToast('ลบห้องสำเร็จ');
      load();
    } catch (e) {
      showToast((e as Error).message, true);
    } finally {
      setDeleting(null);
    }
  };

  const facilityList = (room: Room): string[] => {
    try { return JSON.parse(room.facilities ?? '[]'); } catch { return []; }
  };

  const filtered = rooms.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.note ?? '').toLowerCase().includes(search.toLowerCase())
  );

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
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/room')} className="p-2 rounded-xl hover:bg-[#f5f8ff]">
            <ChevronLeft className="w-4 h-4" style={{ color: '#4a6080' }} />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>จัดการห้องประชุม</h1>
            <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>เพิ่มแก้ไขห้องประชุมและสิ่งอำนวยความสะดวก</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94a3b8' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาห้อง..."
              className="pl-9 pr-3 py-2 text-sm rounded-xl focus:outline-none"
              style={{ border: '1px solid #dce6f9', width: 200 }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
              </button>
            )}
          </div>
          <button onClick={() => setModal('new')} className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus className="w-3.5 h-3.5" /> เพิ่มห้อง
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #dce6f9' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3" style={{ color: '#94a3b8' }}>
            <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลด...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#f8faff', borderBottom: '1px solid #f0f4ff' }}>
                  {['ชื่อห้อง', 'ความจุ', 'อุปกรณ์', 'ต้องอนุมัติ', 'สถานะ', 'จัดการ'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#94a3b8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: '#94a3b8' }}>
                    {search ? `ไม่พบห้องที่ค้นหา "${search}"` : 'ยังไม่มีห้อง'}
                  </td></tr>
                ) : filtered.map((room) => {
                  const sm = STATUS_META[room.status] ?? STATUS_META.active;
                  const facList = facilityList(room);
                  const isDeleting = deleting === room.id;
                  return (
                    <tr key={room.id} style={{ borderBottom: '1px solid #f5f8ff' }} className="hover:bg-[#fafbff]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {room.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={room.image} alt={room.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg flex-shrink-0" style={{ backgroundColor: '#e8f0fe' }} />
                          )}
                          <div>
                            <p className="font-medium text-xs" style={{ color: '#1a2744' }}>{room.name}</p>
                            {room.note && <p className="text-[11px] truncate max-w-[120px]" style={{ color: '#94a3b8' }}>{room.note}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{room.capacity} คน</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {facList.slice(0, 3).map((f) => (
                            <span key={f} className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: '#e8f0fe', color: '#1d6ae5' }}>{f}</span>
                          ))}
                          {facList.length > 3 && <span className="text-[10px]" style={{ color: '#94a3b8' }}>+{facList.length-3}</span>}
                          {facList.length === 0 && <span className="text-[11px]" style={{ color: '#94a3b8' }}>-</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: room.requireApproval ? '#b45309' : '#0d9068' }}>
                          {room.requireApproval ? '⚠️ รออนุมัติ' : '✓ ทันที'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: sm.bg, color: sm.text }}>{sm.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setModal(room)} className="p-1.5 rounded-lg hover:bg-[#e8f0fe] transition-colors" title="แก้ไข">
                            <Pencil className="w-3.5 h-3.5" style={{ color: '#1d6ae5' }} />
                          </button>
                          <button onClick={() => handleDelete(room)} disabled={isDeleting}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50" title="ลบ">
                            {isDeleting
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                              : <Trash2 className="w-3.5 h-3.5 text-red-400" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal !== undefined && (
        <RoomModal
          room={modal === 'new' ? null : modal as Room}
          onClose={() => setModal(undefined as unknown as null)}
          onSave={() => {
            setModal(undefined as unknown as null);
            showToast(modal === 'new' ? 'เพิ่มห้องสำเร็จ' : 'แก้ไขสำเร็จ');
            load();
          }}
        />
      )}
    </div>
  );
}
