'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, CheckCircle, XCircle, Clock, Ban, AlertTriangle, FileText, ExternalLink } from 'lucide-react';
import { api, USER_KEY } from '@/lib/api';

interface LeaveRequest {
  id: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  leaveType: { id: number; name: string; icon?: string; requireApprovalLevel: number };
  user: { id: number; name: string; department?: string; avatar?: string };
  startDate: string;
  endDate: string;
  totalDays: number;
  isHalfDay: boolean;
  halfDayPeriod?: string;
  reason: string;
  attachments?: string;
  substitute?: { id: number; name: string } | null;
  approvals: {
    id: number; level: number; status: string; comment?: string;
    approver: { id: number; name: string; position?: string; avatar?: string } | null;
  }[];
  createdAt: string;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  PENDING:   { label: 'รออนุมัติ',   color: '#b45309', bg: '#fffbeb', icon: <Clock size={16} /> },
  APPROVED:  { label: 'อนุมัติแล้ว', color: '#0d9068', bg: '#e6f9f0', icon: <CheckCircle size={16} /> },
  REJECTED:  { label: 'ไม่อนุมัติ', color: '#dc2626', bg: '#fff0f0', icon: <XCircle size={16} /> },
  CANCELLED: { label: 'ยกเลิกแล้ว', color: '#64748b', bg: '#f1f5f9', icon: <Ban size={16} /> },
};

export default function LeaveDetailPage() {
  const { id } = useParams();
  const router  = useRouter();

  const [request, setRequest]     = useState<LeaveRequest | null>(null);
  const [loading, setLoading]     = useState(true);
  const [isApprover, setIsApprover] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const [showReject, setShowReject]   = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing]           = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const u = localStorage.getItem(USER_KEY);
    if (u) {
      const p = JSON.parse(u);
      setIsApprover(['admin', 'executive'].includes(p.role) || p.isSuperAdmin);
      setCurrentUserId(p.id);
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    api.get<any>(`/personnel/leaves/${id}`)
      .then((r) => setRequest(r.data))
      .finally(() => setLoading(false));
  }, [id]);

  function formatThaiDate(d: string) {
    const date = new Date(d);
    return date.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      .replace(date.getFullYear().toString(), (date.getFullYear() + 543).toString());
  }

  async function handleApprove() {
    if (!request) return;
    setActing(true);
    setActionError('');
    try {
      await api.put(`/personnel/leaves/${request.id}/approve`, {});
      const res = await api.get<any>(`/personnel/leaves/${request.id}`);
      setRequest(res.data);
    } catch (e: any) { setActionError(e.message); }
    finally { setActing(false); }
  }

  async function handleReject() {
    if (!request || !rejectReason.trim()) {
      setActionError('กรุณาระบุเหตุผลที่ไม่อนุมัติ');
      return;
    }
    setActing(true);
    setActionError('');
    try {
      await api.put(`/personnel/leaves/${request.id}/reject`, { comment: rejectReason });
      const res = await api.get<any>(`/personnel/leaves/${request.id}`);
      setRequest(res.data);
      setShowReject(false);
    } catch (e: any) { setActionError(e.message); }
    finally { setActing(false); }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-gray-400"><Loader2 className="animate-spin" size={24} /></div>;
  }
  if (!request) {
    return <div className="p-6 text-center text-gray-400">ไม่พบคำขอลา</div>;
  }

  const st = STATUS_META[request.status];
  const isOwner = currentUserId === request.user.id;

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-800">รายละเอียดใบลา</h1>
      </div>

      {/* Status banner */}
      <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: st.bg }}>
        <span style={{ color: st.color }}>{st.icon}</span>
        <span className="font-semibold" style={{ color: st.color }}>{st.label}</span>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-xl shadow p-5 space-y-4">
        <div className="flex items-center gap-3">
          {request.user.avatar
            ? <img src={request.user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
            : <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">{request.user.name[0]}</div>
          }
          <div>
            <div className="font-semibold text-gray-800">{request.user.name}</div>
            <div className="text-sm text-gray-400">{request.user.department ?? ''}</div>
          </div>
        </div>

        <hr />

        <Row label="ประเภทการลา" value={`${request.leaveType.icon ?? '📋'} ${request.leaveType.name}`} />
        <Row label="วันที่เริ่ม"   value={formatThaiDate(request.startDate)} />
        {!request.isHalfDay && <Row label="วันที่สิ้นสุด" value={formatThaiDate(request.endDate)} />}
        <Row label="จำนวน"
          value={request.isHalfDay ? `ครึ่งวัน (${request.halfDayPeriod})` : `${request.totalDays} วันทำงาน`} />
        <Row label="เหตุผล" value={request.reason} multiline />
        {request.substitute && <Row label="ผู้ปฏิบัติงานแทน" value={request.substitute.name} />}
        {request.attachments && (
          <div className="flex gap-3">
            <span className="text-sm text-gray-400 w-32 flex-shrink-0">เอกสารแนบ</span>
            <div className="flex-1">
              {/\.(jpg|jpeg|png|gif|webp)$/i.test(request.attachments) ? (
                <a href={request.attachments} target="_blank" rel="noreferrer">
                  <img src={request.attachments} alt="เอกสารแนบ" className="max-h-40 rounded-lg border object-contain" />
                </a>
              ) : (
                <a href={request.attachments} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                  <FileText size={15} /> ดูเอกสาร <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Approval timeline */}
      {request.approvals.length > 0 && (
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">ประวัติการอนุมัติ</h2>
          <div className="space-y-3">
            {request.approvals.map((a) => (
              <div key={a.id} className="flex gap-3 items-start">
                <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
                  ${a.status === 'APPROVED' ? 'bg-green-100 text-green-600' :
                    a.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                  {a.status === 'APPROVED' ? <CheckCircle size={12} /> :
                    a.status === 'REJECTED' ? <XCircle size={12} /> : <Clock size={12} />}
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-700">
                    ระดับ {a.level}: <span className="font-medium">{a.approver?.name ?? 'รอผู้อนุมัติ'}</span>
                    {a.approver?.position && <span className="text-gray-400 ml-1">({a.approver.position})</span>}
                  </div>
                  <div className="text-xs text-gray-400">
                    {a.status === 'APPROVED' ? 'อนุมัติ' : a.status === 'REJECTED' ? 'ไม่อนุมัติ' : 'รออนุมัติ'}
                  </div>
                  {a.comment && <div className="text-sm text-gray-600 mt-0.5 italic">"{a.comment}"</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action errors */}
      {actionError && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">
          <AlertTriangle size={15} /> {actionError}
        </div>
      )}

      {/* Reject form */}
      {showReject && (
        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">เหตุผลที่ไม่อนุมัติ</h3>
          <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
            rows={3} className="border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder="ระบุเหตุผล..." />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowReject(false)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">ยกเลิก</button>
            <button onClick={handleReject} disabled={acting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              {acting && <Loader2 size={13} className="animate-spin" />} ยืนยันไม่อนุมัติ
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      {isApprover && request.status === 'PENDING' && !showReject && (
        <div className="flex gap-3">
          <button onClick={handleApprove} disabled={acting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl text-sm hover:bg-green-700 disabled:opacity-50">
            {acting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={15} />}
            อนุมัติ
          </button>
          <button onClick={() => setShowReject(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-xl text-sm hover:bg-red-700">
            <XCircle size={15} /> ไม่อนุมัติ
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="flex gap-3">
      <span className="text-sm text-gray-400 w-32 flex-shrink-0">{label}</span>
      <span className={`text-sm text-gray-800 flex-1 ${multiline ? 'whitespace-pre-wrap' : ''}`}>{value}</span>
    </div>
  );
}
