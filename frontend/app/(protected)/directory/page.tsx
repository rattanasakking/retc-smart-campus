'use client';
import { useCallback, useEffect, useState } from 'react';
import { Search, Contact, Phone, Mail, Cake, Loader2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { api } from '@/lib/api';

interface Person {
  id: number; name: string; nickname?: string | null; birthDate?: string | null;
  position?: string | null; phone?: string | null; email?: string | null; avatar?: string | null;
}

const LEGACY_POSITION: Record<string, string> = {
  director: 'ผู้อำนวยการ', deputy_director: 'รองผู้อำนวยการ',
  division_chief: 'หัวหน้าฝ่าย', work_unit_chief: 'หัวหน้างาน',
  department_chief: 'หัวหน้าแผนก', teacher: 'ครู/อาจารย์',
  specialist: 'ผู้เชี่ยวชาญ', officer: 'เจ้าหน้าที่', worker: 'พนักงาน',
};
const posLabel = (p?: string | null) => p ? (LEGACY_POSITION[p] ?? p) : '';

const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
function fmtBirth(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}
function calcAge(iso?: string | null) {
  if (!iso) return null;
  const b = new Date(iso), now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

const LIMIT = 30;

export default function DirectoryPage() {
  const [items, setItems]   = useState<Person[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (search.trim()) p.set('search', search.trim());
    api.get<{ data: Person[]; pagination?: { total: number } }>(`/personnel/directory?${p}`)
      .then((r) => { setItems(r.data ?? []); setTotal(r.pagination?.total ?? 0); })
      .catch(() => { setItems([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [page, search]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  useEffect(() => { setPage(1); }, [search]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Contact size={22} style={{ color: '#1d6ae5' }} /> ทำเนียบบุคลากร</h1>
          <p className="text-sm text-gray-500 mt-0.5">ค้นหาและติดต่อบุคลากร · ทั้งหมด {total} คน</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาชื่อ, ชื่อเล่น, ตำแหน่ง, เบอร์, อีเมล..."
          className="w-full pl-9 pr-9 py-2.5 border border-[#dce6f9] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={15} /></button>}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
          <Contact size={40} className="mx-auto mb-3 text-slate-300" />
          <p>ไม่พบบุคลากร{search ? `ที่ตรงกับ "${search}"` : ''}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((u) => {
            const age = calcAge(u.birthDate);
            const birth = fmtBirth(u.birthDate);
            return (
              <div key={u.id} className="bg-white rounded-2xl border border-[#dce6f9] p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  {u.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatar} alt={u.name} className="w-14 h-14 rounded-full object-cover flex-shrink-0" style={{ border: '1px solid #dce6f9' }} />
                  ) : (
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0" style={{ backgroundColor: '#2979ff' }}>
                      {u.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-[#1a2744] truncate">{u.name}</p>
                    {u.nickname && <p className="text-xs text-[#4a6080] truncate">({u.nickname})</p>}
                    {u.position && <p className="text-xs text-[#1d6ae5] truncate mt-0.5">{posLabel(u.position)}</p>}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs" style={{ color: '#4a6080' }}>
                  {birth && (
                    <p className="flex items-center gap-2"><Cake size={13} style={{ color: '#94a3b8' }} /> {birth}{age !== null ? ` · อายุ ${age} ปี` : ''}</p>
                  )}
                  {u.phone && (
                    <a href={`tel:${u.phone}`} className="flex items-center gap-2 hover:text-[#1d6ae5]"><Phone size={13} style={{ color: '#94a3b8' }} /> {u.phone}</a>
                  )}
                  {u.email && (
                    <a href={`mailto:${u.email}`} className="flex items-center gap-2 hover:text-[#1d6ae5] truncate"><Mail size={13} style={{ color: '#94a3b8' }} /> <span className="truncate">{u.email}</span></a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
            className="w-9 h-9 rounded-lg flex items-center justify-center border border-[#dce6f9] disabled:opacity-40 hover:bg-[#f5f8ff]"><ChevronLeft size={16} /></button>
          <span className="text-sm text-[#4a6080]">หน้า {page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="w-9 h-9 rounded-lg flex items-center justify-center border border-[#dce6f9] disabled:opacity-40 hover:bg-[#f5f8ff]"><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}
