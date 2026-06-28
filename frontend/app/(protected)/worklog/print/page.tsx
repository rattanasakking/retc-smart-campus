'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Printer, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Approval { approver: { name: string; position: string } }
interface LogItem {
  id: number; logDate: string; title: string; detail: string | null; status: string;
  workType: { name: string; color: string; category: string } | null;
  approvals: Approval[];
}
interface UserInfo {
  name: string; position: string | null; employeeId: string | null; nationalId: string | null;
  division:      { name: string } | null;
  workUnit:      { name: string } | null;
  deptGroup:     { name: string } | null;
  personnelType: { name: string } | null;
}
interface PdfData { user: UserInfo; logs: LogItem[]; month: number; year: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.getDate()} ${MONTHS_SHORT[dt.getMonth()]} ${dt.getFullYear() + 543}`;
}

const STATUS_TH: Record<string, string> = {
  draft: 'ร่าง', submitted: 'รออนุมัติ', approved: 'อนุมัติแล้ว',
  rejected: 'ปฏิเสธ', returned: 'ส่งคืน',
};

const LEGACY_POS: Record<string, string> = {
  director: 'ผู้อำนวยการ', deputy_director: 'รองผู้อำนวยการ',
  division_chief: 'หัวหน้าฝ่าย', work_unit_chief: 'หัวหน้างาน',
  department_chief: 'หัวหน้าแผนก', teacher: 'ครู/อาจารย์',
  specialist: 'ผู้เชี่ยวชาญ', officer: 'เจ้าหน้าที่', worker: 'พนักงาน',
};
const posLabel = (p: string | null | undefined) => (!p ? '' : (LEGACY_POS[p] ?? p));

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function WorklogPdfPage() {
  const router = useRouter();
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear]   = useState(String(now.getFullYear() + 543));
  const [data, setData]   = useState<PdfData | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [logoUrl, setLogoUrl]       = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/settings/logo').then(r => r.json()).then(r => {
      if (r.success) { setSchoolName(r.data?.school_name ?? ''); setLogoUrl(r.data?.logo_url ?? ''); }
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setApiError('');
    try {
      const r = await api.get<{ data: PdfData }>(`/worklog/my-pdf?month=${month}&year=${year}`);
      setData(r.data);
    } catch (e) { setData(null); setApiError((e as Error).message || 'โหลดข้อมูลไม่สำเร็จ'); }
    finally { setLoading(false); }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const handlePrint = () => window.print();

  const YEARS = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() + 543 - i));


  return (
    <>
      {/* ── Print styles ── */}
      <style>{`
        @page { size: A4 portrait; margin: 15mm 15mm 20mm 15mm; }
        @media print {
          html, body { width: 210mm; }
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area {
            position: fixed; inset: 0;
            font-family: 'Sarabun', sans-serif;
            font-size: 10pt;
          }
          .no-print { display: none !important; }
          table { border-collapse: collapse; width: 100%; font-size: 9.5pt; }
          th, td { border: 1px solid #333; padding: 3px 5px; }
          th { background: #1a2744 !important; color: #fff !important;
               -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          tr:nth-child(even) td { background: #f8faff !important;
               -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* ── Screen controls ── */}
      <div className="no-print space-y-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/worklog')} className="p-2 rounded-xl hover:bg-[#f5f8ff] transition-colors">
            <ChevronLeft className="w-4 h-4" style={{ color: '#4a6080' }} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>สร้างรายงานการปฏิบัติงาน (PDF)</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select className="input-field text-sm py-2 w-auto" value={month} onChange={e => setMonth(e.target.value)}>
            {MONTHS_TH.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select className="input-field text-sm py-2 w-auto" value={year} onChange={e => setYear(e.target.value)}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={handlePrint} disabled={!data || data.logs.length === 0}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
            <Printer className="w-4 h-4" /> พิมพ์ / บันทึก PDF
          </button>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-sm" style={{ color: '#94a3b8' }}>
            <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลด...
          </div>
        )}
        {apiError && !loading && (
          <div className="text-sm px-4 py-3 rounded-xl" style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
            เกิดข้อผิดพลาด: {apiError}
          </div>
        )}
        {!loading && !apiError && data && data.logs.length === 0 && (
          <p className="text-sm" style={{ color: '#94a3b8' }}>ไม่มีรายการในเดือน {MONTHS_TH[parseInt(month)-1]} {year} — ลองเปลี่ยนเดือน/ปี</p>
        )}
      </div>

      {/* ── Printable area ── */}
      {data && data.logs.length > 0 && (
        <div id="print-area" ref={printRef}
          className="bg-white rounded-xl p-8 max-w-4xl"
          style={{ border: '1px solid #dce6f9', fontFamily: 'Sarabun, sans-serif' }}>

          {/* Header */}
          <div className="flex items-start gap-4 mb-6 pb-4" style={{ borderBottom: '2px solid #1a2744' }}>
            {logoUrl && <img src={logoUrl} alt="" className="w-16 h-16 object-contain flex-shrink-0" />}
            <div className="flex-1 text-center">
              {schoolName && <p className="text-base font-bold" style={{ color: '#1a2744' }}>{schoolName}</p>}
              <p className="text-lg font-bold mt-1" style={{ color: '#1a2744' }}>แบบรายงานการปฏิบัติงานประจำเดือน</p>
              <p className="text-sm mt-0.5" style={{ color: '#4a6080' }}>
                เดือน {MONTHS_TH[data.month - 1]} พ.ศ. {data.year}
              </p>
            </div>
          </div>

          {/* User info */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 mb-6 text-sm">
            <InfoRow label="ชื่อ-สกุล"       value={data.user.name} />
            <InfoRow label="เลขบัตรประชาชน" value={data.user.nationalId ?? '—'} />
            <InfoRow label="ตำแหน่ง"        value={posLabel(data.user.position)} />
            <InfoRow label="ประเภทบุคลากร"  value={data.user.personnelType?.name ?? '—'} />
            {data.user.division  && <InfoRow label="ฝ่าย"  value={data.user.division.name}  />}
            {data.user.workUnit  && <InfoRow label="งาน"   value={data.user.workUnit.name}  />}
            {data.user.deptGroup && <InfoRow label="แผนก" value={data.user.deptGroup.name} />}
          </div>


          {/* Table */}
          <table className="w-full text-sm mb-8" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#1a2744' }}>
                {['#', 'วันที่', 'หมวดหมู่', 'ประเภทงาน', 'หัวข้อ/รายละเอียด'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-white"
                    style={{ border: '1px solid #c8d8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.logs.map((l, i) => (
                <tr key={l.id} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8faff' }}>
                  <td className="px-3 py-2 text-center text-xs" style={{ border: '1px solid #dce6f9', color: '#94a3b8' }}>{i + 1}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ border: '1px solid #dce6f9', color: '#4a6080' }}>{fmtDate(l.logDate)}</td>
                  <td className="px-3 py-2 text-xs" style={{ border: '1px solid #dce6f9', color: '#4a6080' }}>{l.workType?.category ?? '—'}</td>
                  <td className="px-3 py-2 text-xs" style={{ border: '1px solid #dce6f9' }}>
                    {l.workType && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: l.workType.color + '22', color: l.workType.color }}>
                        {l.workType.name}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ border: '1px solid #dce6f9', color: '#1a2744' }}>
                    <span className="font-medium">{l.title}</span>
                    {l.detail && <span className="block text-[11px] mt-0.5" style={{ color: '#94a3b8' }}>{l.detail.slice(0, 80)}{l.detail.length > 80 ? '...' : ''}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Signature section */}
          <div className="grid grid-cols-3 gap-6 mt-8 text-sm text-center">
            <SignBox title="ผู้รายงาน" name={data.user.name} position={posLabel(data.user.position)} />
            <SignBox title="หัวหน้างาน / ผู้ตรวจ" />
            <SignBox title="ผู้บริหาร / ผู้อนุมัติ" />
          </div>

          <p className="text-xs mt-6 text-center" style={{ color: '#94a3b8' }}>
            พิมพ์เมื่อวันที่ {fmtDate(new Date().toISOString())} — ระบบ Smart Campus {schoolName}
          </p>
        </div>
      )}
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-32 flex-shrink-0 font-medium" style={{ color: '#4a6080' }}>{label}</span>
      <span style={{ color: '#1a2744' }}>: {value}</span>
    </div>
  );
}

function SignBox({ title, name, position }: { title: string; name?: string; position?: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold" style={{ color: '#4a6080' }}>{title}</p>
      <div className="h-16 rounded-lg" style={{ border: '1px dashed #c8d8f0' }} />
      <div style={{ borderTop: '1px solid #1a2744', paddingTop: 4 }}>
        <p className="text-xs font-medium" style={{ color: '#1a2744' }}>{name ?? '(......................................................)'}</p>
        {position && <p className="text-xs" style={{ color: '#94a3b8' }}>{position}</p>}
        {!position && <p className="text-xs" style={{ color: '#94a3b8' }}>ตำแหน่ง ..............................</p>}
        <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>วันที่ ...... / ...... / ......</p>
      </div>
    </div>
  );
}
