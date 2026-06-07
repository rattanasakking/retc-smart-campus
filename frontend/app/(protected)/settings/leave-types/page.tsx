'use client';
import { useEffect, useState } from 'react';
import { Plus, Pencil, ToggleLeft, ToggleRight, X, Check, AlertTriangle, CalendarX } from 'lucide-react';
import { api } from '@/lib/api';

interface LeaveType {
  id: number; name: string; icon: string | null;
  maxDaysPerYear: number | null; requireDocument: boolean;
  requireApprovalLevel: number; allowHalfDay: boolean; isActive: boolean;
}

const EMPTY: Omit<LeaveType, 'id' | 'isActive'> = {
  name: '', icon: '🏥', maxDaysPerYear: null,
  requireDocument: false, requireApprovalLevel: 1, allowHalfDay: true,
};

export default function LeaveTypesPage() {
  const [types, setTypes]   = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState<{ mode: 'add' | 'edit'; data: Partial<LeaveType> } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState('');
  const [toastErr, setToastErr] = useState('');

  const showToast = (msg: string, err = false) => {
    if (err) { setToastErr(msg); setToast(''); } else { setToast(msg); setToastErr(''); }
    setTimeout(() => { setToast(''); setToastErr(''); }, 3000);
  };

  const load = () => {
    setLoading(true);
    api.get<{ data: LeaveType[] }>('/personnel/leave-types?all=true')
      .then((r) => setTypes(r.data ?? []))
      .catch(() => showToast('โหลดข้อมูลล้มเหลว', true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => setModal({ mode: 'add', data: { ...EMPTY } });
  const openEdit = (t: LeaveType) => setModal({ mode: 'edit', data: { ...t } });

  const setField = (k: keyof LeaveType, v: unknown) =>
    setModal((m) => m ? { ...m, data: { ...m.data, [k]: v } } : null);

  const save = async () => {
    if (!modal) return;
    const d = modal.data;
    if (!d.name?.trim()) { showToast('กรุณาระบุชื่อประเภทการลา', true); return; }
    setSaving(true);
    try {
      const body = {
        name: d.name!.trim(), icon: d.icon || '🏥',
        maxDaysPerYear: d.maxDaysPerYear ?? null,
        requireDocument: !!d.requireDocument,
        requireApprovalLevel: d.requireApprovalLevel ?? 1,
        allowHalfDay: d.allowHalfDay !== false,
        ...(modal.mode === 'edit' && { isActive: d.isActive }),
      };
      if (modal.mode === 'add') {
        await api.post('/personnel/leave-types', body);
        showToast('เพิ่มประเภทการลาสำเร็จ');
      } else {
        await api.put(`/personnel/leave-types/${d.id}`, body);
        showToast('แก้ไขสำเร็จ');
      }
      setModal(null);
      load();
    } catch (e: unknown) {
      showToast((e as Error).message ?? 'เกิดข้อผิดพลาด', true);
    } finally { setSaving(false); }
  };

  const toggleActive = async (t: LeaveType) => {
    try {
      await api.put(`/personnel/leave-types/${t.id}`, { isActive: !t.isActive });
      showToast(t.isActive ? 'ปิดใช้งานแล้ว' : 'เปิดใช้งานแล้ว');
      load();
    } catch (e: unknown) { showToast((e as Error).message, true); }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Toast */}
      {(toast || toastErr) && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 ${toastErr ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {toastErr ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast || toastErr}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <CalendarX className="w-5 h-5" style={{ color: '#1d6ae5' }} />
          <h1 className="text-lg font-bold" style={{ color: '#1a2744' }}>ประเภทการลา</h1>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-1.5 text-sm py-2">
          <Plus className="w-4 h-4" /> เพิ่มประเภท
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #dce6f9' }}>
        {loading ? (
          <div className="py-12 text-center text-sm" style={{ color: '#94a3b8' }}>กำลังโหลด...</div>
        ) : types.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: '#94a3b8' }}>ยังไม่มีประเภทการลา</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#f8faff', borderBottom: '1px solid #f0f4ff' }}>
                {['ประเภทการลา','จำนวนวัน/ปี','ต้องแนบเอกสาร','ลาครึ่งวัน','ระดับอนุมัติ','สถานะ','จัดการ'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#94a3b8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f5f8ff' }} className="hover:bg-[#fafbff]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{t.icon ?? '🏥'}</span>
                      <span className="font-medium" style={{ color: '#1a2744' }}>{t.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: '#4a6080' }}>
                    {t.maxDaysPerYear != null ? `${t.maxDaysPerYear} วัน` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.requireDocument ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                      {t.requireDocument ? 'ต้องแนบ' : 'ไม่ต้องแนบ'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.allowHalfDay ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                      {t.allowHalfDay ? 'ได้' : 'ไม่ได้'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center" style={{ color: '#4a6080' }}>
                    {t.requireApprovalLevel} ระดับ
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(t)} className="flex items-center gap-1 text-xs">
                      {t.isActive
                        ? <><ToggleRight className="w-5 h-5 text-green-500" /><span style={{ color: '#0d9068' }}>เปิด</span></>
                        : <><ToggleLeft className="w-5 h-5" style={{ color: '#94a3b8' }} /><span style={{ color: '#94a3b8' }}>ปิด</span></>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                      <Pencil className="w-3.5 h-3.5" style={{ color: '#1d6ae5' }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #dce6f9' }}>
              <h2 className="font-bold text-base" style={{ color: '#1a2744' }}>
                {modal.mode === 'add' ? 'เพิ่มประเภทการลา' : 'แก้ไขประเภทการลา'}
              </h2>
              <button onClick={() => setModal(null)}><X className="w-4 h-4" style={{ color: '#4a6080' }} /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-[80px_1fr] gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#4a6080' }}>ไอคอน</label>
                  <input type="text" value={modal.data.icon ?? '🏥'} maxLength={4}
                    onChange={(e) => setField('icon', e.target.value)}
                    className="input-field text-center text-2xl py-1.5" />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#4a6080' }}>ชื่อประเภทการลา <span className="text-red-500">*</span></label>
                  <input value={modal.data.name ?? ''} onChange={(e) => setField('name', e.target.value)}
                    placeholder="เช่น ลาป่วย, ลากิจ" className="input-field" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#4a6080' }}>จำนวนวันสูงสุด/ปี (ว่างหมายถึงไม่จำกัด)</label>
                <input type="number" min="0" step="0.5"
                  value={modal.data.maxDaysPerYear ?? ''}
                  onChange={(e) => setField('maxDaysPerYear', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="ไม่จำกัด" className="input-field" />
              </div>

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#4a6080' }}>ระดับการอนุมัติ</label>
                <select value={modal.data.requireApprovalLevel ?? 1}
                  onChange={(e) => setField('requireApprovalLevel', parseInt(e.target.value))}
                  className="input-field">
                  <option value={1}>1 ระดับ (หัวหน้างาน/ฝ่าย)</option>
                  <option value={2}>2 ระดับ (ผ่านหัวหน้า + ผู้บริหาร)</option>
                </select>
              </div>

              <div className="space-y-2">
                {([
                  { key: 'requireDocument', label: 'ต้องแนบเอกสารประกอบ' },
                  { key: 'allowHalfDay',    label: 'อนุญาตให้ลาครึ่งวัน' },
                ] as const).map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2.5 text-sm cursor-pointer">
                    <input type="checkbox" checked={!!modal.data[key]}
                      onChange={(e) => setField(key, e.target.checked)}
                      className="w-4 h-4 rounded" />
                    <span style={{ color: '#1a2744' }}>{label}</span>
                  </label>
                ))}
              </div>

              {modal.mode === 'edit' && (
                <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!modal.data.isActive}
                    onChange={(e) => setField('isActive', e.target.checked)}
                    className="w-4 h-4 rounded" />
                  <span style={{ color: '#1a2744' }}>เปิดใช้งาน</span>
                </label>
              )}
            </div>
            <div className="flex gap-2 px-5 py-4" style={{ borderTop: '1px solid #dce6f9' }}>
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">ยกเลิก</button>
              <button onClick={save} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
