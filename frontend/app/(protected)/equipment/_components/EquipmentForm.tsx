'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Check, AlertTriangle, Loader2, X, Plus } from 'lucide-react';
import { api } from '@/lib/api';

interface Category   { id: number; name: string }
interface Department { id: number; name: string; code: string }

const STATUS_OPTIONS = [
  { value: 'active',   label: '✅ ใช้งาน' },
  { value: 'damaged',  label: '🔧 ซ่อม' },
  { value: 'disposed', label: '🗑 จำหน่าย' },
];

export function EquipmentForm({ mode, initialData, equipmentId }: {
  mode: 'new' | 'edit';
  initialData?: Record<string, string | number | null>;
  equipmentId?: string;
}) {
  const router = useRouter();
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepts]     = useState<Department[]>([]);
  const [form, setForm] = useState({
    code: '', name: '', categoryId: '', brand: '', model: '',
    serialNumber: '', department: '', room: '', price: '',
    acquiredDate: '', source: '', status: 'active', note: '',
  });
  const [images, setImages]   = useState<string[]>([]);  // base64 or URL
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [toast, setToast]     = useState('');

  useEffect(() => {
    Promise.all([
      api.get<{ data: Category[] }>('/equipment/categories'),
      api.get<{ data: Department[] }>('/settings/departments'),
    ]).then(([cats, depts]) => {
      setCategories(cats.data);
      setDepts(depts.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!initialData) return;
    const mapped: Record<string, string> = {};
    for (const [k, v] of Object.entries(initialData)) {
      if (v === null || v === undefined) mapped[k] = '';
      else if (k === 'categoryId')   mapped[k] = String(v);
      else if (k === 'acquiredDate') mapped[k] = v ? String(v).slice(0, 10) : '';
      else if (k === 'image')        continue; // handled separately
      else mapped[k] = String(v);
    }
    setForm(f => ({ ...f, ...mapped }));
    // Parse image field (JSON array or single URL)
    if (initialData.image) {
      try {
        const arr = JSON.parse(String(initialData.image));
        if (Array.isArray(arr)) setImages(arr);
        else setImages([String(initialData.image)]);
      } catch {
        setImages([String(initialData.image)]);
      }
    }
  }, [initialData]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const addImages = (files: FileList | null) => {
    if (!files) return;
    const remaining = 5 - images.length;
    Array.from(files).slice(0, remaining).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        setImages(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx: number) => setImages(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const body = {
        ...form,
        categoryId:   form.categoryId   ? parseInt(form.categoryId)  : undefined,
        price:        form.price        ? form.price                 : undefined,
        acquiredDate: form.acquiredDate ? form.acquiredDate          : undefined,
        images:       images.length ? images : undefined,
      };
      if (mode === 'new') {
        const res = await api.post<{ data: { id: number } }>('/equipment', body);
        setToast('เพิ่มครุภัณฑ์สำเร็จ');
        setTimeout(() => router.push(`/equipment/${res.data.id}`), 900);
      } else {
        await api.put(`/equipment/${equipmentId}`, body);
        setToast('แก้ไขสำเร็จ');
        setTimeout(() => router.push(`/equipment/${equipmentId}`), 900);
      }
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl space-y-4">
      {toast && (
        <div className="fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 bg-green-50 border border-green-200 text-green-700">
          <Check className="w-4 h-4" /> {toast}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-[#f5f8ff]">
          <ChevronLeft className="w-4 h-4" style={{ color: '#4a6080' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>
          {mode === 'new' ? 'เพิ่มครุภัณฑ์ใหม่' : 'แก้ไขข้อมูลครุภัณฑ์'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-3 py-2.5 rounded-lg text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* ข้อมูลหลัก */}
        <div>
          <p className="text-xs font-semibold mb-3 pb-2" style={{ color: '#94a3b8', borderBottom: '1px solid #f0f4ff' }}>ข้อมูลหลัก</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>รหัสครุภัณฑ์ *</label>
              <input className="input-field font-mono" required value={form.code} onChange={e => set('code', e.target.value)} placeholder="เช่น IT-COM-001" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>หมวดหมู่ *</label>
              <select className="input-field" required value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
                <option value="">-- เลือกหมวดหมู่ --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>ชื่อครุภัณฑ์ *</label>
              <input className="input-field" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="ชื่อครุภัณฑ์" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>ยี่ห้อ</label>
              <input className="input-field" value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="ยี่ห้อ" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>รุ่น</label>
              <input className="input-field" value={form.model} onChange={e => set('model', e.target.value)} placeholder="รุ่น" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>หมายเลขซีเรียล</label>
              <input className="input-field font-mono" value={form.serialNumber} onChange={e => set('serialNumber', e.target.value)} placeholder="Serial Number" />
            </div>
          </div>
        </div>

        {/* ที่ตั้ง */}
        <div>
          <p className="text-xs font-semibold mb-3 pb-2" style={{ color: '#94a3b8', borderBottom: '1px solid #f0f4ff' }}>ที่ตั้ง</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>แผนก/งาน *</label>
              {departments.length > 0 ? (
                <select className="input-field" required value={form.department} onChange={e => set('department', e.target.value)}>
                  <option value="">-- เลือกแผนก --</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              ) : (
                <input className="input-field" required value={form.department} onChange={e => set('department', e.target.value)} placeholder="แผนก/งาน" />
              )}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>ห้อง/ที่ตั้ง</label>
              <input className="input-field" value={form.room} onChange={e => set('room', e.target.value)} placeholder="ห้อง 101" />
            </div>
          </div>
        </div>

        {/* ข้อมูลการจัดซื้อ */}
        <div>
          <p className="text-xs font-semibold mb-3 pb-2" style={{ color: '#94a3b8', borderBottom: '1px solid #f0f4ff' }}>ข้อมูลการจัดซื้อ</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>ราคา (บาท)</label>
              <input type="number" min="0" step="0.01" className="input-field" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>วันที่ซื้อ</label>
              <input type="date" className="input-field" value={form.acquiredDate} onChange={e => set('acquiredDate', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>แหล่งที่มา/งบประมาณ</label>
              <input className="input-field" value={form.source} onChange={e => set('source', e.target.value)} placeholder="งบประมาณแผ่นดิน 2567" />
            </div>
          </div>
        </div>

        {/* สถานะ + หมายเหตุ */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>สถานะ</label>
            <select className="input-field" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>หมายเหตุ</label>
          <textarea className="input-field resize-none" rows={3} value={form.note} onChange={e => set('note', e.target.value)} placeholder="หมายเหตุเพิ่มเติม..." />
        </div>

        {/* รูปภาพ (หลายรูป) */}
        <div>
          <p className="text-xs font-semibold mb-3 pb-2" style={{ color: '#94a3b8', borderBottom: '1px solid #f0f4ff' }}>
            รูปภาพ <span className="font-normal">({images.length}/5)</span>
          </p>
          <div className="flex flex-wrap gap-3">
            {images.map((img, idx) => (
              <div key={idx} className="relative w-28 h-28 rounded-xl overflow-hidden border border-[#dce6f9]">
                <img src={img} alt={`img-${idx}`} className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <label className="w-28 h-28 rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors hover:bg-[#f5f8ff]"
                     style={{ borderColor: '#dce6f9', color: '#94a3b8' }}>
                <input ref={imgInputRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={e => addImages(e.target.files)} />
                <Plus className="w-6 h-6" />
                <span className="text-xs">เพิ่มรูป</span>
              </label>
            )}
          </div>
          <p className="text-xs text-[#94a3b8] mt-1.5">อัปโหลดได้สูงสุด 5 รูป</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => router.back()} className="btn-secondary">ยกเลิก</button>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'new' ? 'เพิ่มครุภัณฑ์' : 'บันทึกการแก้ไข'}
          </button>
        </div>
      </form>
    </div>
  );
}
