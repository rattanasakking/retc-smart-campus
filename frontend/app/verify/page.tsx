'use client';
import { useEffect, useState } from 'react';
import { Search, Award, FileText, FolderOpen, Loader2, ImageDown, ShieldCheck } from 'lucide-react';
import CertRender, { type CertTextSettings } from '@/components/certificate/CertRender';
import { downloadCertImage } from '@/lib/certImage';

interface PublicCert {
  id: number; certNo: string; firstname: string; lastname: string;
  position: string | null; award: string | null; issueDate: string;
  projectName: string | null; templateUrl: string | null; textSettings: CertTextSettings;
}

export default function VerifyPage() {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<PublicCert[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [origin, setOrigin] = useState('');
  const [dl, setDl] = useState<number | null>(null);

  const doSearch = async (kw: string) => {
    if (!kw.trim()) return;
    setLoading(true); setSearched(true);
    try {
      const res = await fetch(`/api/certificate/public/search?keyword=${encodeURIComponent(kw.trim())}`);
      const json = await res.json();
      setResults(json.data ?? []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    setOrigin(window.location.origin);
    const kw = new URLSearchParams(window.location.search).get('keyword');
    if (kw) { setKeyword(kw); doSearch(kw); }
  }, []);

  const verifyUrl = (certNo: string) => `${origin}/verify?keyword=${encodeURIComponent(certNo)}`;

  const saveImage = async (c: PublicCert) => {
    if (!c.templateUrl) return;
    setDl(c.id);
    try {
      await downloadCertImage(
        `${c.certNo}_${c.firstname}${c.lastname}`, c.templateUrl, c.textSettings,
        { name: `${c.firstname} ${c.lastname}`, pos: c.position ?? '', awd: c.award ?? '', cert: c.certNo },
        verifyUrl(c.certNo),
      );
    } catch (e) { alert('ดาวน์โหลดรูปภาพไม่สำเร็จ: ' + (e as Error).message); }
    finally { setDl(null); }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f8ff', fontFamily: "'Prompt','Sarabun',sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ backgroundColor: '#0f1e3c' }}>
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logoretc.png" alt="โลโก้" className="w-10 h-10 object-contain rounded-lg p-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold text-white leading-tight truncate">ระบบเกียรติบัตรออนไลน์</h1>
            <p className="text-[11px] tracking-wider truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>วิทยาลัยเทคนิคร้อยเอ็ด</p>
          </div>
        </div>
      </header>

      {/* Hero + search */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#0f1e3c 0%,#1a2f5c 55%,#2979ff 140%)' }}>
        <div aria-hidden className="absolute -top-24 -right-16 w-72 h-72 rounded-full" style={{ background: 'rgba(41,121,255,0.25)', filter: 'blur(20px)' }} />
        <div className="relative max-w-3xl mx-auto px-4 py-14 sm:py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-5" style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: '#cfe0ff' }}>
            <ShieldCheck size={14} /> ตรวจสอบความถูกต้องของเกียรติบัตร
          </div>
          <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-3">ค้นหา / ตรวจสอบเกียรติบัตร</h2>
          <p className="mb-8 text-sm md:text-base" style={{ color: 'rgba(255,255,255,0.72)' }}>กรอกชื่อ นามสกุล เลขบัตรประชาชน หรือรหัสเกียรติบัตร</p>

          <form onSubmit={(e) => { e.preventDefault(); doSearch(keyword); }}
            className="bg-white rounded-2xl shadow-2xl p-2.5 sm:p-3 flex flex-col sm:flex-row gap-2.5"
            style={{ boxShadow: '0 20px 50px -12px rgba(15,30,60,0.45)' }}>
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={18} style={{ color: '#94a3b8' }} />
              <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="กรอกคำค้นหา..." autoFocus
                className="w-full pl-12 pr-4 py-3.5 rounded-xl text-base focus:outline-none"
                style={{ backgroundColor: '#f5f8ff', color: '#1a2744' }} />
            </div>
            <button type="submit" className="py-3.5 px-7 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5" style={{ backgroundColor: '#2979ff' }}>
              <Search size={18} /> ค้นหา
            </button>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        {loading ? (
          <div className="text-center py-16" style={{ color: '#94a3b8' }}><Loader2 size={30} className="animate-spin inline" /></div>
        ) : searched && (
          <>
            <div className="flex items-center justify-between mb-6 pb-3" style={{ borderBottom: '1px solid #dce6f9' }}>
              <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: '#1a2744' }}><Award size={20} style={{ color: '#2979ff' }} /> ผลการค้นหา</h3>
              <span className="font-semibold py-1 px-3 rounded-full text-sm" style={{ backgroundColor: '#e8f0fe', color: '#1d6ae5' }}>พบ {results.length} รายการ</span>
            </div>

            {results.length === 0 ? (
              <div className="bg-white rounded-2xl p-14 text-center" style={{ border: '1px solid #dce6f9' }}>
                <FolderOpen size={44} className="mx-auto mb-4" style={{ color: '#cbd5e1' }} />
                <h4 className="text-xl font-bold mb-1" style={{ color: '#1a2744' }}>ไม่พบข้อมูลเกียรติบัตร</h4>
                <p style={{ color: '#4a6080' }}>กรุณาตรวจสอบการสะกดคำ หรือลองค้นด้วยรหัสเกียรติบัตร</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {results.map((c) => (
                  <div key={c.id} className="bg-white rounded-2xl overflow-hidden flex flex-col transition-shadow hover:shadow-xl" style={{ border: '1px solid #dce6f9' }}>
                    <div style={{ backgroundColor: '#eef2fb' }}>
                      {c.templateUrl && (
                        <CertRender
                          templateUrl={c.templateUrl}
                          ts={c.textSettings}
                          values={{ name: `${c.firstname} ${c.lastname}`, pos: c.position ?? '', awd: c.award ?? '', cert: c.certNo }}
                          verifyUrl={verifyUrl(c.certNo)}
                        />
                      )}
                    </div>
                    <div className="p-5 flex-grow flex flex-col">
                      <h4 className="font-bold text-lg mb-2 line-clamp-2" style={{ color: '#1a2744' }}>{c.projectName ?? 'เกียรติบัตร'}</h4>
                      <div className="rounded-xl p-4 space-y-1.5 text-sm" style={{ backgroundColor: '#f5f8ff', border: '1px solid #eef2fb' }}>
                        <p><span style={{ color: '#94a3b8' }}>ผู้รับ: </span><span className="font-bold" style={{ color: '#1d6ae5' }}>{c.firstname} {c.lastname}</span></p>
                        {c.position && <p><span style={{ color: '#94a3b8' }}>ตำแหน่ง: </span><span style={{ color: '#1a2744' }}>{c.position}</span></p>}
                        {c.award && <p><span style={{ color: '#94a3b8' }}>รางวัล: </span><span style={{ color: '#1a2744' }}>{c.award}</span></p>}
                        <p className="text-xs pt-1" style={{ color: '#94a3b8' }}>รหัส: {c.certNo}</p>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <a href={`/verify/print?ids=${c.id}`} target="_blank" rel="noreferrer"
                          className="w-full font-semibold py-2.5 rounded-xl transition flex justify-center items-center gap-1.5"
                          style={{ backgroundColor: '#e8f0fe', color: '#1d6ae5' }}>
                          <FileText size={15} /> PDF
                        </a>
                        <button onClick={() => saveImage(c)} disabled={dl === c.id}
                          className="w-full font-semibold py-2.5 rounded-xl transition flex justify-center items-center gap-1.5 text-white disabled:opacity-60"
                          style={{ backgroundColor: '#2979ff' }}>
                          {dl === c.id ? <Loader2 size={15} className="animate-spin" /> : <ImageDown size={15} />} รูปภาพ
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <footer className="text-center text-sm py-8 mt-6" style={{ color: '#94a3b8' }}>
        © {new Date().getFullYear() + 543} วิทยาลัยเทคนิคร้อยเอ็ด — ระบบเกียรติบัตรออนไลน์
      </footer>
    </div>
  );
}
