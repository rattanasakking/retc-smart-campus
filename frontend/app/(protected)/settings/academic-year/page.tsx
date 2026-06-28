'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Star, Trash2, Pencil, X, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import ThaiDatePicker from '@/components/ui/ThaiDatePicker';

interface AcademicYear {
  id: number; year: number; semester: number;
  startDate: string; endDate: string; isCurrent: boolean;
  createdAt: string;
}

const SEMESTERS = [1, 2, 3];

type Toast = { msg: string; ok: boolean };
type ModalMode = 'add' | 'edit';

interface FormState {
  year: string; semester: string; startDate: string; endDate: string;
}

const EMPTY_FORM: FormState = { year: '', semester: '1', startDate: '', endDate: '' };

export default function AcademicYearPage() {
  const [years, setYears]       = useState<AcademicYear[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<{ open: boolean; mode: ModalMode; id: number | null; form: FormState }>({
    open: false, mode: 'add', id: null, form: EMPTY_FORM,
  });
  const [saving, setSaving]     = useState(false);
  const [formErr, setFormErr]   = useState('');
  const [delId, setDelId]       = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast]       = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, ok });
    timer.current = setTimeout(() => setToast(null), 3500);
  };

  const fetchYears = useCallback(async () => {
    try {
      const res = await api.get<{ data: AcademicYear[] }>('/settings/academic-years');
      setYears(res.data);
    } catch (e: unknown) {
      showToast((e as Error).message, false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchYears(); }, [fetchYears]);

  const openAdd = () => {
    setModal({ open: true, mode: 'add', id: null, form: EMPTY_FORM });
    setFormErr('');
  };
  const openEdit = (y: AcademicYear) => {
    setModal({
      open: true, mode: 'edit', id: y.id,
      form: {
        year: String(y.year), semester: String(y.semester),
        startDate: y.startDate.slice(0, 10),
        endDate:   y.endDate.slice(0, 10),
      },
    });
    setFormErr('');
  };

  const handleSave = async () => {
    const { mode, id, form } = modal;
    if (!form.year || !form.semester || !form.startDate || !form.endDate) {
      setFormErr('กรุณากรอกข้อมูลให้ครบ'); return;
    }
    setSaving(true); setFormErr('');
    try {
      if (mode === 'add') {
        await api.post('/settings/academic-years', form);
      } else {
        await api.put(`/settings/academic-years/${id}`, form);
      }
      setModal((m) => ({ ...m, open: false }));
      showToast(`${mode === 'add' ? 'เพิ่ม' : 'แก้ไข'}ปีการศึกษาสำเร็จ`, true);
      fetchYears();
    } catch (e: unknown) {
      setFormErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const setCurrent = async (id: number) => {
    try {
      await api.put(`/settings/academic-years/${id}/set-current`, {});
      showToast('ตั้งปีการศึกษาปัจจุบันสำเร็จ', true);
      fetchYears();
    } catch (e: unknown) {
      showToast((e as Error).message, false);
    }
  };

  const handleDelete = async () => {
    if (!delId) return;
    setDeleting(true);
    try {
      await api.delete(`/settings/academic-years/${delId}`);
      setDelId(null);
      showToast('ลบปีการศึกษาสำเร็จ', true);
      fetchYears();
    } catch (e: unknown) {
      setDelId(null);
      showToast((e as Error).message, false);
    } finally {
      setDeleting(false);
    }
  };

  const thDate = (d: string) => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">ปีการศึกษา</h1>
          <p className="text-xs text-gray-400 mt-0.5">จัดการปีการศึกษาและภาคเรียน</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500
                     text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> เพิ่มปีการศึกษา
        </button>
      </div>

      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลด...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-700/60">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">ปีการศึกษา</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">ภาคเรียน</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">วันที่เริ่ม</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">วันที่สิ้นสุด</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">สถานะ</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 w-28">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700/40">
              {years.map((y) => (
                <tr key={y.id} className="hover:bg-navy-700/20 transition-colors group">
                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-gray-200">{y.year}</span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-300">ภาคเรียนที่ {y.semester}</td>
                  <td className="px-4 py-3.5 text-gray-400 text-xs">{thDate(y.startDate)}</td>
                  <td className="px-4 py-3.5 text-gray-400 text-xs">{thDate(y.endDate)}</td>
                  <td className="px-4 py-3.5 text-center">
                    {y.isCurrent ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-900/50 text-yellow-300 border border-yellow-700/50">
                        <Star className="w-3 h-3" /> ปัจจุบัน
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs text-gray-500 bg-navy-700/50 border border-navy-600/50">
                        ไม่ใช้งาน
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!y.isCurrent && (
                        <button
                          onClick={() => setCurrent(y.id)}
                          className="p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-yellow-900/30 rounded-lg transition-colors"
                          title="ตั้งเป็นปัจจุบัน"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(y)}
                        className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="แก้ไข"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {!y.isCurrent && (
                        <button
                          onClick={() => setDelId(y.id)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                          title="ลบ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {years.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-gray-500 text-sm">ยังไม่มีปีการศึกษา</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !saving && setModal((m) => ({ ...m, open: false }))}>
          <div className="bg-navy-800 border border-navy-600 rounded-2xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-navy-600">
              <h3 className="font-semibold text-gray-100">
                {modal.mode === 'add' ? 'เพิ่ม' : 'แก้ไข'}ปีการศึกษา
              </h3>
              <button onClick={() => setModal((m) => ({ ...m, open: false }))} className="text-gray-500 hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {formErr && (
                <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 text-red-300 px-3 py-2.5 rounded-lg text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {formErr}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">ปีการศึกษา (พ.ศ.) *</label>
                  <input
                    type="number" value={modal.form.year} placeholder="2567"
                    onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, year: e.target.value } }))}
                    className="input-field" autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">ภาคเรียน *</label>
                  <select
                    value={modal.form.semester}
                    onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, semester: e.target.value } }))}
                    className="input-field"
                  >
                    {SEMESTERS.map((s) => <option key={s} value={s}>ภาคเรียนที่ {s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">วันที่เริ่ม *</label>
                  <ThaiDatePicker value={modal.form.startDate}
                    onChange={(v) => setModal((m) => ({ ...m, form: { ...m.form, startDate: v } }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">วันที่สิ้นสุด *</label>
                  <ThaiDatePicker value={modal.form.endDate} min={modal.form.startDate}
                    onChange={(v) => setModal((m) => ({ ...m, form: { ...m.form, endDate: v } }))} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-navy-600">
              <button onClick={() => setModal((m) => ({ ...m, open: false }))} disabled={saving}
                className="px-4 py-2 text-sm text-gray-300 bg-navy-700 hover:bg-navy-600 rounded-lg transition-colors disabled:opacity-50">
                ยกเลิก
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-60">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {delId !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !deleting && setDelId(null)}>
          <div className="bg-navy-800 border border-navy-600 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center"
            onClick={(e) => e.stopPropagation()}>
            <Trash2 className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-100 mb-1">ยืนยันการลบ</h3>
            <p className="text-sm text-gray-400 mb-4">การดำเนินการนี้ไม่สามารถยกเลิกได้</p>
            <div className="flex gap-3">
              <button onClick={() => setDelId(null)} disabled={deleting}
                className="flex-1 py-2.5 text-sm text-gray-300 bg-navy-700 hover:bg-navy-600 rounded-lg transition-colors disabled:opacity-50">
                ยกเลิก
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-60">
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium
          ${toast.ok ? 'bg-green-900/90 border-green-700 text-green-200' : 'bg-red-900/90 border-red-700 text-red-200'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
