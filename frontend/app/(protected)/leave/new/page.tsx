'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, CalendarX, AlertTriangle, Camera, Upload, X, FileText } from 'lucide-react';
import { api } from '@/lib/api';

// Thai BE ↔ CE helpers
function thToIso(th: string): string {
  const m = th.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return '';
  const d = m[1].padStart(2, '0');
  const mo = m[2].padStart(2, '0');
  const y = parseInt(m[3]) - 543;
  if (y < 1900 || y > 2200) return '';
  return `${y}-${mo}-${d}`;
}

function isoToTh(iso: string): string {
  if (!iso) return '';
  const [y, mo, d] = iso.split('-');
  return `${d}/${mo}/${parseInt(y) + 543}`;
}

function validateThDate(th: string): boolean {
  if (!th) return false;
  const iso = thToIso(th);
  if (!iso) return false;
  const dt = new Date(iso);
  return !isNaN(dt.getTime());
}

interface LeaveType {
  id: number;
  name: string;
  icon?: string;
  maxDaysPerYear?: number;
  requireDocument: boolean;
  allowHalfDay: boolean;
}

interface User { id: number; name: string }

export default function LeaveNewPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [leaveTypes, setLeaveTypes]     = useState<LeaveType[]>([]);
  const [substitutes, setSubstitutes]   = useState<User[]>([]);
  const [selectedType, setSelectedType] = useState<LeaveType | null>(null);

  const [form, setForm] = useState({
    leaveTypeId: '',
    startDate: '',    // ISO YYYY-MM-DD (CE) for API
    endDate: '',      // ISO YYYY-MM-DD (CE) for API
    startDateTH: '', // display DD/MM/YYYY (BE) for user
    endDateTH: '',   // display DD/MM/YYYY (BE) for user
    isHalfDay: false,
    halfDayPeriod: 'เช้า',
    reason: '',
    substituteId: '',
  });
  const [attachment, setAttachment]     = useState<string | null>(null); // base64 or null
  const [attachPreview, setPreview]     = useState<string | null>(null); // object URL for display
  const [attachName, setAttachName]     = useState('');
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');
  const [workdays, setWorkdays]         = useState<number | null>(null);

  useEffect(() => {
    api.get<any>('/personnel/leave-types').then((r) => setLeaveTypes(r.data ?? []));
    api.get<any>('/personnel?limit=100&isActive=true').then((r) => setSubstitutes(r.data ?? []));
  }, []);

  useEffect(() => {
    if (form.isHalfDay) { setWorkdays(0.5); return; }
    if (!form.startDate || !form.endDate) { setWorkdays(null); return; }
    const start = new Date(form.startDate);
    const end   = new Date(form.endDate);
    if (end < start) { setWorkdays(0); return; }
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const d = cur.getDay();
      if (d !== 0 && d !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    setWorkdays(count);
  }, [form.startDate, form.endDate, form.isHalfDay]);

  function setF(k: keyof typeof form, v: string | boolean) {
    setForm((p) => {
      const next = { ...p, [k]: v };
      if (k === 'startDateTH') {
        next.startDate = validateThDate(v as string) ? thToIso(v as string) : '';
      }
      if (k === 'endDateTH') {
        next.endDate = validateThDate(v as string) ? thToIso(v as string) : '';
      }
      return next;
    });
    if (k === 'leaveTypeId') {
      const lt = leaveTypes.find((t) => t.id === parseInt(v as string));
      setSelectedType(lt ?? null);
    }
  }

  function handleFile(file: File) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('ไฟล์ต้องมีขนาดไม่เกิน 10MB');
      return;
    }
    setAttachName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setAttachment(base64);
      if (file.type.startsWith('image/')) {
        setPreview(base64);
      } else {
        setPreview(null); // PDF — no image preview
      }
    };
    reader.readAsDataURL(file);
  }

  function clearAttachment() {
    setAttachment(null);
    setPreview(null);
    setAttachName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }

  async function submit() {
    if (!form.leaveTypeId || !form.startDate || !form.reason.trim()) {
      setError('กรุณากรอกข้อมูลให้ครบ: ประเภทการลา, วันที่เริ่ม, เหตุผล');
      return;
    }
    if (!form.isHalfDay && !form.endDate) {
      setError('กรุณาเลือกวันสิ้นสุด');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/personnel/leaves', {
        leaveTypeId:    parseInt(form.leaveTypeId),
        startDate:      form.startDate,
        endDate:        form.isHalfDay ? form.startDate : form.endDate,
        isHalfDay:      form.isHalfDay,
        halfDayPeriod:  form.isHalfDay ? form.halfDayPeriod : 'เต็มวัน',
        reason:         form.reason.trim(),
        substituteId:   form.substituteId ? parseInt(form.substituteId) : undefined,
        attachments:    attachment || undefined,
      });
      router.push('/leave');
    } catch (e: any) {
      setError(e.message ?? 'เกิดข้อผิดพลาด');
    } finally { setSaving(false); }
  }

  const inp = 'border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400';
  const sel = `${inp} bg-white`;

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <CalendarX size={20} /> ยื่นใบลา
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow p-5 space-y-4">
        {error && (
          <div className="flex items-start gap-2 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">
            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" /> {error}
          </div>
        )}

        <div>
          <label className="text-xs text-gray-500 mb-1 block">ประเภทการลา <span className="text-red-500">*</span></label>
          <select value={form.leaveTypeId} onChange={(e) => setF('leaveTypeId', e.target.value)} className={sel}>
            <option value="">-- เลือกประเภทการลา --</option>
            {leaveTypes.map((lt) => (
              <option key={lt.id} value={lt.id}>
                {lt.icon} {lt.name}{lt.maxDaysPerYear ? ` (สูงสุด ${lt.maxDaysPerYear} วัน/ปี)` : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedType?.allowHalfDay && (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.isHalfDay}
              onChange={(e) => setF('isHalfDay', e.target.checked)} className="rounded" />
            ลาครึ่งวัน
          </label>
        )}

        {form.isHalfDay && (
          <div>
            <label className="text-xs text-gray-500 mb-1 block">ช่วงเวลา</label>
            <div className="flex gap-3">
              {['เช้า', 'บ่าย'].map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="halfDay" value={p} checked={form.halfDayPeriod === p}
                    onChange={() => setF('halfDayPeriod', p)} />
                  {p}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              {form.isHalfDay ? 'วันที่' : 'วันที่เริ่ม'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="วว/ดด/ปปปป เช่น 01/06/2569"
              maxLength={10}
              value={form.startDateTH}
              onChange={(e) => {
                let v = e.target.value.replace(/[^\d/]/g, '');
                // auto-insert slashes
                if (/^\d{2}$/.test(v) && form.startDateTH.length < 3) v += '/';
                else if (/^\d{2}\/\d{2}$/.test(v) && form.startDateTH.length < 6) v += '/';
                setF('startDateTH', v);
              }}
              className={`${inp} ${form.startDateTH && !form.startDate ? 'border-red-400' : ''}`}
            />
            {form.startDate && (
              <p className="text-[11px] text-green-600 mt-0.5">✓ {new Date(form.startDate).toLocaleDateString('th-TH', { dateStyle: 'full' })}</p>
            )}
          </div>
          {!form.isHalfDay && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">วันที่สิ้นสุด <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="วว/ดด/ปปปป เช่น 05/06/2569"
                maxLength={10}
                value={form.endDateTH}
                onChange={(e) => {
                  let v = e.target.value.replace(/[^\d/]/g, '');
                  if (/^\d{2}$/.test(v) && form.endDateTH.length < 3) v += '/';
                  else if (/^\d{2}\/\d{2}$/.test(v) && form.endDateTH.length < 6) v += '/';
                  setF('endDateTH', v);
                }}
                className={`${inp} ${form.endDateTH && !form.endDate ? 'border-red-400' : ''}`}
              />
              {form.endDate && (
                <p className="text-[11px] text-green-600 mt-0.5">✓ {new Date(form.endDate).toLocaleDateString('th-TH', { dateStyle: 'full' })}</p>
              )}
            </div>
          )}
        </div>

        {workdays !== null && (
          <div className="bg-blue-50 text-blue-800 text-sm px-3 py-2 rounded-lg">
            จำนวนวันทำงาน: <span className="font-bold">{workdays} วัน</span>
            {form.isHalfDay && ' (ครึ่งวัน)'}
          </div>
        )}

        <div>
          <label className="text-xs text-gray-500 mb-1 block">เหตุผลการลา <span className="text-red-500">*</span></label>
          <textarea value={form.reason} onChange={(e) => setF('reason', e.target.value)}
            rows={3} className={inp} placeholder="ระบุเหตุผลการลา..." />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">ผู้ปฏิบัติงานแทน</label>
          <select value={form.substituteId} onChange={(e) => setF('substituteId', e.target.value)} className={sel}>
            <option value="">-- ไม่ระบุ --</option>
            {substitutes.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        {/* ─── Attachment ──────────────────────────────────────────────────────── */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">
            แนบเอกสาร / หลักฐาน
            {selectedType?.requireDocument && (
              <span className="text-orange-500 ml-1">(ประเภทนี้ต้องแนบหลักฐาน)</span>
            )}
          </label>

          {attachment ? (
            <div className="border rounded-xl p-3 space-y-2">
              {attachPreview ? (
                <img src={attachPreview} alt="preview" className="w-full max-h-48 object-contain rounded-lg bg-gray-50" />
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-600 py-2">
                  <FileText size={20} className="text-red-500" />
                  <span className="truncate">{attachName}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 truncate flex-1 mr-2">{attachName}</span>
                <button onClick={clearAttachment} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                  <X size={12} /> ลบ
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {/* ถ่ายรูปด้วยกล้อง (mobile) */}
              <button type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-4 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors">
                <Camera size={18} /> ถ่ายรูป
              </button>
              {/* อัพโหลดไฟล์ */}
              <button type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-4 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors">
                <Upload size={18} /> อัพโหลด
              </button>
            </div>
          )}

          {/* hidden inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <p className="text-xs text-gray-400 mt-1">รองรับ: รูปภาพ (JPG, PNG) หรือ PDF ขนาดไม่เกิน 10MB</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={() => router.back()} className="flex-1 py-2.5 border rounded-lg text-sm hover:bg-gray-50">
            ยกเลิก
          </button>
          <button onClick={submit} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {saving && <Loader2 size={14} className="animate-spin" />}
            ยื่นใบลา
          </button>
        </div>
      </div>
    </div>
  );
}
