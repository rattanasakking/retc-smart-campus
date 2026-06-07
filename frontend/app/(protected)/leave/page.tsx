'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, CalendarX, ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle, Ban } from 'lucide-react';
import { api, USER_KEY } from '@/lib/api';

interface LeaveRequest {
  id: number;
  leaveType: { id: number; name: string; icon?: string };
  startDate: string;
  endDate: string;
  totalDays: number;
  isHalfDay: boolean;
  halfDayPeriod?: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
  approvals: { level: number; status: string; approver: { name: string } | null }[];
}

const STATUS_META: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  PENDING:   { label: 'รออนุมัติ',   bg: '#fffbeb', text: '#b45309', icon: <Clock size={13} /> },
  APPROVED:  { label: 'อนุมัติแล้ว', bg: '#e6f9f0', text: '#0d9068', icon: <CheckCircle size={13} /> },
  REJECTED:  { label: 'ไม่อนุมัติ', bg: '#fff0f0', text: '#dc2626', icon: <XCircle size={13} /> },
  CANCELLED: { label: 'ยกเลิกแล้ว', bg: '#f1f5f9', text: '#64748b', icon: <Ban size={13} /> },
};

const LIMIT = 20;

export default function LeavePage() {
  const router = useRouter();
  const [isApprover, setIsApprover] = useState(false);

  const [items, setItems]     = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const [statusFilter, setStatus] = useState('');
  const [yearFilter, setYear] = useState(String(new Date().getFullYear() + 543));

  const totalPages = Math.ceil(total / LIMIT);

  useEffect(() => {
    const u = localStorage.getItem(USER_KEY);
    if (u) {
      const p = JSON.parse(u);
      setIsApprover(['admin', 'executive'].includes(p.role) || p.isSuperAdmin);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (statusFilter) params.set('status', statusFilter);
      if (yearFilter)   params.set('year', yearFilter);
      const res = await api.get<any>(`/personnel/leaves?${params}`);
      setItems(res.data ?? []);
      setTotal(res.pagination?.total ?? 0);
    } catch (e: any) {
      setLoadError(e.message ?? 'เกิดข้อผิดพลาด');
    } finally { setLoading(false); }
  }, [page, statusFilter, yearFilter]);

  useEffect(() => { load(); }, [load]);

  function formatThaiDate(d: string) {
    const date = new Date(d);
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
      .replace(date.getFullYear().toString(), (date.getFullYear() + 543).toString());
  }

  async function deleteRequest(id: number) {
    if (!confirm('ยืนยันการลบคำขอลา? การกระทำนี้ไม่สามารถยกเลิกได้')) return;
    try {
      await api.delete(`/personnel/leaves/${id}`);
      load();
    } catch (e: any) { alert(e.message); }
  }

  const currentYear = new Date().getFullYear() + 543;
  const years = [currentYear, currentYear - 1, currentYear - 2];

  const sel = 'border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400';

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <CalendarX size={22} /> ระบบการลา
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">ประวัติการลาของฉัน</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isApprover && (
            <button onClick={() => router.push('/leave/report')}
              className="text-sm px-3 py-2 border rounded-lg hover:bg-gray-50 text-gray-600">
              รายงาน
            </button>
          )}
          <button onClick={() => router.push('/leave/new')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            <Plus size={16} /> ยื่นใบลา
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={yearFilter} onChange={(e) => { setYear(e.target.value); setPage(1); }} className={sel}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={sel}>
          <option value="">-- สถานะทั้งหมด --</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-16 text-gray-400">
            <Loader2 className="animate-spin mr-2" size={20} /> กำลังโหลด...
          </div>
        ) : loadError ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
            <p className="text-red-500 text-sm mb-2">เกิดข้อผิดพลาด: {loadError}</p>
            <p className="text-xs text-gray-400">กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูล หรือรัน migration ก่อน</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-400 bg-white rounded-xl shadow">
            <CalendarX size={40} className="mx-auto mb-2 opacity-40" />
            <p>ไม่พบรายการลา</p>
            <button onClick={() => router.push('/leave/new')} className="mt-3 text-sm text-blue-600 hover:underline">
              + ยื่นใบลา
            </button>
          </div>
        ) : (
          items.map((item) => {
            const st = STATUS_META[item.status];
            return (
              <div key={item.id} className="bg-white rounded-xl shadow p-4 flex items-start justify-between gap-4 cursor-pointer hover:shadow-md"
                onClick={() => router.push(`/leave/${item.id}`)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{item.leaveType.icon ?? '📋'}</span>
                    <span className="font-medium text-gray-800">{item.leaveType.name}</span>
                    <span style={{ background: st.bg, color: st.text }}
                      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium">
                      {st.icon} {st.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {formatThaiDate(item.startDate)}
                    {!item.isHalfDay && ` – ${formatThaiDate(item.endDate)}`}
                    {item.isHalfDay && ` (${item.halfDayPeriod ?? 'ครึ่งวัน'})`}
                    {' · '}
                    <span className="font-medium text-blue-700">
                      {item.isHalfDay ? 'ครึ่งวัน' : `${item.totalDays} วัน`}
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1 truncate">{item.reason}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-xs text-gray-400">
                    {new Date(item.createdAt).toLocaleDateString('th-TH')}
                  </div>
                  {item.status === 'PENDING' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteRequest(item.id); }}
                      className="mt-1.5 text-xs text-red-500 hover:underline">
                      ลบ
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>หน้า {page} / {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={16} /></button>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
