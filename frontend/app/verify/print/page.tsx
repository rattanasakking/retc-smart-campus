'use client';
import { useEffect, useState } from 'react';
import { Printer, X, Loader2 } from 'lucide-react';
import CertRender, { type CertTextSettings } from '@/components/certificate/CertRender';

interface PublicCert {
  id: number; certNo: string; firstname: string; lastname: string;
  position: string | null; award: string | null;
  projectName: string | null; templateUrl: string | null; textSettings: CertTextSettings;
}

export default function CertPrintPage() {
  const [certs, setCerts]   = useState<PublicCert[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState('');

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
          .cert-page { margin: 0 !important; box-shadow: none !important; page-break-after: always; max-width: none !important; width: 100% !important; }
        }
        @page { size: auto; margin: 0; }
      `}</style>

      <div className="print-toolbar sticky top-0 z-50 flex items-center justify-between px-5 py-3 text-white shadow-lg" style={{ background: '#1e293b' }}>
        <div className="text-sm">
          <span className="font-bold">🖨️ พิมพ์เกียรติบัตร</span>
          <span className="ml-3 text-slate-300">จำนวน {certs.length} ใบ</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-lg font-bold text-sm">พิมพ์ / บันทึก PDF</button>
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
