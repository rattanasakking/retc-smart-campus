'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import WorkLogForm, { WorkLogFormData } from '../../_components/WorkLogForm';

export default function WorkLogEditPage() {
  const router          = useRouter();
  const { id }          = useParams<{ id: string }>();
  const [initial, setInitial] = useState<Partial<WorkLogFormData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState('');
  const [toastErr, setErr]    = useState('');

  const showToast = (msg: string, isErr = false) => {
    if (isErr) { setErr(msg); setToast(''); } else { setToast(msg); setErr(''); }
    setTimeout(() => { setToast(''); setErr(''); }, 3000);
  };

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ data: {
        logDate: string; workTypeId: number; title: string; detail: string | null;
        startTime: string | null; endTime: string | null;
        gpsLat: string | null; gpsLng: string | null;
        attachments: string[]; status: string;
      } }>(`/worklog/${id}`);
      const d = res.data;
      if (!['draft', 'returned'].includes(d.status)) {
        showToast('ไม่สามารถแก้ไขบันทึกนี้ได้', true);
        setTimeout(() => router.push(`/worklog/${id}`), 1200);
        return;
      }
      setInitial({
        logDate:     d.logDate.substring(0, 10),
        workTypeId:  String(d.workTypeId),
        title:       d.title,
        detail:      d.detail ?? '',
        startTime:   d.startTime ?? '08:00',
        endTime:     d.endTime   ?? '17:00',
        gpsLat:      d.gpsLat   ?? '',
        gpsLng:      d.gpsLng   ?? '',
        attachments: d.attachments,
      });
    } catch (e: unknown) {
      showToast((e as Error).message, true);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data: WorkLogFormData, submitNow: boolean) => {
    setSaving(true);
    try {
      await api.put(`/worklog/${id}`, data);
      if (submitNow) {
        await api.post(`/worklog/${id}/submit`, {});
        showToast('บันทึกและส่งอนุมัติสำเร็จ');
      } else {
        showToast('บันทึกสำเร็จ');
      }
      setTimeout(() => router.push(`/worklog/${id}`), 900);
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
        <button onClick={() => router.push(`/worklog/${id}`)} className="p-2 rounded-xl hover:bg-[#f5f8ff] transition-colors">
          <ChevronLeft className="w-4 h-4" style={{ color: '#4a6080' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>แก้ไขบันทึกปฏิบัติงาน</h1>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3" style={{ color: '#94a3b8' }}>
            <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลด...
          </div>
        ) : initial ? (
          <WorkLogForm
            initial={initial}
            onSave={handleSave}
            onCancel={() => router.push(`/worklog/${id}`)}
            saving={saving}
            isEdit
          />
        ) : null}
      </div>
    </div>
  );
}
