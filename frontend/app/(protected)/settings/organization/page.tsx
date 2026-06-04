'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Search, X, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'divisions' | 'workunits' | 'departments';

interface Division {
  id: number; name: string; code: string; isActive: boolean;
  _count: { workUnits: number; users: number };
}
interface WorkUnit {
  id: number; name: string; code: string; divisionId: number; isActive: boolean;
  division: { id: number; name: string; code: string };
  _count: { users: number };
}
interface Department {
  id: number; name: string; code: string; isActive: boolean;
  _count: { users: number };
}

type ModalMode = 'add' | 'edit';

interface FormState {
  name: string; code: string; divisionId: string; isActive: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TAB_CONFIG: { key: Tab; label: string; countKey?: 'workUnits' }[] = [
  { key: 'divisions',   label: 'ฝ่าย' },
  { key: 'workunits',   label: 'งาน' },
  { key: 'departments', label: 'แผนกวิชา' },
];

const DEFAULT_FORM: FormState = { name: '', code: '', divisionId: '', isActive: true };

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OrganizationPage() {
  const [tab, setTab]             = useState<Tab>('divisions');
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [workUnits, setWorkUnits] = useState<WorkUnit[]>([]);
  const [departments, setDepts]   = useState<Department[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [divFilter, setDivFilter] = useState('');

  // Modal
  const [modal, setModal] = useState<{
    open: boolean; mode: ModalMode; tab: Tab; id: number | null; form: FormState;
  }>({ open: false, mode: 'add', tab: 'divisions', id: null, form: DEFAULT_FORM });
  const [saving, setSaving]   = useState(false);
  const [formErr, setFormErr] = useState('');

  // Delete confirm
  const [confirmDel, setConfirmDel] = useState<{ id: number; name: string; tab: Tab } | null>(null);
  const [deleting, setDeleting]     = useState(false);

  // Toast
  const [toast, setToast]       = useState('');
  const [toastErr, setToastErr] = useState('');
  const toastTimer              = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, isErr = false) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (isErr) { setToastErr(msg); setToast(''); }
    else       { setToast(msg);   setToastErr(''); }
    toastTimer.current = setTimeout(() => { setToast(''); setToastErr(''); }, 3500);
  }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dr, wr, dpr] = await Promise.all([
        api.get<{ data: Division[] }>('/settings/divisions'),
        api.get<{ data: WorkUnit[] }>('/settings/workunits'),
        api.get<{ data: Department[] }>('/settings/departments'),
      ]);
      setDivisions(dr.data);
      setWorkUnits(wr.data);
      setDepts(dpr.data);
    } catch (e: unknown) {
      showToast((e as Error).message ?? 'โหลดข้อมูลไม่สำเร็จ', true);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Filtered data ──────────────────────────────────────────────────────────

  const filtered = {
    divisions: divisions.filter((r) =>
      !search || r.name.includes(search) || r.code.includes(search.toUpperCase())
    ),
    workunits: workUnits.filter((r) => {
      const matchSearch = !search || r.name.includes(search) || r.code.includes(search.toUpperCase());
      const matchDiv    = !divFilter || String(r.divisionId) === divFilter;
      return matchSearch && matchDiv;
    }),
    departments: departments.filter((r) =>
      !search || r.name.includes(search) || r.code.includes(search.toUpperCase())
    ),
  };

  const switchTab = (t: Tab) => { setTab(t); setSearch(''); setDivFilter(''); };

  // ── Modal helpers ──────────────────────────────────────────────────────────

  const openAdd = () => {
    setModal({ open: true, mode: 'add', tab, id: null, form: DEFAULT_FORM });
    setFormErr('');
  };

  const openEdit = (row: Division | WorkUnit | Department) => {
    const wu = row as WorkUnit;
    setModal({
      open: true, mode: 'edit', tab, id: row.id,
      form: {
        name:       row.name,
        code:       row.code,
        divisionId: wu.divisionId ? String(wu.divisionId) : '',
        isActive:   row.isActive,
      },
    });
    setFormErr('');
  };

  const closeModal = () => { if (!saving) setModal((m) => ({ ...m, open: false })); };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const { mode, id, form, tab: t } = modal;
    const body: Record<string, unknown> = {
      name: form.name.trim(), code: form.code.trim(), isActive: form.isActive,
    };
    if (t === 'workunits') body.divisionId = form.divisionId ? parseInt(form.divisionId) : undefined;

    if (!body.name || !body.code) { setFormErr('กรุณากรอกชื่อและรหัส'); return; }
    if (t === 'workunits' && !body.divisionId) { setFormErr('กรุณาเลือกฝ่าย'); return; }

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
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

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
    } finally {
      setDeleting(false);
    }
  };

  const tabLabel = TAB_CONFIG.find((c) => c.key === tab)?.label ?? '';
  const counts   = { divisions: divisions.length, workunits: workUnits.length, departments: departments.length };

  return (
    <div className="space-y-4">
      {/* Toast */}
      {(toast || toastErr) && (
        <div
          className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 ${
            toastErr
              ? 'bg-red-50 border border-red-200 text-red-600'
              : 'bg-green-50 border border-green-200 text-green-700'
          }`}
        >
          {toastErr ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast || toastErr}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>โครงสร้างองค์กร</h1>
        <p className="text-xs mt-0.5" style={{ color: '#374151' }}>จัดการฝ่าย งาน และแผนกวิชา</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #dce6f9' }}>

        {/* Tabs */}
        <div className="flex" style={{ borderBottom: '1px solid #dce6f9' }}>
          {TAB_CONFIG.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => switchTab(key)}
              className="flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2"
              style={
                tab === key
                  ? { color: '#1d6ae5', borderBottom: '2px solid #1d6ae5', marginBottom: -1, backgroundColor: '#f8faff' }
                  : { color: '#4a6080' }
              }
            >
              {label}
              <span
                className="px-1.5 py-0.5 rounded-full text-[11px] font-medium"
                style={
                  tab === key
                    ? { backgroundColor: '#e8f0fe', color: '#1d6ae5' }
                    : { backgroundColor: '#f1f5f9', color: '#94a3b8' }
                }
              >
                {counts[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid #f0f4ff' }}
        >
          {/* Search */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-xs"
            style={{ backgroundColor: '#f5f8ff', border: '1px solid #dce6f9' }}
          >
            <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#94a3b8' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`ค้นหา${tabLabel}...`}
              className="flex-1 bg-transparent text-sm outline-none placeholder-[#94a3b8]"
              style={{ color: '#1a2744' }}
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X className="w-3 h-3" style={{ color: '#94a3b8' }} />
              </button>
            )}
          </div>

          {/* Division filter (workunits only) */}
          {tab === 'workunits' && (
            <select
              value={divFilter}
              onChange={(e) => setDivFilter(e.target.value)}
              className="input-field text-sm py-2 w-auto"
            >
              <option value="">— ทุกฝ่าย —</option>
              {divisions.map((d) => (
                <option key={d.id} value={String(d.id)}>{d.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={openAdd}
            className="btn-primary flex items-center gap-1.5 ml-auto text-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            เพิ่ม{tabLabel}
          </button>
        </div>

        {/* Table */}
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
                  {tab === 'workunits' && (
                    <th className="px-4 py-3 text-left text-xs font-semibold w-44" style={{ color: '#94a3b8' }}>ฝ่าย</th>
                  )}
                  {tab === 'divisions' && (
                    <th className="px-4 py-3 text-center text-xs font-semibold w-28" style={{ color: '#94a3b8' }}>จำนวนงาน</th>
                  )}
                  <th className="px-4 py-3 text-center text-xs font-semibold w-24" style={{ color: '#94a3b8' }}>ผู้ใช้</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold w-28" style={{ color: '#94a3b8' }}>สถานะ</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold w-20" style={{ color: '#94a3b8' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {tab === 'divisions' && filtered.divisions.map((r, i) => (
                  <Row
                    key={r.id} index={i + 1}
                    name={r.name} code={r.code} isActive={r.isActive}
                    extra={<td className="px-4 py-3 text-center text-sm" style={{ color: '#4a6080' }}>{r._count.workUnits}</td>}
                    userCount={r._count.users}
                    onEdit={() => openEdit(r)}
                    onDelete={() => setConfirmDel({ id: r.id, name: r.name, tab })}
                  />
                ))}
                {tab === 'workunits' && filtered.workunits.map((r, i) => (
                  <Row
                    key={r.id} index={i + 1}
                    name={r.name} code={r.code} isActive={r.isActive}
                    extra={
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: '#f5f8ff', color: '#4a6080', border: '1px solid #dce6f9' }}
                        >
                          {r.division.name}
                        </span>
                      </td>
                    }
                    userCount={r._count.users}
                    onEdit={() => openEdit(r)}
                    onDelete={() => setConfirmDel({ id: r.id, name: r.name, tab })}
                  />
                ))}
                {tab === 'departments' && filtered.departments.map((r, i) => (
                  <Row
                    key={r.id} index={i + 1}
                    name={r.name} code={r.code} isActive={r.isActive}
                    userCount={r._count.users}
                    onEdit={() => openEdit(r)}
                    onDelete={() => setConfirmDel({ id: r.id, name: r.name, tab })}
                  />
                ))}
                {filtered[tab === 'divisions' ? 'divisions' : tab === 'workunits' ? 'workunits' : 'departments'].length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-sm" style={{ color: '#94a3b8' }}>
                      ไม่พบข้อมูล{tabLabel}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={closeModal} />
          <div
            className="relative w-full max-w-md rounded-2xl shadow-xl z-10"
            style={{ backgroundColor: '#ffffff', border: '1px solid #dce6f9' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #dce6f9' }}>
              <h3 className="font-semibold" style={{ color: '#1a2744' }}>
                {modal.mode === 'add' ? 'เพิ่ม' : 'แก้ไข'}{TAB_CONFIG.find((c) => c.key === modal.tab)?.label}
              </h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-[#f5f8ff] transition-colors">
                <X className="w-4 h-4" style={{ color: '#4a6080' }} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {formErr && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 px-3 py-2.5 rounded-lg text-sm">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {formErr}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>
                  ชื่อ{TAB_CONFIG.find((c) => c.key === modal.tab)?.label} <span className="text-red-500">*</span>
                </label>
                <input
                  value={modal.form.name}
                  onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, name: e.target.value } }))}
                  placeholder="กรอกชื่อ"
                  className="input-field"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>
                  รหัส <span className="text-red-500">*</span>
                  <span className="ml-1 font-normal" style={{ color: '#94a3b8' }}>(ตัวพิมพ์ใหญ่ เช่น ADM)</span>
                </label>
                <input
                  value={modal.form.code}
                  onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, code: e.target.value.toUpperCase() } }))}
                  placeholder="รหัส"
                  className="input-field font-mono tracking-wider"
                />
              </div>

              {modal.tab === 'workunits' && (
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>
                    สังกัดฝ่าย <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={modal.form.divisionId}
                    onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, divisionId: e.target.value } }))}
                    className="input-field"
                  >
                    <option value="">— เลือกฝ่าย —</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={String(d.id)}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* isActive toggle */}
              <div
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: '#f5f8ff', border: '1px solid #dce6f9' }}
              >
                <span className="text-sm" style={{ color: '#1a2744' }}>สถานะการใช้งาน</span>
                <button
                  type="button"
                  onClick={() => setModal((m) => ({ ...m, form: { ...m.form, isActive: !m.form.isActive } }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${modal.form.isActive ? 'bg-[#1d6ae5]' : 'bg-gray-300'}`}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                    style={{ left: modal.form.isActive ? '1.25rem' : '0.125rem' }}
                  />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-6 py-4" style={{ borderTop: '1px solid #dce6f9' }}>
              <button onClick={closeModal} disabled={saving} className="btn-secondary">ยกเลิก</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => !deleting && setConfirmDel(null)} />
          <div
            className="relative w-full max-w-sm rounded-2xl shadow-xl z-10 p-6 text-center"
            style={{ backgroundColor: '#ffffff', border: '1px solid #dce6f9' }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: '#fef2f2' }}
            >
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-base font-semibold mb-1" style={{ color: '#1a2744' }}>ยืนยันการลบ</h3>
            <p className="text-sm mb-1" style={{ color: '#4a6080' }}>
              ต้องการลบ <span className="font-semibold" style={{ color: '#1a2744' }}>"{confirmDel.name}"</span> ?
            </p>
            <p className="text-xs mb-5" style={{ color: '#94a3b8' }}>การดำเนินการนี้ไม่สามารถยกเลิกได้</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDel(null)}
                disabled={deleting}
                className="flex-1 btn-secondary"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 btn-danger flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Row helper ───────────────────────────────────────────────────────────────

interface RowProps {
  index:     number;
  name:      string;
  code:      string;
  isActive:  boolean;
  extra?:    React.ReactNode;
  userCount: number;
  onEdit:    () => void;
  onDelete:  () => void;
}

function Row({ index, name, code, isActive, extra, userCount, onEdit, onDelete }: RowProps) {
  return (
    <tr
      style={{ borderBottom: '1px solid #f5f8ff' }}
      className="hover:bg-[#fafbff] transition-colors group"
    >
      <td className="px-5 py-3.5 text-xs" style={{ color: '#94a3b8' }}>{index}</td>
      <td className="px-4 py-3.5 font-medium" style={{ color: '#1a2744' }}>{name}</td>
      <td className="px-4 py-3.5">
        <span
          className="font-mono text-xs px-2 py-0.5 rounded"
          style={{ backgroundColor: '#e8f0fe', color: '#1d6ae5' }}
        >
          {code}
        </span>
      </td>
      {extra}
      <td className="px-4 py-3.5 text-center text-xs" style={{ color: '#4a6080' }}>{userCount} คน</td>
      <td className="px-4 py-3.5">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
          style={
            isActive
              ? { backgroundColor: '#e6f9f0', color: '#0d9068' }
              : { backgroundColor: '#f1f5f9', color: '#94a3b8' }
          }
        >
          {isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-[#e8f0fe] transition-colors"
            title="แก้ไข"
          >
            <Pencil className="w-3.5 h-3.5" style={{ color: '#1d6ae5' }} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
            title="ลบ"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </td>
    </tr>
  );
}
