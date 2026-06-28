'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const MONTHS_FULL  = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const WEEK_HEADS   = ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'];

interface Props {
  value: string;            // YYYY-MM-DD (CE) — empty string = unset
  onChange: (v: string) => void;
  min?: string;             // YYYY-MM-DD (CE)
  max?: string;             // YYYY-MM-DD (CE)
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function ThaiDatePicker({
  value, onChange, min, max, placeholder = 'เลือกวันที่', className = '', disabled = false,
}: Props) {
  const today  = new Date();
  const parsed = value ? value.split('-').map(Number) : null;

  const [open, setOpen]         = useState(false);
  const [mode, setMode]         = useState<'days'|'months'>('days');
  const [viewYear, setViewYear] = useState(parsed ? parsed[0] : today.getFullYear());
  const [viewMonth, setViewMon] = useState(parsed ? parsed[1] - 1 : today.getMonth());

  const minDate = min ? (() => { const d = new Date(min + 'T00:00:00'); return d; })() : null;
  const maxDate = max ? (() => { const d = new Date(max + 'T00:00:00'); return d; })() : null;

  const firstDow  = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMon = new Date(viewYear, viewMonth + 1, 0).getDate();

  const isoOf = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  const isDisabled = (y: number, m: number, d: number) => {
    const dt = new Date(y, m, d);
    if (minDate) { const mn = new Date(minDate); mn.setHours(0,0,0,0); if (dt < mn) return true; }
    if (maxDate) { const mx = new Date(maxDate); mx.setHours(23,59,59,999); if (dt > mx) return true; }
    return false;
  };

  const displayVal = value ? (() => {
    const dt = new Date(value + 'T00:00:00');
    return `${dt.getDate()} ${MONTHS_FULL[dt.getMonth()]} ${dt.getFullYear() + 543}`;
  })() : '';

  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y-1); setViewMon(11); } else setViewMon(m => m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y+1); setViewMon(0); } else setViewMon(m => m+1); };

  const openPicker = () => {
    if (disabled) return;
    if (value) {
      const p = value.split('-').map(Number);
      setViewYear(p[0]); setViewMon(p[1] - 1);
    }
    setMode('days');
    setOpen(true);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        className="input-field w-full text-left flex items-center gap-2"
        style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}
      >
        <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#94a3b8' }} />
        <span style={{ color: value ? '#1a2744' : '#94a3b8' }}>{displayVal || placeholder}</span>
        {value && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="ml-auto text-xs"
            style={{ color: '#94a3b8' }}
          >✕</button>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute z-50 top-full mt-1 left-0 rounded-2xl shadow-xl overflow-hidden"
            style={{ backgroundColor: '#fff', border: '1px solid #dce6f9', width: 280 }}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: '1px solid #f0f4ff' }}>
              <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[#f5f8ff]">
                <ChevronLeft className="w-4 h-4" style={{ color: '#4a6080' }} />
              </button>
              <button
                type="button"
                onClick={() => setMode(m => m === 'months' ? 'days' : 'months')}
                className="text-sm font-semibold px-2 py-1 rounded-lg hover:bg-[#f5f8ff] flex items-center gap-1"
                style={{ color: '#1a2744' }}
              >
                {MONTHS_FULL[viewMonth]} {viewYear + 543}
                <ChevronRight className="w-3 h-3 rotate-90" style={{ color: '#94a3b8' }} />
              </button>
              <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[#f5f8ff]">
                <ChevronRight className="w-4 h-4" style={{ color: '#4a6080' }} />
              </button>
            </div>

            {/* ── Month/Year picker ── */}
            {mode === 'months' && (
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <button type="button" onClick={() => setViewYear(y => y-1)} className="p-1.5 rounded-lg hover:bg-[#f5f8ff]">
                    <ChevronLeft className="w-3.5 h-3.5" style={{ color: '#4a6080' }} />
                  </button>
                  <span className="text-sm font-bold" style={{ color: '#1a2744' }}>{viewYear + 543}</span>
                  <button type="button" onClick={() => setViewYear(y => y+1)} className="p-1.5 rounded-lg hover:bg-[#f5f8ff]">
                    <ChevronRight className="w-3.5 h-3.5" style={{ color: '#4a6080' }} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {MONTHS_SHORT.map((m, i) => (
                    <button key={i} type="button" onClick={() => { setViewMon(i); setMode('days'); }}
                      className="py-2 rounded-xl text-xs font-medium transition-colors"
                      style={viewMonth === i
                        ? { backgroundColor: '#1d6ae5', color: '#fff' }
                        : { color: '#4a6080', backgroundColor: '#f5f8ff' }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Day grid ── */}
            {mode === 'days' && (
              <div className="p-3">
                <div className="grid grid-cols-7 mb-1">
                  {WEEK_HEADS.map(d => (
                    <div key={d} className="text-center text-[11px] font-medium py-0.5"
                      style={{ color: d === 'อา.' ? '#dc2626' : d === 'ส.' ? '#1d6ae5' : '#94a3b8' }}>
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
                  {Array.from({ length: daysInMon }, (_, i) => i + 1).map(d => {
                    const iso   = isoOf(viewYear, viewMonth, d);
                    const isSel = iso === value;
                    const isTdy = d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                    const dis   = isDisabled(viewYear, viewMonth, d);
                    const dow   = new Date(viewYear, viewMonth, d).getDay();
                    return (
                      <button key={d} type="button" disabled={dis}
                        onClick={() => { onChange(iso); setOpen(false); }}
                        className="w-full aspect-square rounded-full text-xs font-medium transition-colors flex items-center justify-center"
                        style={
                          isSel ? { backgroundColor: '#1d6ae5', color: '#fff' } :
                          isTdy ? { backgroundColor: '#e8f0fe', color: '#1d6ae5', fontWeight: 700 } :
                          dis   ? { color: '#cbd5e1', cursor: 'not-allowed' } :
                                  { color: dow === 0 ? '#dc2626' : dow === 6 ? '#1d6ae5' : '#1a2744' }
                        }>
                        {d}
                      </button>
                    );
                  })}
                </div>
                {/* Today shortcut */}
                <div className="flex justify-center mt-2">
                  <button type="button"
                    onClick={() => {
                      const iso = isoOf(today.getFullYear(), today.getMonth(), today.getDate());
                      if (!isDisabled(today.getFullYear(), today.getMonth(), today.getDate())) {
                        onChange(iso); setOpen(false);
                      }
                    }}
                    className="text-xs px-3 py-1 rounded-lg"
                    style={{ color: '#1d6ae5', backgroundColor: '#e8f0fe' }}>
                    วันนี้
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
