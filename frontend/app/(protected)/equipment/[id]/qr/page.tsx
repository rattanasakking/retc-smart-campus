'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Download, Printer, Loader2, QrCode } from 'lucide-react';
import { api } from '@/lib/api';

interface Equipment {
  id: number; code: string; name: string; department: string;
  category: { name: string } | null;
}

const QR_URL = (id: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=20&format=png&data=${encodeURIComponent(`https://app.retc.ac.th/equipment/${id}`)}`;

export default function QRPage() {
  const router       = useRouter();
  const { id }       = useParams<{ id: string }>();
  const [eq, setEq]  = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgLoaded, setImgLoaded] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ data: Equipment }>(`/equipment/${id}`);
      setEq(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handlePrint = () => window.print();

  const handleDownload = async () => {
    try {
      const resp = await fetch(QR_URL(id));
      const blob = await resp.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `qr-${eq?.code ?? id}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3" style={{ color: '#94a3b8' }}>
      <Loader2 className="w-6 h-6 animate-spin" /> กำลังโหลด...
    </div>
  );

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #qr-print-area { display: flex !important; }
        }
        #qr-print-area { display: none; }
      `}</style>

      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-[#f5f8ff] transition-colors">
            <ChevronLeft className="w-4 h-4" style={{ color: '#4a6080' }} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>QR Code ครุภัณฑ์</h1>
        </div>

        {/* QR Card */}
        <div className="bg-white rounded-2xl p-8 text-center" style={{ border: '1px solid #dce6f9' }}>
          <div className="flex items-center justify-center mb-6">
            {!imgLoaded && (
              <div className="w-64 h-64 flex items-center justify-center rounded-xl" style={{ backgroundColor: '#f5f8ff' }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#1d6ae5' }} />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={QR_URL(id)}
              alt="QR Code"
              className={`w-64 h-64 rounded-xl ${imgLoaded ? '' : 'hidden'}`}
              onLoad={() => setImgLoaded(true)}
              style={{ border: '1px solid #dce6f9' }}
            />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono mb-2"
              style={{ backgroundColor: '#e8f0fe', color: '#1d6ae5' }}>
              <QrCode className="w-3 h-3" />
              {eq?.code ?? id}
            </div>
            <p className="text-base font-semibold" style={{ color: '#1a2744' }}>{eq?.name}</p>
            <p className="text-sm" style={{ color: '#4a6080' }}>
              {eq?.category?.name ?? ''}{eq?.department ? ` · ${eq.department}` : ''}
            </p>
            <p className="text-xs mt-2" style={{ color: '#94a3b8' }}>
              สแกนเพื่อดูรายละเอียดครุภัณฑ์
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button onClick={handlePrint} className="flex-1 btn-secondary flex items-center justify-center gap-2">
            <Printer className="w-4 h-4" /> พิมพ์
          </button>
          <button onClick={handleDownload} className="flex-1 btn-primary flex items-center justify-center gap-2">
            <Download className="w-4 h-4" /> ดาวน์โหลด PNG
          </button>
        </div>

        <p className="text-center text-xs" style={{ color: '#94a3b8' }}>
          QR จะ link ไปยัง: https://app.retc.ac.th/equipment/{id}
        </p>
      </div>

      {/* Print-only area */}
      <div id="qr-print-area" ref={printRef}
        style={{ position: 'fixed', inset: 0, background: '#fff', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={QR_URL(id)} alt="QR Code" style={{ width: 300, height: 300 }} />
        <p style={{ fontFamily: 'sans-serif', fontSize: 20, fontWeight: 700, marginTop: 16, color: '#0f1e3c' }}>{eq?.name}</p>
        <p style={{ fontFamily: 'monospace', fontSize: 14, marginTop: 4, color: '#1d6ae5' }}>{eq?.code}</p>
        <p style={{ fontFamily: 'sans-serif', fontSize: 12, marginTop: 4, color: '#4a6080' }}>{eq?.department}</p>
      </div>
    </>
  );
}
