'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, CalendarX, AlertTriangle, Camera, Upload, X, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import ThaiDatePicker from '@/components/ui/ThaiDatePicker';

interface LeaveType {
  id: number;
  name: string;
  icon?: string;
  maxDaysPerYear?: number;
  requireDocument: boolean;
  allowHalfDay: boolean;
}

interface User { id: number; name: string }

function SubstituteSearch({
  users, value, onChange,
}: {
  users: User[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const ref               = useRef<HTMLDivElement>(null);

  const selected = users.find((u) => String(u.id) === value);
  const filtered = query
    ? users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))
    : users;

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  function select(u: User | null) {
    onChange(u ? String(u.id) : '');
    setQuery('');
    setOpen(false);
  }

  const inp = 'border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400';

  return (
    <div ref={ref} className="relative">
      {selected && !open ? (
        <div className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm bg-white cursor-pointer"
          onClick={() => { setQuery(''); setOpen(true); }}>
          <span className="flex-1 text-gray-800">{selected.name}</span>
          <button type="button" onClick={(e) => { e.stopPropagation(); select(null); }}
            className="text-gray-400 hover:text-red-500">
            <X size={14} />
          </button>
        </div>
      ) : (
        <input
          className={inp}
          placeholder="พิมพ์ชื่อเพื่อค้นหา..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
      )}

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          <button
            type="button"
            onClick={() => select(null)}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-50 border-b border-gray-100">
            -- ไม่ระบุ --
          </button>
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">ไม่พบชื่อที่ค้นหา</div>
          ) : (
            filtered.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => select(u)}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700">
                {u.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function LeaveNewPage() {
  const router = useRouter();
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [leaveTypes, setLeaveTypes]     = useState<LeaveType[]>([]);
  const [substitutes, setSubstitutes]   = useState<User[]>([]);
  const [selectedType, setSelectedType] = useState<LeaveType | null>(null);

  const [form, setForm] = useState({
    leaveTypeId:  '',
    startDate:    '',   // YYYY-MM-DD (CE)
    endDate:      '',   // YYYY-MM-DD (CE)
    isHalfDay:    false,
    halfDayPeriod: 'เช้า',
    reason:       '',
    substituteId: '',
  });
  const [attachment, setAttachment] = useState<string | null>(null);
  const [attachPreview, setPreview] = useState<string | null>(null);
  const [attachName, setAttachName] = useState('');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [workdays, setWorkdays]     = useState<number | null>(null);

  useEffect(() => {
    api.get<any>('/personnel/leave-types').then((r) => setLeaveTypes(r.data ?? []));
    api.get<any>('/personnel?limit=200&isActive=true').then((r) => setSubstitutes(r.data ?? []));
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
    setForm((p) => ({ ...p, [k]: v }));
    if (k === 'leaveTypeId') {
      const lt = leaveTypes.find((t) => t.id === parseInt(v as string));
      setSelectedType(lt ?? null);
    }
  }

  function handleFile(file: File) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('ไฟล์ต้องมีขนาดไม่เกิน 10MB'); return; }
    setAttachName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setAttachment(base64);
      setPreview(file.type.startsWith('image/') ? base64 : null);
    };
    reader.readAsDataURL(file);
  }

  function clearAttachment() {
    setAttachment(null); setPreview(null); setAttachName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }

  async function submit() {
    if (!form.leaveTypeId || !form.startDate || !form.reason.trim()) {
      setError('กรุณากรอกข้อมูลให้ครบ: ประเภทการลา, วันที่เริ่ม, เหตุผล'); return;
    }
    if (!form.isHalfDay && !form.endDate) { setError('กรุณาเลือกวันสิ้นสุด'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/personnel/leaves', {
        leaveTypeId:   parseInt(form.leaveTypeId),
        startDate:     form.startDate,
        endDate:       form.isHalfDay ? form.startDate : form.endDate,
        isHalfDay:     form.isHalfDay,
        halfDayPeriod: form.isHalfDay ? form.halfDayPeriod : 'เต็มวัน',
        reason:        form.reason.trim(),
        substituteId:  form.substituteId ? parseInt(form.substituteId) : undefined,
        attachments:   attachment || undefined,
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

        {/* ประเภทการลา */}
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

        {/* ครึ่งวัน */}
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

        {/* วันที่ */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              {form.isHalfDay ? 'วันที่' : 'วันที่เริ่ม'} <span className="text-red-500">*</span>
            </label>
            <ThaiDatePicker value={form.startDate} onChange={(v) => setF('startDate', v)} />
          </div>
          {!form.isHalfDay && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">วันที่สิ้นสุด <span className="text-red-500">*</span></label>
              <ThaiDatePicker value={form.endDate} min={form.startDate} onChange={(v) => setF('endDate', v)} />
            </div>
          )}
        </div>

        {/* จำนวนวัน */}
        {workdays !== null && (
          <div className="bg-blue-50 text-blue-800 text-sm px-3 py-2 rounded-lg">
            จำนวนวันทำงาน: <span className="font-bold">{workdays} วัน</span>
            {form.isHalfDay && ' (ครึ่งวัน)'}
          </div>
        )}

        {/* เหตุผล */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">เหตุผลการลา <span className="text-red-500">*</span></label>
          <textarea value={form.reason} onChange={(e) => setF('reason', e.target.value)}
            rows={3} className={inp} placeholder="ระบุเหตุผลการลา..." />
        </div>

        {/* ผู้ปฏิบัติงานแทน */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">ผู้ปฏิบัติงานแทน</label>
          <SubstituteSearch
            users={substitutes}
            value={form.substituteId}
            onChange={(id) => setF('substituteId', id)}
          />
        </div>

        {/* แนบเอกสาร */}
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
              <button type="button" onClick={() => cameraInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-4 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors">
                <Camera size={18} /> ถ่ายรูป
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-4 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors">
                <Upload size={18} /> อัพโหลด
              </button>
            </div>
          )}

          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
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
