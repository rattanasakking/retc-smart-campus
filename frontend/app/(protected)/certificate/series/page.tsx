'use client';
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Hash, X, Loader2, Search } from 'lucide-react';
import { api } from '@/lib/api';
import CertTabBar from '@/components/certificate/CertTabBar';

interface Project { id: number; name: string }
interface Series {
  id: number; projectId: number | null; projectName: string | null;
  prefix: string; year: string | null; startNum: number; quantity: number; lastNum: number;
  reqFirstname: string | null; reqLastname: string | null; reqDepartment: string | null;
}

interface Form {
  id: number | null; projectId: string; prefix: string; year: string;
  startNum: string; quantity: string; reqFirstname: string; reqLastname: string; reqDepartment: string;
}
const BLANK: Form = { id: null, projectId: '', prefix: '', year: '', startNum: '1', quantity: '100', reqFirstname: '', reqLastname: '', reqDepartment: '' };

interface PersonHit { id: number; name: string; department?: string | null; division?: { name: string } | null; workUnit?: { name: string } | null }

export default function CertSeriesPage() {
  const [list, setList]       = useState<Series[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState<Form>(BLANK);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  // ค้นหาบุคลากรสำหรับ "ผู้ขอ"
  const [personSearch, setPersonSearch]   = useState('');
  const [personResults, setPersonResults] = useState<PersonHit[]>([]);
  const [personOpen, setPersonOpen]       = useState(false);

  useEffect(() => {
    const kw = personSearch.trim();
    if (kw.length < 2) { setPersonResults([]); return; }
    const t = setTimeout(() => {
      api.get<{ data: PersonHit[] }>(`/personnel?search=${encodeURIComponent(kw)}&limit=8`)
        .then((r) => setPersonResults(r.data ?? []))
        .catch(() => setPersonResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [personSearch]);

  const selectPerson = (p: PersonHit) => {
    const parts = p.name.trim().split(/\s+/);
    const dept = p.workUnit?.name || p.division?.name || p.department || '';
    setForm((f) => ({ ...f, reqFirstname: parts[0] ?? '', reqLastname: parts.slice(1).join(' '), reqDepartment: dept }));
    setPersonSearch(''); setPersonResults([]); setPersonOpen(false);
  };

  const load = () => {
    setLoading(true);
    api.get<{ data: Series[] }>('/certificate/series').then((r) => setList(r.data ?? [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    api.get<{ data: Project[] }>('/certificate/projects').then((r) => setProjects(r.data ?? [])).catch(() => {});
  }, []);

  const openNew = () => { setForm(BLANK); setErr(''); setPersonSearch(''); setPersonResults([]); setModal(true); };
  const openEdit = (s: Series) => {
    setPersonSearch(''); setPersonResults([]);
    setForm({
      id: s.id, projectId: String(s.projectId ?? ''), prefix: s.prefix, year: s.year ?? '',
      startNum: String(s.startNum), quantity: String(s.quantity),
      reqFirstname: s.reqFirstname ?? '', reqLastname: s.reqLastname ?? '', reqDepartment: s.reqDepartment ?? '',
    });
    setErr(''); setModal(true);
  };

  const save = async () => {
    if (!form.projectId || !form.prefix.trim()) { setErr('กรุณาเลือกโครงการและระบุคำนำหน้ารหัส'); return; }
    setSaving(true); setErr('');
    try {
      const body = { ...form };
      if (form.id) await api.put(`/certificate/series/${form.id}`, body);
      else await api.post('/certificate/series', body);
      setModal(false); load();
    } catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  };

  const remove = async (s: Series) => {
    if (!confirm('การลบชุดนี้จะลบเฉพาะระเบียบ ไม่กระทบเกียรติบัตรที่ออกไปแล้ว ยืนยันหรือไม่?')) return;
    try { await api.delete(`/certificate/series/${s.id}`); load(); } catch (e) { alert((e as Error).message); }
  };

  const setF = (k: keyof Form, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const inp = 'w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400';

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Hash size={20} style={{ color: '#c2410c' }} /> เลขชุดเกียรติบัตร</h1>
          <p className="text-sm text-gray-500 mt-0.5">กำหนดชุดเลขที่รันอัตโนมัติสำหรับการออกเกียรติบัตร</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"><Plus size={16} /> สร้างชุดใหม่</button>
      </div>

      <CertTabBar />

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-4">โครงการ</th><th className="px-6 py-4">ผู้ขอ</th>
                <th className="px-6 py-4">รูปแบบรหัส</th><th className="px-6 py-4 text-center">เริ่มที่</th>
                <th className="px-6 py-4 text-center">จำนวน (ใบ)</th><th className="px-6 py-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400"><Loader2 className="animate-spin inline" /></td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-500">ยังไม่มีชุดเลข</td></tr>
              ) : list.map((s) => {
                const full = s.lastNum >= s.quantity;
                return (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-700">{s.projectName ?? 'ไม่มีโครงการ'}</td>
                    <td className="px-6 py-4">
                      {(s.reqFirstname || s.reqLastname) ? (
                        <><div className="font-bold text-slate-700">{s.reqFirstname} {s.reqLastname}</div><div className="text-xs text-slate-500">{s.reqDepartment}</div></>
                      ) : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="px-6 py-4"><span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md font-mono text-xs">{s.prefix}<span className="text-blue-400">###</span>{s.year}</span></td>
                    <td className="px-6 py-4 text-center font-bold text-slate-600">{s.startNum}</td>
                    <td className={`px-6 py-4 text-center font-bold ${full ? 'text-red-500' : 'text-emerald-600'}`}>
                      {s.lastNum} / {s.quantity}{full && <span className="block text-[10px] bg-red-100 text-red-700 px-1.5 rounded mt-1 inline-block">เต็มแล้ว</span>}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <button onClick={() => openEdit(s)} className="text-blue-500 hover:bg-blue-50 w-8 h-8 rounded-full inline-flex items-center justify-center mr-1"><Pencil size={14} /></button>
                      <button onClick={() => remove(s)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 w-8 h-8 rounded-full inline-flex items-center justify-center"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">{form.id ? 'แก้ไขชุดเลข' : 'สร้างชุดเลขใหม่'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{err}</div>}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">โครงการ</label>
                <select value={form.projectId} onChange={(e) => setF('projectId', e.target.value)} className={`${inp} bg-white`}>
                  <option value="">-- เลือกโครงการ --</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-bold text-slate-700 mb-1.5">คำนำหน้า (Prefix)</label><input value={form.prefix} onChange={(e) => setF('prefix', e.target.value)} className={inp} placeholder="เช่น วท.รอ." /></div>
                <div><label className="block text-sm font-bold text-slate-700 mb-1.5">ปี (Suffix)</label><input value={form.year} onChange={(e) => setF('year', e.target.value)} className={inp} placeholder="เช่น /2569" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-bold text-slate-700 mb-1.5">เริ่มเลขที่ (รัน 3 หลัก)</label><input type="number" min={1} value={form.startNum} onChange={(e) => setF('startNum', e.target.value)} className={inp} /></div>
                <div><label className="block text-sm font-bold text-slate-700 mb-1.5">จำนวนที่ออกได้</label><input type="number" min={1} value={form.quantity} onChange={(e) => setF('quantity', e.target.value)} className={`${inp} bg-yellow-50`} /></div>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <p className="text-sm font-bold text-slate-700 mb-2">ข้อมูลผู้ขอออกเลขชุด (ถ้ามี)</p>
                {/* ค้นหาบุคลากรเพื่อดึงข้อมูล */}
                <div className="relative mb-3">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={personSearch}
                    onChange={(e) => { setPersonSearch(e.target.value); setPersonOpen(true); }}
                    onFocus={() => setPersonOpen(true)}
                    onBlur={() => setTimeout(() => setPersonOpen(false), 150)}
                    placeholder="ค้นหาบุคลากรเพื่อดึงข้อมูล (ชื่อ/อีเมล/รหัส)..."
                    className={`${inp} pl-9`} />
                  {personOpen && personSearch.trim().length >= 2 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                      {personResults.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-3">ไม่พบบุคลากร</p>
                      ) : personResults.map((p) => (
                        <button type="button" key={p.id} onMouseDown={(e) => { e.preventDefault(); selectPerson(p); }}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-700 truncate">{p.name}</span>
                          <span className="text-xs text-slate-400 truncate flex-shrink-0">{p.workUnit?.name || p.division?.name || p.department || ''}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input value={form.reqFirstname} onChange={(e) => setF('reqFirstname', e.target.value)} className={inp} placeholder="ชื่อผู้ขอ" />
                  <input value={form.reqLastname} onChange={(e) => setF('reqLastname', e.target.value)} className={inp} placeholder="นามสกุล" />
                </div>
                <input value={form.reqDepartment} onChange={(e) => setF('reqDepartment', e.target.value)} className={`${inp} mt-3`} placeholder="แผนกวิชา / งาน" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={save} disabled={saving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <Loader2 size={15} className="animate-spin" />} บันทึก
              </button>
              <button onClick={() => setModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-lg font-bold hover:bg-slate-200">ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
