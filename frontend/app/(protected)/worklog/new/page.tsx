'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Check, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import WorkLogForm, { WorkLogFormData } from '../_components/WorkLogForm';

export default function WorkLogNewPage() {
  const router          = useRouter();
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState('');
  const [toastErr, setErr]  = useState('');

  const showToast = (msg: string, isErr = false) => {
    if (isErr) { setErr(msg); setToast(''); } else { setToast(msg); setErr(''); }
    setTimeout(() => { setToast(''); setErr(''); }, 3000);
  };

  const handleSave = async (data: WorkLogFormData, submitNow: boolean) => {
    setSaving(true);
    try {
      const res = await api.post<{ data: { id: number } }>('/worklog', data);
      const id = res.data.id;
      if (submitNow) {
        await api.post(`/worklog/${id}/submit`, {});
        showToast('บันทึกและส่งอนุมัติสำเร็จ');
      } else {
        showToast('บันทึกร่างสำเร็จ');
      }
      setTimeout(() => router.push('/worklog'), 900);
    } catch (e: unknown) {
      showToast((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      {/* Toast */}
      {(toast || toastErr) && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 ${toastErr ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {toastErr ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast || toastErr}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/worklog')} className="p-2 rounded-xl hover:bg-[#f5f8ff] transition-colors">
          <ChevronLeft className="w-4 h-4" style={{ color: '#4a6080' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>บันทึกปฏิบัติงานใหม่</h1>
      </div>

      <div className="card">
        <WorkLogForm
          onSave={handleSave}
          onCancel={() => router.push('/worklog')}
          saving={saving}
        />
      </div>
    </div>
  );
}
