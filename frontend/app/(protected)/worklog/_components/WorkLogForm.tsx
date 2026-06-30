'use client';
import { useEffect, useRef, useState } from 'react';
import { Camera, X, Loader2, Plus, MapPin, ImageIcon } from 'lucide-react';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkType {
  id: number; name: string; color: string; category: string; isActive: boolean;
}

export interface WorkLogFormData {
  logDate:     string;
  workTypeId:  string;
  title:       string;
  detail:      string;
  startTime:   string;
  endTime:     string;
  gpsLat:      string;
  gpsLng:      string;
  attachments: string[];
}

interface PhotoItem { preview: string; isExisting: boolean }

interface WorkLogFormProps {
  initial?:  Partial<WorkLogFormData>;
  onSave:    (data: WorkLogFormData, submitNow: boolean) => Promise<void>;
  onCancel:  () => void;
  saving:    boolean;
  isEdit?:   boolean;
}

// ─── Thai Constants ───────────────────────────────────────────────────────────

const THAI_MONTHS_LONG  = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const THAI_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
  'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = (e) => resolve(e.target?.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ─── Device GPS ───────────────────────────────────────────────────────────────

function getDeviceGPS(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator?.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      ()  => resolve(null),
      { timeout: 8000, enableHighAccuracy: true, maximumAge: 60000 },
    );
  });
}

// ─── EXIF GPS Reader ──────────────────────────────────────────────────────────

function readExifGPS(file: File): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!file.type.match(/^image\/(jpeg|jpg)$/i) && !file.name.match(/\.jpe?g$/i)) {
      resolve(null); return;
    }
    const fr = new FileReader();
    fr.onload = (e) => {
      try {
        const buf = e.target?.result as ArrayBuffer;
        const v   = new DataView(buf);
        if (v.byteLength < 12 || v.getUint16(0) !== 0xFFD8) { resolve(null); return; }
        let off = 2;
        while (off + 4 <= v.byteLength) {
          if (v.getUint8(off) !== 0xFF) break;
          const marker = v.getUint16(off);
          const segLen = v.getUint16(off + 2);
          if (marker === 0xFFE1 && segLen > 8 &&
              v.getUint8(off+4)===0x45 && v.getUint8(off+5)===0x78 &&
              v.getUint8(off+6)===0x69 && v.getUint8(off+7)===0x66 &&
              v.getUint16(off+8)===0) {
            const t  = off + 10;
            const le = v.getUint16(t) === 0x4949;
            const r16 = (p: number) => v.getUint16(p, le);
            const r32 = (p: number) => v.getUint32(p, le);
            const ifd0 = t + r32(t + 4);
            if (ifd0 + 2 > v.byteLength) { resolve(null); return; }
            let gpsIFD = 0;
            for (let i = 0; i < r16(ifd0); i++) {
              const ep = ifd0 + 2 + i * 12;
              if (ep + 12 > v.byteLength) break;
              if (r16(ep) === 0x8825) { gpsIFD = t + r32(ep + 8); break; }
            }
            if (!gpsIFD || gpsIFD + 2 > v.byteLength) { resolve(null); return; }
            let latRef = 'N', lngRef = 'E', lat = 0, lng = 0, hasLat = false, hasLng = false;
            for (let i = 0; i < r16(gpsIFD); i++) {
              const gp = gpsIFD + 2 + i * 12;
              if (gp + 12 > v.byteLength) break;
              const tag = r16(gp);
              if      (tag === 0x0001) { latRef = String.fromCharCode(v.getUint8(gp + 8)); }
              else if (tag === 0x0003) { lngRef = String.fromCharCode(v.getUint8(gp + 8)); }
              else if (tag === 0x0002 || tag === 0x0004) {
                const rp = t + r32(gp + 8);
                if (rp + 24 > v.byteLength) continue;
                const val = r32(rp)/(r32(rp+4)||1) + r32(rp+8)/(r32(rp+12)||1)/60 + r32(rp+16)/(r32(rp+20)||1)/3600;
                if (tag === 0x0002) { lat = val; hasLat = true; } else { lng = val; hasLng = true; }
              }
            }
            if (hasLat && hasLng) {
              resolve({ lat: latRef==='S'?-lat:lat, lng: lngRef==='W'?-lng:lng }); return;
            }
          }
          if (segLen < 2) break;
          off += 2 + segLen;
        }
      } catch { /* ignore */ }
      resolve(null);
    };
    fr.onerror = () => resolve(null);
    fr.readAsArrayBuffer(file.slice(0, 204800));
  });
}

// ─── GPS Stamp on Canvas ──────────────────────────────────────────────────────

function stampGPS(dataURL: string, lat: number, lng: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 2048;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else       { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataURL); return; }

      ctx.drawImage(img, 0, 0, w, h);

      // Build stamp text
      const now    = new Date();
      const dateS  = `${now.getDate()} ${THAI_MONTHS_SHORT[now.getMonth()]} ${now.getFullYear() + 543}`;
      const timeS  = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} น.`;
      const latS   = `${Math.abs(lat).toFixed(5)}°${lat  >= 0 ? 'N' : 'S'}`;
      const lngS   = `${Math.abs(lng).toFixed(5)}°${lng >= 0 ? 'E' : 'W'}`;
      const line1  = `GPS  ${latS}  ${lngS}`;
      const line2  = `${dateS}  ${timeS}`;

      const fz  = Math.max(Math.round(w / 36), 14);
      const lh  = fz * 1.55;
      const pd  = fz * 0.7;
      const bgH = lh * 2 + pd * 2;

      // Semi-transparent dark bar
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.fillRect(0, h - bgH, w, bgH);

      // Thin accent line at top of bar
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(0, h - bgH, w, 3);

      // GPS line (bold, white)
      ctx.font          = `bold ${fz}px 'Helvetica Neue', Arial, sans-serif`;
      ctx.fillStyle     = '#ffffff';
      ctx.shadowColor   = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur    = 4;
      ctx.fillText(line1, pd, h - bgH + pd + fz * 0.95);

      // Date/time line (regular, light blue-gray)
      ctx.font          = `${Math.round(fz * 0.82)}px 'Helvetica Neue', Arial, sans-serif`;
      ctx.fillStyle     = '#93c5fd';
      ctx.fillText(line2, pd, h - bgH + pd + lh + fz * 0.82);

      ctx.shadowBlur    = 0;
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => resolve(dataURL);
    img.src = dataURL;
  });
}

// ─── 24-hour Time Picker ──────────────────────────────────────────────────────

function TimePicker24({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parts = value ? value.split(':') : ['08', '00'];
  const h = parts[0]?.padStart(2, '0') ?? '08';
  // round minute to nearest 5
  const rawMin = parseInt(parts[1] ?? '0', 10);
  const m = String(Math.round(rawMin / 5) * 5 % 60).padStart(2, '0');

  const hours   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

  const update = (newH: string, newM: string) => onChange(`${newH}:${newM}`);

  return (
    <div className="flex items-center gap-1">
      <select value={h} onChange={e => update(e.target.value, m)}
        className="input-field text-center" style={{ width: '4.5rem' }}>
        {hours.map(hr => <option key={hr} value={hr}>{hr}</option>)}
      </select>
      <span className="text-sm font-bold" style={{ color: '#4a6080' }}>:</span>
      <select value={m} onChange={e => update(h, e.target.value)}
        className="input-field text-center" style={{ width: '4.5rem' }}>
        {minutes.map(mn => <option key={mn} value={mn}>{mn}</option>)}
      </select>
      <span className="text-xs ml-1" style={{ color: '#94a3b8' }}>น.</span>
    </div>
  );
}

// ─── Thai Date Picker ─────────────────────────────────────────────────────────

function ThaiDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parts    = value ? value.split('-') : [];
  const year     = parts[0] ? parseInt(parts[0]) : new Date().getFullYear();
  const month    = parts[1] ? parseInt(parts[1]) : new Date().getMonth() + 1;
  const day      = parts[2] ? parseInt(parts[2]) : new Date().getDate();
  const thaiYear = year + 543;
  const daysInM  = new Date(year, month, 0).getDate();

  const update = (ty: number, m: number, d: number) => {
    const gy  = ty - 543;
    const dd  = Math.min(d, new Date(gy, m, 0).getDate());
    onChange(`${String(gy).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(dd).padStart(2,'0')}`);
  };

  const curBE    = new Date().getFullYear() + 543;
  const years    = [curBE + 1, curBE, curBE - 1, curBE - 2, curBE - 3];

  return (
    <div className="flex gap-2">
      <select value={day} onChange={(e) => update(thaiYear, month, +e.target.value)}
        className="input-field w-[4.5rem] text-center">
        {Array.from({ length: daysInM }, (_, i) => i+1).map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
      <select value={month} onChange={(e) => update(thaiYear, +e.target.value, day)}
        className="input-field flex-1">
        {THAI_MONTHS_LONG.map((m, i) => (
          <option key={i} value={i+1}>{m}</option>
        ))}
      </select>
      <select value={thaiYear} onChange={(e) => update(+e.target.value, month, day)}
        className="input-field w-[5.5rem] text-center">
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>{label}</label>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WorkLogForm({ initial, onSave, onCancel, saving, isEdit }: WorkLogFormProps) {
  const [form, setForm] = useState<WorkLogFormData>({
    logDate:     initial?.logDate     ?? todayISO(),
    workTypeId:  initial?.workTypeId  ?? '',
    title:       initial?.title       ?? '',
    detail:      initial?.detail      ?? '',
    startTime:   initial?.startTime   ?? '08:00',
    endTime:     initial?.endTime     ?? '17:00',
    gpsLat:      initial?.gpsLat      ?? '',
    gpsLng:      initial?.gpsLng      ?? '',
    attachments: initial?.attachments ?? [],
  });

  const [workTypes, setTypes]           = useState<WorkType[]>([]);
  const [photos, setPhotos]             = useState<PhotoItem[]>(() =>
    (initial?.attachments ?? []).map((p) => ({ preview: p, isExisting: true }))
  );
  const [photoLoading, setPhotoLoading] = useState(false);
  const [gpsFromPhoto, setGpsFromPhoto] = useState(false);
  const fileRef    = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<{ data: WorkType[] }>('/worklog/types').then((r) => setTypes(r.data)).catch(() => {});
  }, []);

  const set = (k: keyof WorkLogFormData, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // ── Handle file/camera input ──────────────────────────────────────────────

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remain  = 5 - photos.length;
    if (remain <= 0) return;
    const fileArr = Array.from(files).slice(0, remain);

    setPhotoLoading(true);
    try {
      // Step 1: read all files + their EXIF GPS in parallel
      const items = await Promise.all(
        fileArr.map(async (file) => ({
          file,
          dataURL:  await readFileAsDataURL(file),
          exifGPS:  await readExifGPS(file),
        }))
      );

      // Step 2: if no EXIF GPS at all, request device GPS once
      const anyExif = items.find((it) => it.exifGPS);
      let deviceGPS: { lat: number; lng: number } | null = null;
      if (!anyExif) {
        deviceGPS = await getDeviceGPS();
      }

      // Step 3: stamp each photo
      let gpsSet = !!form.gpsLat;
      for (const { dataURL, exifGPS } of items) {
        const gps          = exifGPS ?? deviceGPS;
        const stampedURL   = gps ? await stampGPS(dataURL, gps.lat, gps.lng) : dataURL;

        if (gps && !gpsSet) {
          setForm((f) => ({ ...f, gpsLat: gps.lat.toFixed(6), gpsLng: gps.lng.toFixed(6) }));
          setGpsFromPhoto(true);
          gpsSet = true;
        }

        setPhotos((prev) => [...prev, { preview: stampedURL, isExisting: false }]);
      }
    } finally {
      setPhotoLoading(false);
    }
  };

  const removePhoto = (i: number) => setPhotos((prev) => prev.filter((_, idx) => idx !== i));
  const clearGPS    = () => { setForm((f) => ({ ...f, gpsLat: '', gpsLng: '' })); setGpsFromPhoto(false); };
  const buildData   = (): WorkLogFormData => ({ ...form, attachments: photos.map((p) => p.preview) });

  const selType = workTypes.find((t) => String(t.id) === form.workTypeId);

  return (
    <div className="space-y-5">

      {/* ── Date (Thai Buddhist calendar, auto-fills today) ── */}
      <Field label="วันที่ *">
        <div className="flex items-center gap-2">
          <ThaiDatePicker value={form.logDate} onChange={(v) => set('logDate', v)} />
          <button
            type="button"
            onClick={() => set('logDate', todayISO())}
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            style={{ backgroundColor: '#e8f0fe', color: '#1d6ae5' }}
          >
            วันนี้
          </button>
        </div>
      </Field>

      {/* ── Time (24-hr) ── */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="เวลาเริ่ม">
          <TimePicker24 value={form.startTime} onChange={(v) => set('startTime', v)} />
        </Field>
        <Field label="เวลาสิ้นสุด">
          <TimePicker24 value={form.endTime} onChange={(v) => set('endTime', v)} />
        </Field>
      </div>

      {/* ── Work type ── */}
      <Field label="ประเภทงาน *">
        <div className="flex items-center gap-2">
          <select className="input-field flex-1" value={form.workTypeId}
            onChange={(e) => set('workTypeId', e.target.value)}>
            <option value="">-- เลือกประเภทงาน --</option>
            {workTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.category} › {t.name}</option>
            ))}
          </select>
          {selType && (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0"
              style={{ backgroundColor: selType.color + '22', color: selType.color }}>
              {selType.name}
            </span>
          )}
        </div>
      </Field>

      {/* ── Title ── */}
      <Field label="หัวข้องาน *">
        <input className="input-field" value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="ระบุหัวข้อกิจกรรมที่ปฏิบัติ" />
      </Field>

      {/* ── Detail ── */}
      <Field label="รายละเอียด">
        <textarea className="input-field resize-none" rows={4} value={form.detail}
          onChange={(e) => set('detail', e.target.value)}
          placeholder="อธิบายรายละเอียดการปฏิบัติงาน..." />
      </Field>

      {/* ── Photos with GPS stamp ── */}
      <div className="card !p-4 space-y-3">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4" style={{ color: '#7c3aed' }} />
            <span className="text-sm font-medium" style={{ color: '#1a2744' }}>
              รูปภาพแนบ ({photos.length}/5)
            </span>
          </div>
          {photos.length < 5 && !photoLoading && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: '#1d6ae5' }}>
                <Camera className="w-3.5 h-3.5" /> ถ่ายรูป
              </button>
              <span style={{ color: '#dce6f9' }}>|</span>
              <button type="button" onClick={() => galleryRef.current?.click()}
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: '#1d6ae5' }}>
                <ImageIcon className="w-3.5 h-3.5" /> อัลบั้ม
              </button>
            </div>
          )}
        </div>

        {/* input สำหรับถ่ายรูป (capture=environment) */}
        <input ref={fileRef} type="file" accept="image/*" capture="environment"
          multiple className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
        {/* input สำหรับเลือกจาก gallery (ไม่มี capture) */}
        <input ref={galleryRef} type="file" accept="image/*"
          multiple className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />

        {/* Photo grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Loading while processing photos */}
        {photoLoading && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
            style={{ backgroundColor: '#f5f8ff', border: '1px solid #dce6f9' }}>
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: '#1d6ae5' }} />
            <span className="text-xs" style={{ color: '#4a6080' }}>
              กำลังดึง GPS และบันทึกลงรูปภาพ...
            </span>
          </div>
        )}

        {/* Empty state */}
        {photos.length === 0 && !photoLoading && (
          <div className="w-full flex flex-col items-center gap-3 py-6 rounded-xl border-2 border-dashed"
            style={{ borderColor: '#dce6f9' }}>
            <ImageIcon className="w-8 h-8" style={{ color: '#94a3b8' }} />
            <p className="text-[11px]" style={{ color: '#94a3b8' }}>📍 GPS จะถูกบันทึกลงในรูปภาพอัตโนมัติ</p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ backgroundColor: '#e8f0fe', color: '#1d6ae5' }}>
                <Camera className="w-3.5 h-3.5" /> ถ่ายรูป
              </button>
              <button type="button" onClick={() => galleryRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ backgroundColor: '#f5f8ff', color: '#4a6080', border: '1px solid #dce6f9' }}>
                <ImageIcon className="w-3.5 h-3.5" /> เลือกจากอัลบั้ม
              </button>
            </div>
          </div>
        )}

        {/* GPS status badge */}
        {form.gpsLat && form.gpsLng && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ backgroundColor: '#e6f9f0', border: '1px solid #bbf7d0' }}>
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#0d9068' }} />
            <span className="text-xs flex-1" style={{ color: '#0d9068' }}>
              {parseFloat(form.gpsLat).toFixed(5)}, {parseFloat(form.gpsLng).toFixed(5)}
              {gpsFromPhoto && <span className="ml-1 opacity-60">(จากรูปถ่าย)</span>}
            </span>
            <button type="button" onClick={clearGPS} title="ล้าง GPS">
              <X className="w-3 h-3" style={{ color: '#0d9068' }} />
            </button>
          </div>
        )}

      </div>

      {/* ── Actions ── */}
      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary text-sm">ยกเลิก</button>
        <div className="flex gap-2">
          <button type="button" onClick={() => onSave(buildData(), false)} disabled={saving}
            className="btn-secondary text-sm flex items-center gap-1.5">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            บันทึกร่าง
          </button>
          <button type="button" onClick={() => onSave(buildData(), true)}
            disabled={saving || !form.logDate || !form.workTypeId || !form.title.trim()}
            className="btn-primary text-sm flex items-center gap-1.5">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? 'บันทึก+ส่งอนุมัติ' : 'บันทึก+ส่งอนุมัติ'}
          </button>
        </div>
      </div>

    </div>
  );
}
