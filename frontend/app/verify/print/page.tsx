'use client';
import { useEffect, useState } from 'react';
import { Printer, X, Loader2, ImageDown, FileDown } from 'lucide-react';
import CertRender, { type CertTextSettings } from '@/components/certificate/CertRender';
import { downloadCertImage, downloadCertsPdf, type CertPdfInput } from '@/lib/certImage';

interface PublicCert {
  id: number; certNo: string; firstname: string; lastname: string;
  position: string | null; award: string | null;
  projectName: string | null; templateUrl: string | null; textSettings: CertTextSettings;
}

export default function CertPrintPage() {
  const [certs, setCerts]   = useState<PublicCert[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState('');
  const [dlAll, setDlAll]   = useState(false);
  const [dlPdf, setDlPdf]   = useState(false);

  const valuesOf = (c: PublicCert) => ({
    name: (c.firstname === '-' && c.lastname === '-') ? '(เว้นว่างรอระบุชื่อ)' : `${c.firstname} ${c.lastname}`,
    pos: c.position ?? '', awd: c.award ?? '', cert: c.certNo,
  });

  const downloadPdf = async () => {
    setDlPdf(true);
    try {
      const inputs: CertPdfInput[] = certs.filter((c) => c.templateUrl).map((c) => ({
        templateUrl: c.templateUrl as string,
        ts: c.textSettings,
        values: valuesOf(c),
        verifyUrl: `${origin}/verify?keyword=${encodeURIComponent(c.certNo)}`,
      }));
      const fname = certs.length === 1 ? `${certs[0].certNo}_${certs[0].firstname}${certs[0].lastname}` : `เกียรติบัตร_${certs.length}ใบ`;
      await downloadCertsPdf(fname, inputs);
    } catch (e) { alert('ดาวน์โหลด PDF ไม่สำเร็จ: ' + (e as Error).message); }
    finally { setDlPdf(false); }
  };

  const downloadAll = async () => {
    setDlAll(true);
    try {
      for (const c of certs) {
        if (!c.templateUrl) continue;
        await downloadCertImage(
          `${c.certNo}_${c.firstname}${c.lastname}`, c.templateUrl, c.textSettings,
          {
            name: (c.firstname === '-' && c.lastname === '-') ? '(เว้นว่างรอระบุชื่อ)' : `${c.firstname} ${c.lastname}`,
            pos: c.position ?? '', awd: c.award ?? '', cert: c.certNo,
          },
          `${origin}/verify?keyword=${encodeURIComponent(c.certNo)}`,
        );
      }
    } catch (e) { alert('ดาวน์โหลดรูปภาพไม่สำเร็จ: ' + (e as Error).message); }
    finally { setDlAll(false); }
  };

  useEffect(() => {
    setOrigin(window.location.origin);
    const ids = new URLSearchParams(window.location.search).get('ids') ?? '';
    if (!ids) { setLoading(false); return; }
    fetch(`/api/certificate/public/certs?ids=${encodeURIComponent(ids)}`)
      .then((r) => r.json())
      .then((json) => setCerts(json.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ background: '#52525b', minHeight: '100vh', fontFamily: "'Prompt', sans-serif" }}>
      <style>{`
        @media print {
          .print-toolbar { display: none !important; }
          body { background: #fff !important; }
          .print-stage { padding: 0 !important; }
          .cert-page { margin: 0 !important; box-shadow: none !important; max-width: none !important; width: 100% !important; }
          .cert-page:not(:last-child) { page-break-after: always; }
        }
        @page { size: auto; margin: 0; }
      `}</style>

      <div className="print-toolbar sticky top-0 z-50 flex items-center justify-between px-5 py-3 text-white shadow-lg" style={{ background: '#1e293b' }}>
        <div className="text-sm">
          <span className="font-bold">🖨️ พิมพ์เกียรติบัตร</span>
          <span className="ml-3 text-slate-300">จำนวน {certs.length} ใบ</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={downloadPdf} disabled={dlPdf || certs.length === 0} className="bg-rose-600 hover:bg-rose-500 disabled:opacity-60 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1.5">
            {dlPdf ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} ดาวน์โหลด PDF
          </button>
          <button onClick={downloadAll} disabled={dlAll || certs.length === 0} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1.5">
            {dlAll ? <Loader2 size={14} className="animate-spin" /> : <ImageDown size={14} />} ดาวน์โหลดรูปภาพ
          </button>
          <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-1.5"><Printer size={14} /> พิมพ์</button>
          <button onClick={() => window.close()} className="bg-slate-600 hover:bg-slate-500 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1.5"><X size={14} /> ปิด</button>
        </div>
      </div>

      <div className="print-stage py-8 px-3 flex flex-col items-center gap-6">
        {loading ? (
          <div className="text-white py-20"><Loader2 size={30} className="animate-spin" /></div>
        ) : certs.length === 0 ? (
          <div className="text-white py-20 text-center">
            <Printer size={40} className="mx-auto mb-3 opacity-50" />
            <p>ไม่พบข้อมูลเกียรติบัตรที่ต้องการพิมพ์</p>
          </div>
        ) : certs.map((c) => (
          <div key={c.id} className="cert-page bg-white shadow-2xl w-full" style={{ maxWidth: 1000 }}>
            {c.templateUrl && (
              <CertRender
                templateUrl={c.templateUrl}
                ts={c.textSettings}
                values={{
                  name: (c.firstname === '-' && c.lastname === '-') ? '(เว้นว่างรอระบุชื่อ)' : `${c.firstname} ${c.lastname}`,
                  pos: c.position ?? '', awd: c.award ?? '', cert: c.certNo,
                }}
                verifyUrl={`${origin}/verify?keyword=${encodeURIComponent(c.certNo)}`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
