'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ChevronLeft, MapPin, Camera, Pencil, Send, Check, AlertTriangle,
  Loader2, User, Calendar, Clock, CheckCircle, XCircle, RotateCcw,
} from 'lucide-react';
import { api, USER_KEY } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkType { id: number; name: string; color: string; category: string }

interface Approval {
  id:        number;
  status:    string;
  comment:   string | null;
  createdAt: string;
  approver:  { id: number; name: string; position: string | null };
}

interface WorkLogDetail {
  id:          number;
  userId:      number;
  logDate:     string;
  title:       string;
  detail:      string | null;
  startTime:   string | null;
  endTime:     string | null;
  gpsLat:      string | null;
  gpsLng:      string | null;
  attachments: string[];
  status:      string;
  createdAt:   string;
  updatedAt:   string;
  workType:    WorkType | null;
  user:        { id: number; name: string; employeeId: string; position: string | null };
  approvals:   Approval[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  draft:     { label: '📝 ร่าง',      bg: '#f1f5f9', text: '#64748b', icon: '📝' },
  submitted: { label: '⏳ รออนุมัติ', bg: '#fffbeb', text: '#b45309', icon: '⏳' },
  approved:  { label: '✅ อนุมัติ',   bg: '#e6f9f0', text: '#0d9068', icon: '✅' },
  rejected:  { label: '❌ ปฏิเสธ',   bg: '#fef2f2', text: '#dc2626', icon: '❌' },
  returned:  { label: '🔄 ส่งคืน',   bg: '#e8f0fe', text: '#1d6ae5', icon: '🔄' },
};

const APPROVAL_META: Record<string, { label: string; color: string }> = {
  approved: { label: '✅ อนุมัติ', color: '#0d9068' },
  rejected: { label: '❌ ปฏิเสธ', color: '#dc2626' },
  returned: { label: '🔄 ส่งคืน', color: '#1d6ae5' },
};

const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear() + 543}`;
}
function fmtDateTime(d: string) {
  const dt = new Date(d);
  return `${fmtDate(d)} ${dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`;
}

const POS_LABEL: Record<string, string> = {
  teacher: 'ครู/อาจารย์', work_unit_chief: 'หน.งาน', department_chief: 'หน.แผนก',
  director: 'ผู้อำนวยการ', deputy_director: 'รองผู้อำนวยการ',
  division_chief: 'หน.ฝ่าย', specialist: 'ผู้เชี่ยวชาญ', officer: 'เจ้าหน้าที่',
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkLogDetailPage() {
  const router             = useRouter();
  const { id }             = useParams<{ id: string }>();
  const [log, setLog]      = useState<WorkLogDetail | null>(null);
  const [loading, setLoad] = useState(true);
  const [comment, setComment] = useState('');
  const [approving, setApproving] = useState<'approve' | 'return' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [currentUserId, setCurrentId] = useState<number | null>(null);
  const [isApprover, setApprover]     = useState(false);
  const [toast, setToast]     = useState('');
  const [toastErr, setToastErr] = useState('');

  const showToast = (msg: string, isErr = false) => {
    if (isErr) { setToastErr(msg); setToast(''); } else { setToast(msg); setToastErr(''); }
    setTimeout(() => { setToast(''); setToastErr(''); }, 3000);
  };

  useEffect(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return;
    try {
      const u = JSON.parse(raw);
      setCurrentId(u.id);
      const APPROVER_POS = ['work_unit_chief', 'department_chief', 'division_chief', 'director', 'deputy_director'];
      setApprover(!!u.isSuperAdmin || u.role === 'admin' || u.role === 'executive' || APPROVER_POS.includes(u.position));
    } catch { /* ignore */ }
  }, []);

  const load = useCallback(async () => {
    setLoad(true);
    try {
      const res = await api.get<{ data: WorkLogDetail }>(`/worklog/${id}`);
      setLog(res.data);
    } catch (e: unknown) {
      showToast((e as Error).message, true);
    } finally {
      setLoad(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post(`/worklog/${id}/submit`, {});
      showToast('ส่งขออนุมัติสำเร็จ');
      load();
    } catch (e: unknown) { showToast((e as Error).message, true); }
    finally { setSubmitting(false); }
  };

  const handleApprove = async () => {
    setApproving('approve');
    try {
      await api.put(`/worklog/${id}/approve`, { comment: comment.trim() || undefined });
      showToast('อนุมัติสำเร็จ');
      setComment('');
      load();
    } catch (e: unknown) { showToast((e as Error).message, true); }
    finally { setApproving(null); }
  };

  const handleReturn = async () => {
    if (!comment.trim()) { showToast('กรุณาระบุเหตุผลการส่งคืน', true); return; }
    setApproving('return');
    try {
      await api.put(`/worklog/${id}/return`, { comment: comment.trim() });
      showToast('ส่งคืนสำเร็จ');
      setComment('');
      load();
    } catch (e: unknown) { showToast((e as Error).message, true); }
    finally { setApproving(null); }
  };

  const isOwner = log?.userId === currentUserId;
  const statusMeta = log ? (STATUS_META[log.status] ?? STATUS_META.draft) : null;

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Toast */}
      {(toast || toastErr) && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 ${toastErr ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {toastErr ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast || toastErr}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-w-full max-h-[90vh] rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => router.push('/worklog')} className="p-2 rounded-xl hover:bg-[#f5f8ff] transition-colors flex-shrink-0">
          <ChevronLeft className="w-4 h-4" style={{ color: '#4a6080' }} />
        </button>
        {log && (
          <>
            <h1 className="text-lg font-bold flex-1 min-w-0 truncate" style={{ color: '#1a2744' }}>{log.title}</h1>
            <span className="px-3 py-1 rounded-full text-sm font-medium flex-shrink-0" style={{ backgroundColor: statusMeta?.bg, color: statusMeta?.text }}>
              {statusMeta?.label}
            </span>
          </>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3" style={{ color: '#94a3b8' }}>
          <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลด...
        </div>
      ) : log ? (
        <>
          {/* Meta */}
          <div className="card space-y-3">
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <span className="flex items-center gap-1.5 text-sm" style={{ color: '#4a6080' }}>
                <User className="w-3.5 h-3.5" /> {log.user.name}
                <span className="text-xs" style={{ color: '#94a3b8' }}>({POS_LABEL[log.user.position ?? ''] ?? log.user.position ?? ''})</span>
              </span>
              <span className="flex items-center gap-1.5 text-sm" style={{ color: '#4a6080' }}>
                <Calendar className="w-3.5 h-3.5" /> {fmtDate(log.logDate)}
              </span>
              {(log.startTime || log.endTime) && (
                <span className="flex items-center gap-1.5 text-sm" style={{ color: '#4a6080' }}>
                  <Clock className="w-3.5 h-3.5" />
                  {log.startTime ?? '??'} – {log.endTime ?? '??'} น.
                </span>
              )}
            </div>
            {log.workType && (
              <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: log.workType.color + '22', color: log.workType.color }}>
                {log.workType.category} › {log.workType.name}
              </span>
            )}
            {log.detail && (
              <p className="text-sm whitespace-pre-line" style={{ color: '#1a2744' }}>{log.detail}</p>
            )}
          </div>

          {/* GPS Map */}
          {log.gpsLat && log.gpsLng && (
            <div className="card !p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4" style={{ color: '#dc2626' }} />
                <span className="text-sm font-medium" style={{ color: '#1a2744' }}>ตำแหน่งที่บันทึก</span>
                <span className="text-xs" style={{ color: '#94a3b8' }}>lat: {log.gpsLat} · lng: {log.gpsLng}</span>
              </div>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #dce6f9' }}>
                <iframe
                  src={`https://maps.google.com/maps?q=${log.gpsLat},${log.gpsLng}&z=15&output=embed`}
                  width="100%"
                  height="220"
                  loading="lazy"
                  className="block"
                  title="GPS map"
                />
              </div>
            </div>
          )}

          {/* Attachments */}
          {log.attachments.length > 0 && (
            <div className="card !p-4">
              <div className="flex items-center gap-2 mb-3">
                <Camera className="w-4 h-4" style={{ color: '#7c3aed' }} />
                <span className="text-sm font-medium" style={{ color: '#1a2744' }}>รูปภาพแนบ ({log.attachments.length} รูป)</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {log.attachments.map((url, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ border: '1px solid #dce6f9' }}
                    onClick={() => setLightbox(url)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="card !p-4">
            <p className="text-sm font-semibold mb-4" style={{ color: '#1a2744' }}>📋 ประวัติการดำเนินการ</p>
            <div className="space-y-3 pl-2">
              {/* Created */}
              <TimelineItem
                icon={<span className="text-base">📝</span>}
                label="สร้างบันทึก"
                time={fmtDateTime(log.createdAt)}
                color="#1d6ae5"
              />
              {/* Approvals */}
              {log.approvals.map((a) => {
                const m = APPROVAL_META[a.status];
                return (
                  <TimelineItem
                    key={a.id}
                    icon={<span className="text-base">{a.status === 'approved' ? '✅' : a.status === 'returned' ? '🔄' : '❌'}</span>}
                    label={`${m?.label ?? a.status} โดย ${a.approver.name}`}
                    time={fmtDateTime(a.createdAt)}
                    color={m?.color ?? '#64748b'}
                    comment={a.comment ?? undefined}
                  />
                );
              })}
              {/* Current status if submitted */}
              {log.status === 'submitted' && (
                <TimelineItem
                  icon={<span className="text-base">⏳</span>}
                  label="รออนุมัติ"
                  time=""
                  color="#b45309"
                  pending
                />
              )}
            </div>
          </div>

          {/* Owner actions */}
          {isOwner && ['draft', 'returned'].includes(log.status) && (
            <div className="flex gap-2 justify-end">
              <button onClick={() => router.push(`/worklog/${id}/edit`)} className="btn-secondary flex items-center gap-1.5 text-sm">
                <Pencil className="w-3.5 h-3.5" /> แก้ไข
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary flex items-center gap-1.5 text-sm"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <Send className="w-3.5 h-3.5" /> ส่งอนุมัติ
              </button>
            </div>
          )}

          {/* Approver actions */}
          {isApprover && log.status === 'submitted' && (
            <div className="card !p-4 space-y-3" style={{ border: '1px solid #dce6f9' }}>
              <p className="text-sm font-semibold" style={{ color: '#1a2744' }}>การดำเนินการ (ผู้อนุมัติ)</p>
              <textarea
                className="input-field resize-none"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="ความเห็น / เหตุผล (ต้องกรอกหากส่งคืน)"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleReturn}
                  disabled={!!approving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#e8f0fe', color: '#1d6ae5' }}
                >
                  {approving === 'return' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <RotateCcw className="w-3.5 h-3.5" /> ส่งคืนแก้ไข
                </button>
                <button
                  onClick={handleApprove}
                  disabled={!!approving}
                  className="btn-primary flex items-center gap-1.5 text-sm"
                >
                  {approving === 'approve' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <CheckCircle className="w-3.5 h-3.5" /> อนุมัติ
                </button>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

// ─── Timeline Item ────────────────────────────────────────────────────────────

function TimelineItem({
  icon, label, time, color, comment, pending,
}: {
  icon: React.ReactNode;
  label: string;
  time: string;
  color: string;
  comment?: string;
  pending?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
          style={{ backgroundColor: pending ? '#f5f8ff' : color + '22', border: `1px solid ${color}44` }}
        >
          {icon}
        </div>
        <div className="w-px flex-1 mt-1" style={{ backgroundColor: '#dce6f9' }} />
      </div>
      <div className="pb-4">
        <p className="text-sm font-medium" style={{ color: pending ? '#94a3b8' : '#1a2744' }}>{label}</p>
        {time && <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{time}</p>}
        {comment && (
          <p className="text-xs mt-1 px-2 py-1.5 rounded-lg" style={{ backgroundColor: '#f5f8ff', color: '#4a6080' }}>
            💬 {comment}
          </p>
        )}
      </div>
    </div>
  );
}
