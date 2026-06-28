'use client';
import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Loader2, Briefcase } from 'lucide-react';
import { api } from '@/lib/api';

export default function PositionsPage() {
  const [positions, setPositions] = useState<string[]>([]);
  const [loading, setLoading]     = useState(true);
  const [newName, setNewName]     = useState('');
  const [adding, setAdding]       = useState(false);
  const [editIdx, setEditIdx]     = useState<number | null>(null);
  const [editName, setEditName]   = useState('');
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState('');
  const [toastErr, setToastErr]   = useState(false);

  const showToast = (msg: string, err = false) => {
    setToast(msg); setToastErr(err);
    setTimeout(() => setToast(''), 3000);
  };

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ data: string[] }>('/settings/positions');
      setPositions(r.data ?? []);
    } catch { showToast('โหลดข้อมูลไม่สำเร็จ', true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const r = await api.post<{ data: string[] }>('/settings/positions', { name: newName.trim() });
      setPositions(r.data ?? []); setNewName(''); showToast('เพิ่มตำแหน่งสำเร็จ');
    } catch (e) { showToast((e as Error).message, true); }
    finally { setAdding(false); }
  };

  const handleEdit = async (idx: number) => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const r = await api.put<{ data: string[] }>(`/settings/positions/${idx}`, { name: editName.trim() });
      setPositions(r.data ?? []); setEditIdx(null); showToast('แก้ไขสำเร็จ');
    } catch (e) { showToast((e as Error).message, true); }
    finally { setSaving(false); }
  };

  const handleDelete = async (idx: number) => {
    if (!confirm(`ลบตำแหน่ง "${positions[idx]}" ?`)) return;
    try {
      const r = await api.delete<{ data: string[] }>(`/settings/positions/${idx}`);
      setPositions(r.data ?? []); showToast('ลบตำแหน่งสำเร็จ');
    } catch (e) { showToast((e as Error).message, true); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48 gap-2 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลด...
    </div>
  );

  return (
    <div className="max-w-xl space-y-5">
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow text-sm font-medium text-white ${toastErr ? 'bg-red-500' : 'bg-green-600'}`}>
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-[#1a2744] flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-[#1d6ae5]" /> จัดการตำแหน่ง
        </h1>
        <p className="text-sm text-[#94a3b8] mt-1">เพิ่ม แก้ไข หรือลบตำแหน่งบุคลากร</p>
      </div>

      {/* Add new */}
      <div className="card flex gap-2">
        <input
          className="input-field flex-1"
          placeholder="ชื่อตำแหน่งใหม่ เช่น ครูอัตราจ้าง"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} disabled={adding || !newName.trim()} className="btn-primary flex items-center gap-1.5 px-4">
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          เพิ่ม
        </button>
      </div>

      {/* List */}
      <div className="card divide-y divide-[#dce6f9]">
        {positions.length === 0 && (
          <p className="text-sm text-[#94a3b8] py-4 text-center">ยังไม่มีตำแหน่ง — เพิ่มตำแหน่งแรกด้านบน</p>
        )}
        {positions.map((pos, idx) => (
          <div key={idx} className="flex items-center gap-2 py-2.5 first:pt-0 last:pb-0">
            {editIdx === idx ? (
              <>
                <input
                  className="input-field flex-1 text-sm py-1.5"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEdit(idx)}
                  autoFocus
                />
                <button onClick={() => handleEdit(idx)} disabled={saving} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button onClick={() => setEditIdx(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50">
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-[#1a2744]">{pos}</span>
                <button onClick={() => { setEditIdx(idx); setEditName(pos); }} className="p-1.5 rounded-lg text-[#4a6080] hover:bg-[#f5f8ff]">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(idx)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
