'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Users, Layers, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import CertTabBar from '@/components/certificate/CertTabBar';

interface Project { id: number; name: string; templateUrl: string; certCount: number }

export default function CertProjectsPage() {
  const [items, setItems]     = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    api.get<{ data: Project[] }>('/certificate/projects')
      .then((r) => setItems(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get<{ data: { isCertAdmin: boolean } }>('/certificate/me').then((r) => setIsAdmin(r.data.isCertAdmin)).catch(() => {});
  }, []);

  const remove = async (p: Project) => {
    if (!confirm(`ลบรูปแบบ "${p.name}"?\n(เกียรติบัตรทั้งหมดในรูปแบบนี้จะถูกลบด้วย)`)) return;
    setDeleting(p.id);
    try { await api.delete(`/certificate/projects/${p.id}`); load(); }
    catch (e) { alert((e as Error).message); }
    finally { setDeleting(null); }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Layers size={20} style={{ color: '#c2410c' }} /> รูปแบบเกียรติบัตร</h1>
        {isAdmin && (
          <Link href="/certificate/projects/new" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            <Plus size={16} /> สร้างรูปแบบใหม่
          </Link>
        )}
      </div>

      <CertTabBar />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1,2,3].map((i) => <div key={i} className="skeleton h-64 rounded-2xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
          <Layers size={40} className="mx-auto mb-3 text-slate-300" />
          <p>ยังไม่มีรูปแบบเกียรติบัตร{isAdmin ? ' — กด "สร้างรูปแบบใหม่"' : ' ที่คุณเข้าถึงได้'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {items.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col group">
              <div className="h-44 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.templateUrl} alt={p.name} className="w-full h-full group-hover:scale-105 transition duration-500" style={{ objectFit: 'fill' }} />
                {isAdmin && (
                  <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                    <Link href={`/certificate/projects/${p.id}`} className="bg-white text-blue-600 w-9 h-9 rounded-full shadow flex items-center justify-center hover:bg-blue-50" title="แก้ไข"><Pencil size={15} /></Link>
                    <button onClick={() => remove(p)} disabled={deleting === p.id} className="bg-white text-red-600 w-9 h-9 rounded-full shadow flex items-center justify-center hover:bg-red-50" title="ลบ">
                      {deleting === p.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-slate-100 flex-grow">
                <h3 className="font-bold text-slate-800 line-clamp-2 mb-1">{p.name}</h3>
                <p className="text-sm text-slate-500 flex items-center gap-1.5"><Users size={13} /> ออกแล้ว {p.certCount} ใบ</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
