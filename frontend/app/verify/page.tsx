'use client';
import { useEffect, useState } from 'react';
import { Search, Award, FileText, FolderOpen, Loader2 } from 'lucide-react';
import CertRender, { type CertTextSettings } from '@/components/certificate/CertRender';

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

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Prompt', sans-serif" }}>
      {/* Header */}
      <header className="text-white shadow-lg" style={{ background: 'linear-gradient(90deg,#1e3a8a,#1e40af,#312e81)' }}>
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logoretc.png" alt="โลโก้" className="w-11 h-11 object-contain bg-white/15 rounded-xl p-1" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div>
            <h1 className="text-lg md:text-xl font-bold leading-tight">ระบบเกียรติบัตรออนไลน์</h1>
            <p className="text-[11px] text-blue-200 tracking-wider">วิทยาลัยเทคนิคร้อยเอ็ด</p>
          </div>
        </div>
      </header>

      {/* Hero + search */}
      <div className="relative overflow-hidden" style={{ background: '#1e3a8a' }}>
        <div className="relative max-w-3xl mx-auto px-4 py-14 text-center">
          <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-3">ค้นหา / ตรวจสอบเกียรติบัตร</h2>
          <p className="text-blue-100 mb-8">กรอกชื่อ นามสกุล เลขบัตรประชาชน หรือรหัสเกียรติบัตร</p>
          <form onSubmit={(e) => { e.preventDefault(); doSearch(keyword); }} className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 text-left">
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="กรอกคำค้นหา..." autoFocus
                className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-xl bg-slate-50 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" className="w-full py-4 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2" style={{ background: 'linear-gradient(90deg,#2563eb,#4f46e5)' }}>
              <Search size={18} /> ค้นหาเกียรติบัตร
            </button>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        {loading ? (
          <div className="text-center py-16 text-slate-400"><Loader2 size={30} className="animate-spin inline" /></div>
        ) : searched && (
          <>
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Award className="text-blue-600" size={20} /> ผลการค้นหา</h3>
              <span className="bg-blue-100 text-blue-800 font-semibold py-1 px-3 rounded-full text-sm">พบ {results.length} รายการ</span>
            </div>

            {results.length === 0 ? (
              <div className="bg-white rounded-2xl p-14 text-center shadow-sm border border-slate-100">
                <FolderOpen size={44} className="mx-auto mb-4 text-slate-300" />
                <h4 className="text-xl font-bold text-slate-700 mb-1">ไม่พบข้อมูลเกียรติบัตร</h4>
                <p className="text-slate-500">กรุณาตรวจสอบการสะกดคำ หรือลองค้นด้วยรหัสเกียรติบัตร</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {results.map((c) => (
                  <div key={c.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition border border-slate-100 overflow-hidden flex flex-col">
                    <div className="bg-slate-100">
                      {c.templateUrl && (
                        <CertRender
                          templateUrl={c.templateUrl}
                          ts={c.textSettings}
                          values={{ name: `${c.firstname} ${c.lastname}`, pos: c.position ?? '', awd: c.award ?? '', cert: c.certNo }}
                          verifyUrl={`${origin}/verify?keyword=${encodeURIComponent(c.certNo)}`}
                        />
                      )}
                    </div>
                    <div className="p-5 flex-grow flex flex-col">
                      <h4 className="font-bold text-lg text-slate-800 mb-2 line-clamp-2">{c.projectName ?? 'เกียรติบัตร'}</h4>
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-1.5 text-sm">
                        <p><span className="text-slate-400">ผู้รับ: </span><span className="font-bold text-blue-700">{c.firstname} {c.lastname}</span></p>
                        {c.position && <p><span className="text-slate-400">ตำแหน่ง: </span>{c.position}</p>}
                        {c.award && <p><span className="text-slate-400">รางวัล: </span>{c.award}</p>}
                        <p className="text-xs text-slate-400 pt-1">รหัส: {c.certNo}</p>
                      </div>
                      <a href={`/verify/print?ids=${c.id}`} target="_blank" rel="noreferrer"
                        className="mt-4 w-full bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-semibold py-3 rounded-xl transition flex justify-center items-center gap-2 border border-blue-200">
                        <FileText size={16} /> ดู / ดาวน์โหลด PDF
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <footer className="bg-slate-900 text-slate-400 py-8 text-center text-sm mt-10">
        © {new Date().getFullYear() + 543} วิทยาลัยเทคนิคร้อยเอ็ด — ระบบเกียรติบัตรออนไลน์
      </footer>
    </div>
  );
}
