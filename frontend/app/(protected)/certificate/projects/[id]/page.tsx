'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Upload, Save, Loader2, ImageIcon, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { CERT_FONTS, DEFAULT_TS, qrUrl, qrFallbackUrl, type CertTextSettings, type CertValues } from '@/components/certificate/CertRender';

interface Candidate { id: number; name: string; email: string; department: string | null; role: string }

const SAMPLE: CertValues = {
  name: 'นายสมชาย ตัวอย่างดี',
  pos:  'ตำแหน่ง วิทยาจารย์',
  awd:  'ได้รับรางวัลชนะเลิศอันดับ 1',
  cert: 'ตัวอย่าง 001/2569',
};

const ELEMENTS = [
  { key: 'name', label: 'ชื่อ - นามสกุล', locked: true },
  { key: 'pos',  label: 'ตำแหน่ง / สถานะ', locked: false },
  { key: 'awd',  label: 'รางวัล', locked: false },
  { key: 'cert', label: 'เลขที่เกียรติบัตร', locked: false },
] as const;

export default function CertProjectEditor() {
  const params = useParams();
  const router = useRouter();
  const idParam = String(params.id);
  const isNew = idParam === 'new';

  const [name, setName]         = useState('');
  const [ts, setTs]             = useState<CertTextSettings>(structuredClone(DEFAULT_TS));
  const [templateUrl, setTemplateUrl] = useState('');       // existing url (server)
  const [templateData, setTemplateData] = useState('');     // new base64
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [accessIds, setAccessIds] = useState<number[]>([]);
  const [loading, setLoading]   = useState(!isNew);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');

  const previewSrc = templateData || templateUrl;

  useEffect(() => {
    api.get<{ data: Candidate[] }>('/certificate/access-candidates').then((r) => setCandidates(r.data ?? [])).catch(() => {});
    if (!isNew) {
      api.get<{ data: { name: string; templateUrl: string; textSettings: CertTextSettings; accessUserIds: number[] } }>(`/certificate/projects/${idParam}`)
        .then((r) => {
          setName(r.data.name);
          setTemplateUrl(r.data.templateUrl);
          setTs({ ...structuredClone(DEFAULT_TS), ...r.data.textSettings });
          setAccessIds(r.data.accessUserIds ?? []);
        })
        .catch((e) => setErr((e as Error).message))
        .finally(() => setLoading(false));
    }
  }, [idParam, isNew]);

  const onFile = (file: File) => {
    if (!file.type.startsWith('image/')) { alert('รองรับเฉพาะไฟล์รูปภาพ'); return; }
    if (file.size > 8 * 1024 * 1024) { alert('ไฟล์ต้องไม่เกิน 8 MB'); return; }
    const reader = new FileReader();
    reader.onload = (e) => setTemplateData(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const setCfg = (key: keyof CertTextSettings, patch: Record<string, unknown>) =>
    setTs((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const save = async () => {
    if (!name.trim()) { setErr('กรุณาระบุชื่อรูปแบบ'); return; }
    if (!previewSrc)   { setErr('กรุณาอัปโหลดรูปแบบเกียรติบัตร'); return; }
    setSaving(true); setErr('');
    try {
      const body: Record<string, unknown> = { name, textSettings: ts, accessUserIds: accessIds };
      if (templateData) body.templateBase64 = templateData;
      if (isNew) await api.post('/certificate/projects', body);
      else       await api.put(`/certificate/projects/${idParam}`, body);
      router.push('/certificate/projects');
    } catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  };

  const toggleAccess = (uid: number) =>
    setAccessIds((prev) => prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]);

  if (loading) return <div className="p-6"><div className="skeleton h-[600px] rounded-2xl" /></div>;

  const inp = 'w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400';

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.push('/certificate/projects')} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft size={16} /> กลับ
        </button>
        <h1 className="text-lg font-bold text-slate-800">{isNew ? 'สร้างรูปแบบเกียรติบัตร' : 'แก้ไขรูปแบบเกียรติบัตร'}</h1>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} บันทึก
        </button>
      </div>

      {err && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">{err}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* ── Config panel ── */}
        <div className="xl:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">ชื่อรูปแบบ / โครงการ</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inp} placeholder="เช่น เกียรติบัตรอบรมเชิงปฏิบัติการ..." />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">รูปพื้นหลัง (JPG/PNG)</label>
              <label className="flex items-center gap-2 border-2 border-dashed border-slate-300 rounded-lg p-3 cursor-pointer hover:bg-slate-50 text-sm text-slate-500">
                <Upload size={16} className="text-blue-500" />
                <span>{previewSrc ? 'เปลี่ยนรูปพื้นหลัง' : 'อัปโหลดรูปพื้นหลัง'}</span>
                <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              </label>
            </div>
          </div>

          {/* element configs */}
          {ELEMENTS.map(({ key, label, locked }) => {
            const cfg = ts[key];
            return (
              <div key={key} className="bg-white border border-slate-200 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <h5 className="font-bold text-sm text-slate-700">{label}</h5>
                  {locked ? (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">แสดงเสมอ</span>
                  ) : (
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-600">
                      <input type="checkbox" checked={cfg.show} onChange={(e) => setCfg(key, { show: e.target.checked })} className="w-3.5 h-3.5 accent-blue-600" /> แสดง
                    </label>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <NumBox label="X (%)" value={cfg.x} step={0.1} onChange={(v) => setCfg(key, { x: v })} />
                  <NumBox label="Y (%)" value={cfg.y} step={0.1} onChange={(v) => setCfg(key, { y: v })} />
                  <NumBox label="ขนาด" value={cfg.fontSize} step={1} onChange={(v) => setCfg(key, { fontSize: v })} />
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">สี</label>
                    <input type="color" value={cfg.color} onChange={(e) => setCfg(key, { color: e.target.value })} className="w-full border border-slate-200 rounded h-[34px] p-0 cursor-pointer" />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">ฟอนต์</label>
                    <select value={cfg.font} onChange={(e) => setCfg(key, { font: e.target.value })} className="w-full border border-slate-200 rounded p-1.5 text-xs bg-slate-50">
                      {CERT_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}

          {/* QR */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <h5 className="font-bold text-sm text-slate-700">QR Code ตรวจสอบออนไลน์</h5>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-600">
                <input type="checkbox" checked={ts.qr.show} onChange={(e) => setCfg('qr', { show: e.target.checked })} className="w-3.5 h-3.5 accent-blue-600" /> แสดง
              </label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <NumBox label="X (%)" value={ts.qr.x} step={0.1} onChange={(v) => setCfg('qr', { x: v })} />
              <NumBox label="Y (%)" value={ts.qr.y} step={0.1} onChange={(v) => setCfg('qr', { y: v })} />
              <NumBox label="ขนาด(px)" value={ts.qr.size} step={1} onChange={(v) => setCfg('qr', { size: v })} />
            </div>
          </div>

          {/* Access control */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5">
            <h5 className="font-bold text-sm text-slate-700 mb-1 flex items-center gap-1.5"><Users size={14} /> สิทธิ์เข้าถึงโครงการ (เจ้าหน้าที่)</h5>
            <p className="text-xs text-slate-400 mb-3">ผู้ดูแลระบบเข้าถึงได้ทุกโครงการอยู่แล้ว — เลือกเฉพาะเจ้าหน้าที่ที่ต้องการให้เข้าถึงโครงการนี้</p>
            <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-50">
              {candidates.length === 0 && <p className="text-xs text-slate-400 text-center py-4">ไม่มีรายชื่อ</p>}
              {candidates.map((u) => (
                <label key={u.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm">
                  <input type="checkbox" checked={accessIds.includes(u.id)} onChange={() => toggleAccess(u.id)} className="w-4 h-4 accent-blue-600" />
                  <span className="flex-1 min-w-0 truncate text-slate-700">{u.name}</span>
                  <span className="text-xs text-slate-400 truncate">{u.department ?? ''}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ── Preview (draggable) ── */}
        <div className="xl:col-span-7">
          <div className="sticky top-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-3">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <ImageIcon size={12} /> ตัวอย่าง — ลากข้อความเพื่อจัดตำแหน่ง
              </p>
              <DragPreview src={previewSrc} ts={ts} onMove={(k, x, y) => setCfg(k, { x, y })} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NumBox({ label, value, step, onChange }: { label: string; value: number; step: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-[10px] text-slate-500 font-bold block mb-1">{label}</label>
      <input type="number" step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full border border-slate-200 rounded p-1.5 text-sm text-center bg-slate-50" />
    </div>
  );
}

// ── Interactive draggable preview ──────────────────────────────────────────
function DragPreview({ src, ts, onMove }: { src: string; ts: CertTextSettings; onMove: (key: keyof CertTextSettings, x: number, y: number) => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [base, setBase]   = useState({ w: 1122, h: 793 });
  const [scale, setScale] = useState(0.5);
  const dragRef = useRef<keyof CertTextSettings | null>(null);

  useEffect(() => {
    if (!src) return;
    const img = new window.Image();
    img.onload = () => {
      if (!img.width) return;
      const ratio = img.height / img.width;
      if (ratio < 1) setBase({ w: 1122, h: Math.round(1122 * ratio) });
      else setBase({ w: Math.round(1122 / ratio), h: 1122 });
    };
    img.src = src;
  }, [src]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / base.w);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [base.w]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    const key = dragRef.current;
    const el = boxRef.current;
    if (!key || !el) return;
    const rect = el.getBoundingClientRect();
    let x = ((clientX - rect.left) / rect.width) * 100;
    let y = ((clientY - rect.top) / rect.height) * 100;
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));
    onMove(key, Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  }, [onMove]);

  useEffect(() => {
    const mm = (e: MouseEvent) => { if (dragRef.current) { e.preventDefault(); handleMove(e.clientX, e.clientY); } };
    const tm = (e: TouchEvent) => { if (dragRef.current) { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); } };
    const up = () => { dragRef.current = null; };
    window.addEventListener('mousemove', mm);
    window.addEventListener('touchmove', tm, { passive: false });
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', mm);
      window.removeEventListener('touchmove', tm);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchend', up);
    };
  }, [handleMove]);

  if (!src) {
    return (
      <div className="aspect-[1.414] bg-slate-100 rounded-lg flex flex-col items-center justify-center text-slate-400">
        <ImageIcon size={40} className="mb-2 opacity-40" />
        <p className="text-sm font-bold">อัปโหลดรูปพื้นหลังเพื่อดูตัวอย่าง</p>
      </div>
    );
  }

  const startDrag = (key: keyof CertTextSettings) => (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    dragRef.current = key;
  };

  return (
    <div ref={boxRef} className="relative w-full select-none touch-none rounded-lg overflow-hidden border border-slate-200"
         style={{ height: base.h * scale, backgroundImage: `url('${src}')`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundColor: '#fff' }}>
      {ELEMENTS.map(({ key }) => {
        const cfg = ts[key];
        if (!cfg.show || !SAMPLE[key]) return null;
        const isName = key === 'name';
        return (
          <div key={key}
            onMouseDown={startDrag(key)} onTouchStart={startDrag(key)}
            className="absolute cursor-move whitespace-nowrap px-1 rounded hover:outline-dashed hover:outline-2 hover:outline-blue-400"
            style={{
              left: `${cfg.x}%`, top: `${cfg.y}%`, transform: 'translate(-50%, -50%)',
              fontSize: cfg.fontSize * scale, color: cfg.color, fontFamily: `'${cfg.font}', sans-serif`,
              fontWeight: isName ? 700 : 600, lineHeight: 1.2,
            }}>
            {SAMPLE[key]}
          </div>
        );
      })}
      {ts.qr.show && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrUrl('preview', ts.qr.size)}
          onError={(e) => { const t = e.currentTarget; t.onerror = null; t.src = qrFallbackUrl('preview', ts.qr.size); }}
          alt="QR" draggable={false}
          onMouseDown={startDrag('qr')} onTouchStart={startDrag('qr')}
          className="absolute cursor-move rounded hover:outline-dashed hover:outline-4 hover:outline-emerald-400 bg-white"
          style={{ left: `${ts.qr.x}%`, top: `${ts.qr.y}%`, width: ts.qr.size * scale, height: ts.qr.size * scale, transform: 'translate(-50%, -50%)', padding: 2 * scale }}
        />
      )}
    </div>
  );
}
