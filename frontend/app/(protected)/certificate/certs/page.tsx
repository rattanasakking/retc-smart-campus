'use client';
import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Stamp, X, Loader2, Pencil, Trash2, Eye, Printer, FileSpreadsheet, Download } from 'lucide-react';
import { api } from '@/lib/api';
import CertTabBar from '@/components/certificate/CertTabBar';
import ThaiDatePicker from '@/components/ui/ThaiDatePicker';

interface Project { id: number; name: string }
interface Series { id: number; projectId: number | null; prefix: string; year: string | null; lastNum: number; quantity: number }
interface Cert {
  id: number; projectId: number; certNo: string; firstname: string; lastname: string;
  idCard: string | null; position: string | null; award: string | null; projectName: string | null;
}

const POS_LIST = ['นักเรียน','นักศึกษา','ครู','ครูผู้สอน','วิทยากร','ผู้บริหาร','คณะกรรมการ'];
const AWD_LIST = ['รางวัลชนะเลิศ','รางวัลรองชนะเลิศอันดับ 1','รางวัลรองชนะเลิศอันดับ 2','รางวัลชมเชย','ผู้เข้าร่วมโครงการ','คณะกรรมการดำเนินงาน'];

interface IForm { id: number | null; projectId: string; seriesId: string; certNo: string; firstname: string; lastname: string; idCard: string; position: string; award: string }
const IBLANK: IForm = { id: null, projectId: '', seriesId: '', certNo: '', firstname: '', lastname: '', idCard: '', position: '', award: '' };

export default function CertsPage() {
  const [items, setItems]     = useState<Cert[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allSeries, setAllSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch]   = useState('');
  const [fProject, setFProject] = useState('');
  const [fYear, setFYear]     = useState('');

  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState<IForm>(IBLANK);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '300' });
    if (search)   params.set('search', search);
    if (fProject) params.set('projectId', fProject);
    if (fYear)    params.set('year', fYear);
    api.get<{ data: Cert[] }>(`/certificate/certs?${params}`).then((r) => { setItems(r.data ?? []); setSelected(new Set()); }).catch(() => {}).finally(() => setLoading(false));
  }, [search, fProject, fYear]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get<{ data: Project[] }>('/certificate/projects').then((r) => setProjects(r.data ?? [])).catch(() => {});
    api.get<{ data: Series[] }>('/certificate/series').then((r) => setAllSeries(r.data ?? [])).catch(() => {
      /* staff อาจไม่มีสิทธิ์ดู series → ไม่เป็นไร */ });
  }, []);

  const openNew = () => { setForm({ ...IBLANK, projectId: projects[0] ? String(projects[0].id) : '' }); setErr(''); setModal(true); };
  const openEdit = (c: Cert) => {
    setForm({ id: c.id, projectId: String(c.projectId), seriesId: '', certNo: c.certNo,
      firstname: c.firstname === '-' ? '' : c.firstname, lastname: c.lastname === '-' ? '' : c.lastname,
      idCard: c.idCard ?? '', position: c.position ?? '', award: c.award ?? '' });
    setErr(''); setModal(true);
  };

  const save = async () => {
    if (!form.projectId) { setErr('กรุณาเลือกโครงการ'); return; }
    if (!form.firstname.trim() || !form.lastname.trim()) { setErr('กรุณากรอกชื่อและนามสกุล'); return; }
    if (!form.id && !form.seriesId && !form.certNo.trim()) { setErr('กรุณากรอกรหัสเกียรติบัตร หรือเลือกชุดเลขอัตโนมัติ'); return; }
    setSaving(true); setErr('');
    try {
      if (form.id) await api.put(`/certificate/certs/${form.id}`, form);
      else await api.post('/certificate/certs', form);
      setModal(false); load();
    } catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  };

  const removeCert = async (c: Cert) => {
    if (!confirm('ลบเกียรติบัตรนี้?')) return;
    try { await api.delete(`/certificate/certs/${c.id}`); load(); } catch (e) { alert((e as Error).message); }
  };

  const toggleSel = (id: number) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected((prev) => prev.size === items.length ? new Set() : new Set(items.map((c) => c.id)));

  const bulkPrint = () => {
    if (selected.size === 0) { alert('กรุณาเลือกอย่างน้อย 1 รายการ'); return; }
    window.open(`/verify/print?ids=${Array.from(selected).join(',')}`, '_blank');
  };
  const bulkDelete = async () => {
    if (selected.size === 0) { alert('กรุณาเลือกอย่างน้อย 1 รายการ'); return; }
    if (!confirm(`ลบเกียรติบัตร ${selected.size} รายการที่เลือก?`)) return;
    try { await api.post('/certificate/certs/bulk-delete', { ids: Array.from(selected) }); load(); } catch (e) { alert((e as Error).message); }
  };

  const printAll = async () => {
    const params = new URLSearchParams({ limit: '2000' });
    if (search)   params.set('search', search);
    if (fProject) params.set('projectId', fProject);
    if (fYear)    params.set('year', fYear);
    try {
      const r = await api.get<{ data: Cert[] }>(`/certificate/certs?${params}`);
      const ids = (r.data ?? []).map((c) => c.id);
      if (!ids.length) { alert('ไม่มีรายการสำหรับพิมพ์'); return; }
      window.open(`/verify/print?ids=${ids.join(',')}`, '_blank');
    } catch (e) { alert((e as Error).message); }
  };

  const setF = (k: keyof IForm, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const projectSeries = allSeries.filter((s) => String(s.projectId) === form.projectId && s.lastNum < s.quantity);
  const inp = 'w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400';

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Stamp size={20} style={{ color: '#c2410c' }} /> ออกเกียรติบัตร</h1>
          <p className="text-sm text-gray-500 mt-0.5">ค้นหา ออก และจัดการเกียรติบัตร</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={printAll} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700" title="พิมพ์ทุกใบตามตัวกรองปัจจุบัน (เลือกโครงการเพื่อพิมพ์ทั้งโครงการ)"><Printer size={15} /> พิมพ์ทั้งหมด</button>
          <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700"><FileSpreadsheet size={15} /> นำเข้า CSV</button>
          <button onClick={openNew} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-700"><Plus size={15} /> เพิ่มทีละใบ</button>
        </div>
      </div>

      <CertTabBar />

      {/* Filters */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ชื่อ, นามสกุล, รหัส..." className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <select value={fProject} onChange={(e) => setFProject(e.target.value)} className="lg:w-64 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50">
          <option value="">-- ทุกโครงการ --</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input value={fYear} onChange={(e) => setFYear(e.target.value)} placeholder="ปี พ.ศ. (เช่น 2569)" className="lg:w-40 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 lg:text-center" />
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex gap-2 flex-wrap">
          <span className="text-sm text-slate-600 self-center">เลือก {selected.size} รายการ:</span>
          <button onClick={bulkPrint} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5"><Printer size={14} /> พิมพ์/ดาวน์โหลด</button>
          <button onClick={bulkDelete} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5"><Trash2 size={14} /> ลบที่เลือก</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-200">
              <tr>
                <th className="px-4 py-4 w-10 text-center"><input type="checkbox" checked={items.length > 0 && selected.size === items.length} onChange={toggleAll} className="w-4 h-4 accent-blue-600" /></th>
                <th className="px-6 py-4">รหัสเกียรติบัตร</th><th className="px-6 py-4">ผู้รับ</th>
                <th className="px-6 py-4">ตำแหน่ง/รางวัล</th><th className="px-6 py-4">โครงการ</th><th className="px-6 py-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-14 text-center text-slate-400"><Loader2 className="animate-spin inline" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-14 text-center text-slate-500">ไม่พบข้อมูลเกียรติบัตร</td></tr>
              ) : items.map((c) => {
                const empty = c.firstname === '-' && c.lastname === '-';
                return (
                  <tr key={c.id} className="hover:bg-blue-50/40">
                    <td className="px-4 py-4 text-center"><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSel(c.id)} className="w-4 h-4 accent-blue-600" /></td>
                    <td className="px-6 py-4 font-bold text-blue-600 whitespace-nowrap">{c.certNo}</td>
                    <td className="px-6 py-4">
                      {empty ? <span className="bg-yellow-100 text-yellow-800 text-xs px-2.5 py-1 rounded-md font-bold">ว่าง (รอระบุชื่อ)</span> : (
                        <><div className="font-bold text-slate-800">{c.firstname} {c.lastname}</div><div className="text-xs text-slate-400">{c.idCard || 'ไม่ระบุบัตร'}</div></>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {c.position && <span className="inline-block bg-slate-100 border px-2 py-0.5 rounded mr-1 mb-1">{c.position}</span>}
                      {c.award && <span className="inline-block bg-yellow-50 border border-yellow-200 text-yellow-700 px-2 py-0.5 rounded">{c.award}</span>}
                      {!c.position && !c.award && <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-[180px] truncate text-xs">{c.projectName ?? 'ไม่มีโครงการ'}</td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <a href={`/verify/print?ids=${c.id}`} target="_blank" rel="noreferrer" className="text-emerald-600 border border-emerald-200 hover:bg-emerald-600 hover:text-white w-8 h-8 rounded-lg flex items-center justify-center" title="ดู/พิมพ์"><Eye size={14} /></a>
                        <button onClick={() => openEdit(c)} className={`w-8 h-8 rounded-lg flex items-center justify-center border ${empty ? 'bg-blue-600 text-white border-blue-600' : 'text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white'}`} title="แก้ไข"><Pencil size={14} /></button>
                        <button onClick={() => removeCert(c)} className="text-red-500 border border-red-200 hover:bg-red-500 hover:text-white w-8 h-8 rounded-lg flex items-center justify-center" title="ลบ"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-sm text-slate-500 text-right">ทั้งหมด <span className="font-bold text-slate-700">{items.length}</span> รายการ</div>
      </div>

      {modal && <IssueModal form={form} setF={setF} projectSeries={projectSeries} projects={projects} err={err} saving={saving} onSave={save} onClose={() => setModal(false)} inp={inp} />}
      {importOpen && <ImportModal projects={projects} allSeries={allSeries} onClose={() => setImportOpen(false)} onDone={() => { setImportOpen(false); load(); }} inp={inp} />}
    </div>
  );
}

function IssueModal({ form, setF, projectSeries, projects, err, saving, onSave, onClose, inp }: {
  form: IForm; setF: (k: keyof IForm, v: string) => void; projectSeries: Series[]; projects: Project[];
  err: string; saving: boolean; onSave: () => void; onClose: () => void; inp: string;
}) {
  const isEdit = !!form.id;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">{isEdit ? 'แก้ไขข้อมูลเกียรติบัตร' : 'ออกเกียรติบัตรใหม่'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{err}</div>}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">โครงการ *</label>
              <select value={form.projectId} onChange={(e) => setF('projectId', e.target.value)} className={`${inp} bg-white`}>
                <option value="">-- เลือกโครงการ --</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {!isEdit && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">รับหมายเลขอัตโนมัติ (จากชุด)</label>
                <select value={form.seriesId} onChange={(e) => setF('seriesId', e.target.value)} className={`${inp} bg-white`}>
                  <option value="">-- ไม่ใช้ชุด (กรอกรหัสเอง) --</option>
                  {projectSeries.map((s) => <option key={s.id} value={s.id}>{s.prefix}###{s.year} (ออกแล้ว {s.lastNum}/{s.quantity})</option>)}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">รหัสเกียรติบัตร {(!isEdit && form.seriesId) && <span className="text-slate-400 font-normal">(รับจากชุดอัตโนมัติ)</span>}</label>
            <input value={form.seriesId && !isEdit ? '' : form.certNo} disabled={!!form.seriesId && !isEdit} onChange={(e) => setF('certNo', e.target.value)}
              className={`${inp} font-mono ${form.seriesId && !isEdit ? 'bg-slate-100 text-slate-400' : ''}`} placeholder={form.seriesId && !isEdit ? 'ระบบจะรันเลขให้อัตโนมัติ' : 'พิมพ์รหัสเองถ้าไม่ใช้ชุด'} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-bold text-slate-700 mb-1.5">ชื่อ *</label><input value={form.firstname} onChange={(e) => setF('firstname', e.target.value)} className={inp} placeholder="ชื่อ" /></div>
            <div><label className="block text-sm font-bold text-slate-700 mb-1.5">นามสกุล *</label><input value={form.lastname} onChange={(e) => setF('lastname', e.target.value)} className={inp} placeholder="นามสกุล" /></div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">ตำแหน่ง / สถานะ</label>
              <input list="pos_list" value={form.position} onChange={(e) => setF('position', e.target.value)} className={inp} placeholder="ถ้ามี" />
              <datalist id="pos_list">{POS_LIST.map((p) => <option key={p} value={p} />)}</datalist>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">รางวัล / รายละเอียด</label>
              <input list="awd_list" value={form.award} onChange={(e) => setF('award', e.target.value)} className={inp} placeholder="ถ้ามี" />
              <datalist id="awd_list">{AWD_LIST.map((a) => <option key={a} value={a} />)}</datalist>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">เลขบัตรประชาชน (ถ้ามี)</label>
            <input value={form.idCard} onChange={(e) => setF('idCard', e.target.value)} className={`${inp} font-mono`} placeholder="X-XXXX-XXXXX-XX-X" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button onClick={onSave} disabled={saving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">{saving && <Loader2 size={15} className="animate-spin" />} บันทึก</button>
          <button onClick={onClose} className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-lg font-bold hover:bg-slate-200">ยกเลิก</button>
        </div>
      </div>
    </div>
  );
}

function parseCsv(text: string): string[][] {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows: string[][] = [];
  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim() === '') continue;
    // parser ง่าย ๆ รองรับเครื่องหมายคำพูด
    const cells: string[] = []; let cur = ''; let q = false;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (q) { if (ch === '"') { if (raw[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else { if (ch === '"') q = true; else if (ch === ',') { cells.push(cur); cur = ''; } else cur += ch; }
    }
    cells.push(cur);
    rows.push(cells.map((c) => c.trim()));
  }
  return rows;
}

function ImportModal({ projects, allSeries, onClose, onDone, inp }: {
  projects: Project[]; allSeries: Series[]; onClose: () => void; onDone: () => void; inp: string;
}) {
  const [projectId, setProjectId] = useState('');
  const [seriesId, setSeriesId]   = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows]           = useState<string[][]>([]);
  const [fileName, setFileName]   = useState('');
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState('');

  const projectSeries = allSeries.filter((s) => String(s.projectId) === projectId && s.lastNum < s.quantity);

  const onFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCsv((e.target?.result as string) ?? '');
      setRows(parsed.slice(1)); // ตัดหัวตาราง
    };
    reader.readAsText(file, 'UTF-8');
  };

  const submit = async () => {
    if (!projectId) { setErr('กรุณาเลือกโครงการ'); return; }
    if (rows.length === 0) { setErr('กรุณาเลือกไฟล์ CSV ที่มีข้อมูล'); return; }
    setSaving(true); setErr('');
    try {
      const payloadRows = rows.map((r) => ({ firstname: r[0], lastname: r[1], idCard: r[2], position: r[3], award: r[4], certNo: r[5] }));
      const res = await api.post<{ message: string }>('/certificate/certs/import', { projectId, seriesId: seriesId || undefined, issueDate, rows: payloadRows });
      alert(res.message);
      onDone();
    } catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  };

  const templateHref = 'data:text/csv;charset=utf-8,' + encodeURIComponent('ชื่อ,นามสกุล,เลขบัตรประชาชน,ตำแหน่ง,รางวัล,รหัสเกียรติบัตร\nสมชาย,ใจดี,1122334455667,นักเรียน,ชนะเลิศ,\n');

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">นำเข้าเกียรติบัตรจาก CSV</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{err}</div>}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">โครงการ *</label>
              <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setSeriesId(''); }} className={`${inp} bg-white`}>
                <option value="">-- เลือกโครงการ --</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">ชุดเลขอัตโนมัติ (ถ้ามี)</label>
              <select value={seriesId} onChange={(e) => setSeriesId(e.target.value)} className={`${inp} bg-white`}>
                <option value="">-- ใช้รหัสจาก CSV --</option>
                {projectSeries.map((s) => <option key={s.id} value={s.id}>{s.prefix}###{s.year} (ออกแล้ว {s.lastNum}/{s.quantity})</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">วันที่ออกเกียรติบัตร</label>
            <ThaiDatePicker value={issueDate} onChange={setIssueDate} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">ไฟล์ CSV (UTF-8)</label>
            <label className="flex items-center gap-2 border-2 border-dashed border-slate-300 rounded-lg p-3 cursor-pointer hover:bg-slate-50 text-sm text-slate-500">
              <FileSpreadsheet size={16} className="text-emerald-500" />
              <span>{fileName || 'เลือกไฟล์ .csv'}</span>
              <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            </label>
            {rows.length > 0 && <p className="text-xs text-emerald-600 mt-1.5">อ่านข้อมูลได้ {rows.length} รายการ</p>}
          </div>
          <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 text-xs text-slate-600">
            <p className="font-bold text-blue-800 mb-1">คอลัมน์ CSV (เรียงตามลำดับ):</p>
            <p className="font-mono">ชื่อ, นามสกุล, เลขบัตร, ตำแหน่ง, รางวัล, รหัสเกียรติบัตร</p>
            <a href={templateHref} download="template_certificate.csv" className="inline-flex items-center gap-1 mt-2 text-emerald-600 font-bold hover:underline"><Download size={13} /> ดาวน์โหลดไฟล์ตัวอย่าง</a>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button onClick={submit} disabled={saving} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2">{saving && <Loader2 size={15} className="animate-spin" />} ยืนยันนำเข้า</button>
          <button onClick={onClose} className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-lg font-bold hover:bg-slate-200">ยกเลิก</button>
        </div>
      </div>
    </div>
  );
}
