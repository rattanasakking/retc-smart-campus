'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Search, MapPin, Camera, X, Loader2, Check, AlertTriangle, Plus } from 'lucide-react';
import { api } from '@/lib/api';

interface EquipmentResult { id: number; code: string; name: string; department: string; status: string }

const TYPES = ['คอมพิวเตอร์/IT','เครื่องปรับอากาศ','ระบบไฟฟ้า','ระบบประปา','เฟอร์นิเจอร์','โสตทัศนูปกรณ์','ยานพาหนะ','อาคาร/สิ่งก่อสร้าง','เครื่องจักร','อื่นๆ'];

export default function HelpdeskNewPage() {
  const router = useRouter();

  // Equipment search
  const [eqSearch, setEqSearch]     = useState('');
  const [eqResults, setEqResults]   = useState<EquipmentResult[]>([]);
  const [eqLoading, setEqLoading]   = useState(false);
  const [selectedEq, setSelectedEq] = useState<EquipmentResult | null>(null);
  const eqRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form
  const [form, setForm] = useState({ type: '', location: '', urgency: 'normal', title: '', description: '' });
  const [image, setImage] = useState('');
  const [gpsLat, setGpsLat] = useState('');
  const [gpsLng, setGpsLng] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  // State
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [toast, setToast]       = useState('');

  // Equipment search debounce
  useEffect(() => {
    if (!eqSearch.trim()) { setEqResults([]); return; }
    if (eqRef.current) clearTimeout(eqRef.current);
    eqRef.current = setTimeout(async () => {
      setEqLoading(true);
      try {
        const res = await api.get<{ data: EquipmentResult[] }>(`/equipment?search=${encodeURIComponent(eqSearch)}&limit=8&status=active`);
        setEqResults(Array.isArray(res.data) ? res.data : []);
      } catch { setEqResults([]); }
      finally { setEqLoading(false); }
    }, 350);
  }, [eqSearch]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const getGPS = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setGpsLat(p.coords.latitude.toFixed(6)); setGpsLng(p.coords.longitude.toFixed(6)); setGpsLoading(false); },
      () => setGpsLoading(false),
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.type || !form.location.trim() || !form.title.trim()) { setError('กรุณากรอกข้อมูลให้ครบ'); return; }
    setError(''); setSaving(true);
    try {
      await api.post('/helpdesk', {
        equipmentId: selectedEq?.id,
        type: form.type, location: form.location, urgency: form.urgency,
        title: form.title, description: form.description,
        image: image || undefined,
      });
      setToast('แจ้งซ่อมสำเร็จ');
      setTimeout(() => router.push('/helpdesk'), 900);
    } catch (e: unknown) { setError((e as Error).message); setSaving(false); }
  };

  return (
    <div className="max-w-2xl space-y-4">
      {toast && (
        <div className="fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 bg-green-50 border border-green-200 text-green-700">
          <Check className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-[#f5f8ff] transition-colors">
          <ChevronLeft className="w-4 h-4" style={{ color: '#4a6080' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>แจ้งซ่อมใหม่</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-3 py-2.5 rounded-lg text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Equipment search */}
        <div>
          <p className="text-xs font-semibold mb-3 pb-2" style={{ color: '#94a3b8', borderBottom: '1px solid #f0f4ff' }}>ครุภัณฑ์ (ถ้ามี)</p>
          {selectedEq ? (
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#e8f0fe', border: '1px solid #c7d9fc' }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: '#1a2744' }}>{selectedEq.name}</p>
                <p className="text-xs font-mono" style={{ color: '#1d6ae5' }}>{selectedEq.code} · {selectedEq.department}</p>
              </div>
              <button type="button" onClick={() => { setSelectedEq(null); setEqSearch(''); }}>
                <X className="w-4 h-4" style={{ color: '#4a6080' }} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: '#f5f8ff', border: '1px solid #dce6f9' }}>
                <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#94a3b8' }} />
                <input value={eqSearch} onChange={(e) => setEqSearch(e.target.value)} placeholder="ค้นหารหัส/ชื่อครุภัณฑ์..." className="flex-1 bg-transparent text-sm outline-none placeholder-[#94a3b8]" style={{ color: '#1a2744' }} />
                {eqLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#94a3b8' }} />}
              </div>
              {eqResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg overflow-hidden z-20" style={{ border: '1px solid #dce6f9' }}>
                  {eqResults.map((eq) => (
                    <button key={eq.id} type="button" onClick={() => { setSelectedEq(eq); setEqSearch(''); setEqResults([]); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-[#f5f8ff] transition-colors" style={{ borderBottom: '1px solid #f5f8ff' }}>
                      <p className="text-sm font-medium" style={{ color: '#1a2744' }}>{eq.name}</p>
                      <p className="text-xs font-mono" style={{ color: '#1d6ae5' }}>{eq.code} · {eq.department}</p>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs mt-1.5" style={{ color: '#94a3b8' }}>หรือแจ้งโดยไม่ระบุครุภัณฑ์</p>
            </div>
          )}
        </div>

        {/* Main fields */}
        <div>
          <p className="text-xs font-semibold mb-3 pb-2" style={{ color: '#94a3b8', borderBottom: '1px solid #f0f4ff' }}>รายละเอียดการซ่อม</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>ประเภทการซ่อม *</label>
                <select className="input-field" required value={form.type} onChange={(e) => set('type', e.target.value)}>
                  <option value="">-- เลือกประเภท --</option>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>สถานที่ *</label>
                <input className="input-field" required value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="ห้อง/อาคาร" />
              </div>
            </div>

            {/* Urgency */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: '#4a6080' }}>ความเร่งด่วน</label>
              <div className="flex gap-2">
                {([
                  { v: 'normal',   l: 'ปกติ',    bg: '#eff6ff', text: '#1d6ae5' },
                  { v: 'urgent',   l: 'เร่งด่วน', bg: '#fffbeb', text: '#b45309' },
                  { v: 'critical', l: 'วิกฤต',    bg: '#fef2f2', text: '#dc2626' },
                ] as const).map(({ v, l, bg, text }) => (
                  <button key={v} type="button" onClick={() => set('urgency', v)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{ backgroundColor: form.urgency === v ? bg : '#f5f8ff', color: form.urgency === v ? text : '#4a6080', border: `1px solid ${form.urgency === v ? text : '#dce6f9'}` }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>หัวข้อ *</label>
              <input className="input-field" required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="สรุปปัญหาสั้นๆ" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>รายละเอียด</label>
              <textarea className="input-field resize-none" rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="อธิบายปัญหา สถานที่ อาการ ผลกระทบ..." />
            </div>
          </div>
        </div>

        {/* GPS */}
        <div>
          <p className="text-xs font-semibold mb-3 pb-2" style={{ color: '#94a3b8', borderBottom: '1px solid #f0f4ff' }}>ตำแหน่ง GPS (ไม่บังคับ)</p>
          {gpsLat && gpsLng ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#e6f9f0', border: '1px solid #bbf7d0' }}>
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#0d9068' }} />
              <span className="text-xs flex-1" style={{ color: '#0d9068' }}>{parseFloat(gpsLat).toFixed(4)}, {parseFloat(gpsLng).toFixed(4)}</span>
              <button type="button" onClick={() => { setGpsLat(''); setGpsLng(''); }}>
                <X className="w-3 h-3" style={{ color: '#0d9068' }} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={getGPS} disabled={gpsLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors"
              style={{ backgroundColor: '#f5f8ff', color: '#1d6ae5', border: '1px solid #dce6f9' }}>
              {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
              ใช้ตำแหน่งปัจจุบัน
            </button>
          )}
        </div>

        {/* Photo */}
        <div>
          <p className="text-xs font-semibold mb-3 pb-2" style={{ color: '#94a3b8', borderBottom: '1px solid #f0f4ff' }}>รูปภาพ</p>
          {image ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="preview" className="w-48 h-36 object-cover rounded-xl" style={{ border: '1px solid #dce6f9' }} />
              <button type="button" onClick={() => setImage('')} className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center gap-2 py-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors hover:bg-[#f5f8ff]"
              style={{ borderColor: '#dce6f9', color: '#94a3b8' }}>
              <Camera className="w-8 h-8" />
              <span className="text-sm">ถ่ายรูปหรืออัพโหลด</span>
              <input type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImage(f); }} />
            </label>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => router.back()} className="btn-secondary">ยกเลิก</button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            แจ้งซ่อม
          </button>
        </div>
      </form>
    </div>
  );
}
