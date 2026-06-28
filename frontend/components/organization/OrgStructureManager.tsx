'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Search, X, AlertTriangle, Check, Loader2, UserCog } from 'lucide-react';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'divisions' | 'workunits' | 'departments' | 'positions';

interface HeadUser { id: number; name: string; position: string | null; employeeId: string }

export interface Division {
  id: number; name: string; code: string; isActive: boolean;
  _count: { workUnits: number; users: number };
}
export interface WorkUnit {
  id: number; name: string; code: string; divisionId: number; isActive: boolean;
  division: { id: number; name: string; code: string };
  head: HeadUser | null;
  deputies: { user: HeadUser }[];
  _count: { users: number };
}
export interface Department {
  id: number; name: string; code: string; isActive: boolean;
  head: HeadUser | null;
  deputies: { user: HeadUser }[];
  _count: { users: number };
}
interface UserPickItem { id: number; name: string; position: string | null; employeeId: string }

type ModalMode = 'add' | 'edit';
interface FormState {
  name: string; code: string; divisionId: string; isActive: boolean;
  headId: string; deputyIds: string[];
}

const TAB_CONFIG: { key: Tab; label: string }[] = [
  { key: 'divisions',   label: 'ฝ่าย' },
  { key: 'workunits',   label: 'งาน' },
  { key: 'departments', label: 'แผนกวิชา' },
  { key: 'positions',   label: 'ตำแหน่ง' },
];
const DEFAULT_FORM: FormState = { name: '', code: '', divisionId: '', isActive: true, headId: '', deputyIds: [] };

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props { isAdmin?: boolean }

export default function OrgStructureManager({ isAdmin = false }: Props) {
  const [tab, setTab]             = useState<Tab>('divisions');
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [workUnits, setWorkUnits] = useState<WorkUnit[]>([]);
  const [departments, setDepts]   = useState<Department[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [userList, setUserList]   = useState<UserPickItem[]>([]);
  const [posNewName, setPosNew]   = useState('');
  const [posAdding, setPosAdding] = useState(false);
  const [posEditIdx, setPosEditIdx] = useState<number | null>(null);
  const [posEditName, setPosEditName] = useState('');
  const [posEditSaving, setPosEditSaving] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [divFilter, setDivFilter] = useState('');

  const [modal, setModal] = useState<{
    open: boolean; mode: ModalMode; tab: Tab; id: number | null; form: FormState;
  }>({ open: false, mode: 'add', tab: 'divisions', id: null, form: DEFAULT_FORM });
  const [saving, setSaving]   = useState(false);
  const [formErr, setFormErr] = useState('');

  const [confirmDel, setConfirmDel] = useState<{ id: number; name: string; tab: Tab } | null>(null);
  const [deleting, setDeleting]     = useState(false);

  const [toast, setToast]       = useState('');
  const [toastErr, setToastErr] = useState('');
  const toastTimer              = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, isErr = false) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (isErr) { setToastErr(msg); setToast(''); }
    else       { setToast(msg);   setToastErr(''); }
    toastTimer.current = setTimeout(() => { setToast(''); setToastErr(''); }, 3500);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dr, wr, dpr, pr, ur] = await Promise.all([
        api.get<{ data: Division[] }>('/settings/divisions'),
        api.get<{ data: WorkUnit[] }>('/settings/workunits'),
        api.get<{ data: Department[] }>('/settings/departments'),
        api.get<{ data: string[] }>('/settings/positions'),
        api.get<{ data: UserPickItem[] }>('/settings/users?limit=200&isActive=true'),
      ]);
      setDivisions(dr.data);
      setWorkUnits(wr.data);
      setDepts(dpr.data);
      setPositions(pr.data ?? []);
      setUserList(ur.data ?? []);
    } catch (e: unknown) {
      showToast((e as Error).message ?? 'โหลดข้อมูลไม่สำเร็จ', true);
    } finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = {
    divisions: divisions.filter((r) => !search || r.name.includes(search) || r.code.includes(search.toUpperCase())),
    workunits: workUnits.filter((r) => {
      const matchSearch = !search || r.name.includes(search) || r.code.includes(search.toUpperCase());
      const matchDiv    = !divFilter || String(r.divisionId) === divFilter;
      return matchSearch && matchDiv;
    }),
    departments: departments.filter((r) => !search || r.name.includes(search) || r.code.includes(search.toUpperCase())),
  };

  const switchTab = (t: Tab) => { setTab(t); setSearch(''); setDivFilter(''); };

  const openAdd = () => {
    setModal({ open: true, mode: 'add', tab, id: null, form: DEFAULT_FORM });
    setFormErr('');
  };
  const openEdit = (row: Division | WorkUnit | Department) => {
    const wu  = row as WorkUnit;
    const dep = row as Department;
    const head     = wu.head ?? dep.head;
    const deputies = wu.deputies ?? dep.deputies ?? [];
    setModal({
      open: true, mode: 'edit', tab, id: row.id,
      form: {
        name:       row.name,
        code:       row.code,
        divisionId: wu.divisionId ? String(wu.divisionId) : '',
        isActive:   row.isActive,
        headId:     head?.id ? String(head.id) : '',
        deputyIds:  deputies.map((d) => String(d.user.id)),
      },
    });
    setFormErr('');
  };
  const closeModal = () => { if (!saving) setModal((m) => ({ ...m, open: false })); };

  const handleSave = async () => {
    const { mode, id, form, tab: t } = modal;
    const body: Record<string, unknown> = {
      name: form.name.trim(), code: form.code.trim(), isActive: form.isActive,
    };
    if (t === 'workunits') body.divisionId = form.divisionId ? parseInt(form.divisionId) : undefined;
    if (!body.name || !body.code) { setFormErr('กรุณากรอกชื่อและรหัส'); return; }
    if (t === 'workunits' && !body.divisionId) { setFormErr('กรุณาเลือกฝ่าย'); return; }

    if (t === 'workunits' || t === 'departments') {
      body.headId    = form.headId ? parseInt(form.headId) : null;
      body.deputyIds = form.deputyIds.filter(Boolean).map(Number);
    }

    setSaving(true); setFormErr('');
    try {
      const label = TAB_CONFIG.find((c) => c.key === t)?.label ?? '';
      if (mode === 'add') await api.post(`/settings/${t}`, body);
      else                await api.put(`/settings/${t}/${id}`, body);
      closeModal();
      showToast(`${mode === 'add' ? 'เพิ่ม' : 'แก้ไข'}${label}สำเร็จ`);
      fetchAll();
    } catch (e: unknown) {
      setFormErr((e as Error).message ?? 'เกิดข้อผิดพลาด');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      const label = TAB_CONFIG.find((c) => c.key === confirmDel.tab)?.label ?? '';
      await api.delete(`/settings/${confirmDel.tab}/${confirmDel.id}`);
      setConfirmDel(null);
      showToast(`ลบ${label}สำเร็จ`);
      fetchAll();
    } catch (e: unknown) {
      setConfirmDel(null);
      showToast((e as Error).message ?? 'ลบไม่สำเร็จ', true);
    } finally { setDeleting(false); }
  };

  const tabLabel = TAB_CONFIG.find((c) => c.key === tab)?.label ?? '';
  const counts   = { divisions: divisions.length, workunits: workUnits.length, departments: departments.length, positions: positions.length };

  const handlePosAdd = async () => {
    if (!posNewName.trim()) return;
    setPosAdding(true);
    try {
      const r = await api.post<{ data: string[] }>('/settings/positions', { name: posNewName.trim() });
      setPositions(r.data ?? []); setPosNew(''); showToast('เพิ่มตำแหน่งสำเร็จ');
    } catch (e) { showToast((e as Error).message, true); }
    finally { setPosAdding(false); }
  };
  const handlePosEdit = async (idx: number) => {
    if (!posEditName.trim()) return;
    setPosEditSaving(true);
    try {
      const r = await api.put<{ data: string[] }>(`/settings/positions/${idx}`, { name: posEditName.trim() });
      setPositions(r.data ?? []); setPosEditIdx(null); showToast('แก้ไขสำเร็จ');
    } catch (e) { showToast((e as Error).message, true); }
    finally { setPosEditSaving(false); }
  };
  const handlePosDelete = async (idx: number) => {
    if (!confirm(`ลบตำแหน่ง "${positions[idx]}" ?`)) return;
    try {
      const r = await api.delete<{ data: string[] }>(`/settings/positions/${idx}`);
      setPositions(r.data ?? []); showToast('ลบตำแหน่งสำเร็จ');
    } catch (e) { showToast((e as Error).message, true); }
  };

  const showHeadCols = tab === 'workunits' || tab === 'departments';

  return (
    <>
      {/* Toast */}
      {(toast || toastErr) && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 ${
          toastErr ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          {toastErr ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast || toastErr}
        </div>
      )}

      {/* Card */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #dce6f9' }}>
        {/* Tabs */}
        <div className="flex" style={{ borderBottom: '1px solid #dce6f9' }}>
          {TAB_CONFIG.map(({ key, label }) => (
            <button key={key} onClick={() => switchTab(key)}
              className="flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2"
              style={tab === key
                ? { color: '#1d6ae5', borderBottom: '2px solid #1d6ae5', marginBottom: -1, backgroundColor: '#f8faff' }
                : { color: '#4a6080' }}>
              {label}
              <span className="px-1.5 py-0.5 rounded-full text-[11px] font-medium"
                style={tab === key
                  ? { backgroundColor: '#e8f0fe', color: '#1d6ae5' }
                  : { backgroundColor: '#f1f5f9', color: '#94a3b8' }}>
                {counts[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Toolbar — positions tab has its own inline-add UI */}
        {tab !== 'positions' && (
          <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid #f0f4ff' }}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-xs"
              style={{ backgroundColor: '#f5f8ff', border: '1px solid #dce6f9' }}>
              <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#94a3b8' }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder={`ค้นหา${tabLabel}...`}
                className="flex-1 bg-transparent text-sm outline-none placeholder-[#94a3b8]"
                style={{ color: '#1a2744' }} />
              {search && <button onClick={() => setSearch('')}><X className="w-3 h-3" style={{ color: '#94a3b8' }} /></button>}
            </div>

            {tab === 'workunits' && (
              <select value={divFilter} onChange={(e) => setDivFilter(e.target.value)}
                className="input-field text-sm py-2 w-auto">
                <option value="">— ทุกฝ่าย —</option>
                {divisions.map((d) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
              </select>
            )}

            {isAdmin && (
              <button onClick={openAdd} className="btn-primary flex items-center gap-1.5 ml-auto text-sm">
                <Plus className="w-3.5 h-3.5" /> เพิ่ม{tabLabel}
              </button>
            )}
          </div>
        )}

        {/* Positions tab — inline list */}
        {tab === 'positions' && (
          <div className="p-4 space-y-3">
            {isAdmin && (
              <div className="flex gap-2">
                <input
                  className="input-field flex-1 text-sm"
                  placeholder="ชื่อตำแหน่งใหม่ เช่น ครูอัตราจ้าง"
                  value={posNewName}
                  onChange={e => setPosNew(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlePosAdd()}
                />
                <button onClick={handlePosAdd} disabled={posAdding || !posNewName.trim()}
                  className="btn-primary flex items-center gap-1.5 text-sm px-4">
                  {posAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} เพิ่ม
                </button>
              </div>
            )}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #dce6f9' }}>
              {loading ? (
                <div className="flex items-center justify-center py-10 gap-2" style={{ color: '#94a3b8' }}>
                  <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลด...
                </div>
              ) : positions.length === 0 ? (
                <p className="py-10 text-center text-sm" style={{ color: '#94a3b8' }}>ยังไม่มีตำแหน่ง — เพิ่มตำแหน่งแรกด้านบน</p>
              ) : (
                <ul className="divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
                  {positions.map((pos, idx) => (
                    <li key={idx} className="flex items-center gap-2 px-4 py-2.5">
                      {posEditIdx === idx ? (
                        <>
                          <input
                            className="input-field flex-1 text-sm py-1.5"
                            value={posEditName}
                            onChange={e => setPosEditName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handlePosEdit(idx)}
                            autoFocus
                          />
                          <button onClick={() => handlePosEdit(idx)} disabled={posEditSaving}
                            className="p-1.5 rounded-lg text-green-600 hover:bg-green-50">
                            {posEditSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button onClick={() => setPosEditIdx(null)}
                            className="p-1.5 rounded-lg hover:bg-gray-50" style={{ color: '#94a3b8' }}>
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm" style={{ color: '#1a2744' }}>{pos}</span>
                          {isAdmin && (
                            <>
                              <button onClick={() => { setPosEditIdx(idx); setPosEditName(pos); }}
                                className="p-1.5 rounded-lg hover:bg-[#f5f8ff]" style={{ color: '#4a6080' }}>
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handlePosDelete(idx)}
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-50">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Table — for divisions / workunits / departments */}
        {tab !== 'positions' && (
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3" style={{ color: '#94a3b8' }}>
              <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลด...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #f0f4ff', backgroundColor: '#f8faff' }}>
                  <th className="px-5 py-3 text-left text-xs font-semibold w-12" style={{ color: '#94a3b8' }}>#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#94a3b8' }}>ชื่อ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold w-28" style={{ color: '#94a3b8' }}>รหัส</th>
                  {tab === 'workunits'  && <th className="px-4 py-3 text-left text-xs font-semibold w-44" style={{ color: '#94a3b8' }}>ฝ่าย</th>}
                  {tab === 'divisions' && <th className="px-4 py-3 text-center text-xs font-semibold w-28" style={{ color: '#94a3b8' }}>จำนวนงาน</th>}
                  {showHeadCols && <th className="px-4 py-3 text-left text-xs font-semibold w-40" style={{ color: '#94a3b8' }}>หัวหน้า</th>}
                  {showHeadCols && <th className="px-4 py-3 text-left text-xs font-semibold w-40" style={{ color: '#94a3b8' }}>ผู้ช่วยหัวหน้า</th>}
                  <th className="px-4 py-3 text-center text-xs font-semibold w-24" style={{ color: '#94a3b8' }}>ผู้ใช้</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold w-28" style={{ color: '#94a3b8' }}>สถานะ</th>
                  {isAdmin && <th className="px-4 py-3 text-center text-xs font-semibold w-20" style={{ color: '#94a3b8' }}>จัดการ</th>}
                </tr>
              </thead>
              <tbody>
                {tab === 'divisions' && filtered.divisions.map((r, i) => (
                  <OrgRow key={r.id} index={i + 1} name={r.name} code={r.code} isActive={r.isActive}
                    extra={<td className="px-4 py-3 text-center text-sm" style={{ color: '#4a6080' }}>{r._count.workUnits}</td>}
                    userCount={r._count.users} isAdmin={isAdmin} showHeadCols={false}
                    onEdit={() => openEdit(r)} onDelete={() => setConfirmDel({ id: r.id, name: r.name, tab })} />
                ))}
                {tab === 'workunits' && filtered.workunits.map((r, i) => (
                  <OrgRow key={r.id} index={i + 1} name={r.name} code={r.code} isActive={r.isActive}
                    extra={<td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#f5f8ff', color: '#4a6080', border: '1px solid #dce6f9' }}>{r.division.name}</span></td>}
                    head={r.head} deputies={r.deputies} showHeadCols
                    userCount={r._count.users} isAdmin={isAdmin}
                    onEdit={() => openEdit(r)} onDelete={() => setConfirmDel({ id: r.id, name: r.name, tab })} />
                ))}
                {tab === 'departments' && filtered.departments.map((r, i) => (
                  <OrgRow key={r.id} index={i + 1} name={r.name} code={r.code} isActive={r.isActive}
                    head={r.head} deputies={r.deputies} showHeadCols
                    userCount={r._count.users} isAdmin={isAdmin}
                    onEdit={() => openEdit(r)} onDelete={() => setConfirmDel({ id: r.id, name: r.name, tab })} />
                ))}
                {filtered[tab === 'divisions' ? 'divisions' : tab === 'workunits' ? 'workunits' : 'departments'].length === 0 && (
                  <tr><td colSpan={9} className="py-12 text-center text-sm" style={{ color: '#94a3b8' }}>ไม่พบข้อมูล{tabLabel}</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        )}
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-md rounded-2xl shadow-xl z-10"
            style={{ backgroundColor: '#ffffff', border: '1px solid #dce6f9' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #dce6f9' }}>
              <h3 className="font-semibold" style={{ color: '#1a2744' }}>
                {modal.mode === 'add' ? 'เพิ่ม' : 'แก้ไข'}{TAB_CONFIG.find((c) => c.key === modal.tab)?.label}
              </h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-[#f5f8ff] transition-colors">
                <X className="w-4 h-4" style={{ color: '#4a6080' }} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {formErr && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 px-3 py-2.5 rounded-lg text-sm">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {formErr}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>
                  ชื่อ{TAB_CONFIG.find((c) => c.key === modal.tab)?.label} <span className="text-red-500">*</span>
                </label>
                <input value={modal.form.name}
                  onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, name: e.target.value } }))}
                  placeholder="กรอกชื่อ" className="input-field" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>
                  รหัส <span className="text-red-500">*</span>
                  <span className="ml-1 font-normal" style={{ color: '#94a3b8' }}>(ตัวพิมพ์ใหญ่ เช่น ADM)</span>
                </label>
                <input value={modal.form.code}
                  onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, code: e.target.value.toUpperCase() } }))}
                  placeholder="รหัส" className="input-field font-mono tracking-wider" />
              </div>
              {modal.tab === 'workunits' && (
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>
                    สังกัดฝ่าย <span className="text-red-500">*</span>
                  </label>
                  <select value={modal.form.divisionId}
                    onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, divisionId: e.target.value } }))}
                    className="input-field">
                    <option value="">— เลือกฝ่าย —</option>
                    {divisions.map((d) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                  </select>
                </div>
              )}

              {/* หัวหน้า / ผู้ช่วยหัวหน้า — เฉพาะ workunits และ departments */}
              {(modal.tab === 'workunits' || modal.tab === 'departments') && (
                <div className="pt-1" style={{ borderTop: '1px solid #f0f4ff' }}>
                  <div className="flex items-center gap-1.5 mb-3">
                    <UserCog className="w-3.5 h-3.5" style={{ color: '#4a6080' }} />
                    <span className="text-xs font-semibold" style={{ color: '#1a2744' }}>ผู้รับผิดชอบ</span>
                  </div>
                  <div className="space-y-3">
                    {/* หัวหน้า — single select */}
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>
                        {modal.tab === 'workunits' ? 'หัวหน้างาน' : 'หัวหน้าแผนกวิชา'}
                      </label>
                      <select value={modal.form.headId}
                        onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, headId: e.target.value } }))}
                        className="input-field text-sm">
                        <option value="">— ไม่ระบุ —</option>
                        {userList.map((u) => (
                          <option key={u.id} value={String(u.id)}>
                            {u.name}{u.position ? ` (${u.position})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* ผู้ช่วยหัวหน้า — multi checkbox */}
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>
                        {modal.tab === 'workunits' ? 'ผู้ช่วยหัวหน้างาน' : 'ผู้ช่วยหัวหน้าแผนกวิชา'}
                        <span className="ml-1 font-normal" style={{ color: '#94a3b8' }}>(เลือกได้หลายคน)</span>
                      </label>
                      <div className="rounded-lg overflow-hidden max-h-44 overflow-y-auto"
                        style={{ border: '1px solid #dce6f9', backgroundColor: '#f8faff' }}>
                        {userList.length === 0 ? (
                          <p className="py-4 text-center text-xs" style={{ color: '#94a3b8' }}>ไม่พบบุคลากร</p>
                        ) : userList.map((u) => {
                          const sid   = String(u.id);
                          const checked = modal.form.deputyIds.includes(sid);
                          const toggle = () => setModal((m) => ({
                            ...m,
                            form: {
                              ...m.form,
                              deputyIds: checked
                                ? m.form.deputyIds.filter((x) => x !== sid)
                                : [...m.form.deputyIds, sid],
                            },
                          }));
                          return (
                            <label key={u.id}
                              className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-white transition-colors"
                              style={{ borderBottom: '1px solid #f0f4ff' }}>
                              <input type="checkbox" checked={checked} onChange={toggle}
                                className="w-3.5 h-3.5 accent-[#1d6ae5] flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="text-xs font-medium truncate" style={{ color: '#1a2744' }}>{u.name}</div>
                                {u.position && <div className="text-[11px] truncate" style={{ color: '#94a3b8' }}>{u.position}</div>}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                      {modal.form.deputyIds.length > 0 && (
                        <p className="mt-1 text-[11px]" style={{ color: '#1d6ae5' }}>
                          เลือกแล้ว {modal.form.deputyIds.length} คน
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: '#f5f8ff', border: '1px solid #dce6f9' }}>
                <span className="text-sm" style={{ color: '#1a2744' }}>สถานะการใช้งาน</span>
                <button type="button"
                  onClick={() => setModal((m) => ({ ...m, form: { ...m.form, isActive: !m.form.isActive } }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${modal.form.isActive ? 'bg-[#1d6ae5]' : 'bg-gray-300'}`}>
                  <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                    style={{ left: modal.form.isActive ? '1.25rem' : '0.125rem' }} />
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4" style={{ borderTop: '1px solid #dce6f9' }}>
              <button onClick={closeModal} disabled={saving} className="btn-secondary">ยกเลิก</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => !deleting && setConfirmDel(null)} />
          <div className="relative w-full max-w-sm rounded-2xl shadow-xl z-10 p-6 text-center"
            style={{ backgroundColor: '#ffffff', border: '1px solid #dce6f9' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#fef2f2' }}>
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-base font-semibold mb-1" style={{ color: '#1a2744' }}>ยืนยันการลบ</h3>
            <p className="text-sm mb-1" style={{ color: '#4a6080' }}>
              ต้องการลบ <span className="font-semibold" style={{ color: '#1a2744' }}>"{confirmDel.name}"</span> ?
            </p>
            <p className="text-xs mb-5" style={{ color: '#94a3b8' }}>การดำเนินการนี้ไม่สามารถยกเลิกได้</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)} disabled={deleting} className="flex-1 btn-secondary">ยกเลิก</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 btn-danger flex items-center justify-center gap-2">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Row component ────────────────────────────────────────────────────────────

interface OrgRowProps {
  index: number; name: string; code: string; isActive: boolean;
  extra?: React.ReactNode;
  head?: HeadUser | null; deputies?: { user: HeadUser }[]; showHeadCols: boolean;
  userCount: number; isAdmin: boolean;
  onEdit: () => void; onDelete: () => void;
}

function HeadCell({ user }: { user: HeadUser | null | undefined }) {
  if (!user) return <td className="px-4 py-3 text-xs" style={{ color: '#94a3b8' }}>—</td>;
  return (
    <td className="px-4 py-3">
      <div className="text-xs font-medium" style={{ color: '#1a2744' }}>{user.name}</div>
      {user.position && <div className="text-[11px]" style={{ color: '#94a3b8' }}>{user.position}</div>}
    </td>
  );
}

function DeputyCell({ deputies }: { deputies?: { user: HeadUser }[] }) {
  if (!deputies || deputies.length === 0)
    return <td className="px-4 py-3 text-xs" style={{ color: '#94a3b8' }}>—</td>;
  return (
    <td className="px-4 py-3">
      <div className="flex flex-wrap gap-1">
        {deputies.map((d) => (
          <span key={d.user.id} className="inline-block text-[11px] px-1.5 py-0.5 rounded"
            style={{ backgroundColor: '#f0f4ff', color: '#4a6080', border: '1px solid #dce6f9' }}>
            {d.user.name}
          </span>
        ))}
      </div>
    </td>
  );
}

function OrgRow({ index, name, code, isActive, extra, head, deputies, showHeadCols, userCount, isAdmin, onEdit, onDelete }: OrgRowProps) {
  return (
    <tr style={{ borderBottom: '1px solid #f5f8ff' }} className="hover:bg-[#fafbff] transition-colors group">
      <td className="px-5 py-3.5 text-xs" style={{ color: '#94a3b8' }}>{index}</td>
      <td className="px-4 py-3.5 font-medium" style={{ color: '#1a2744' }}>{name}</td>
      <td className="px-4 py-3.5">
        <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#e8f0fe', color: '#1d6ae5' }}>{code}</span>
      </td>
      {extra}
      {showHeadCols && <HeadCell user={head} />}
      {showHeadCols && <DeputyCell deputies={deputies} />}
      <td className="px-4 py-3.5 text-center text-xs" style={{ color: '#4a6080' }}>{userCount} คน</td>
      <td className="px-4 py-3.5">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
          style={isActive ? { backgroundColor: '#e6f9f0', color: '#0d9068' } : { backgroundColor: '#f1f5f9', color: '#94a3b8' }}>
          {isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
        </span>
      </td>
      {isAdmin && (
        <td className="px-4 py-3.5">
          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-[#e8f0fe] transition-colors" title="แก้ไข">
              <Pencil className="w-3.5 h-3.5" style={{ color: '#1d6ae5' }} />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="ลบ">
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}
