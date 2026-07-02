'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, Search, X, Loader2, Check,
  AlertTriangle, Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Booking {
  id: number; title: string; startTime: string; endTime: string; status: string;
  attendees?: number; purpose?: string;
  room: { id: number; name: string };
  user: { id: number; name: string; department?: string };
  approvals: { approver: { name: string }; status: string; note?: string }[];
}
interface Room { id: number; name: string }

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  pending:   { label: '⏳ รออนุมัติ', bg: '#fffbeb', text: '#b45309' },
  approved:  { label: '✅ อนุมัติ',   bg: '#e6f9f0', text: '#0d9068' },
  rejected:  { label: '❌ ปฏิเสธ',   bg: '#fef2f2', text: '#dc2626' },
  cancelled: { label: '🚫 ยกเลิก',   bg: '#f1f5f9', text: '#64748b' },
  completed: { label: '🏁 เสร็จสิ้น', bg: '#eff6ff', text: '#1d6ae5' },
};

const MONTHS_SH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const fmtDate = (d: string) => { const dt = new Date(d); return `${dt.getDate()} ${MONTHS_SH[dt.getMonth()]} ${dt.getFullYear()+543}`; };
const fmtTime = (d: string) => { const dt = new Date(d); return `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`; };

const LIMIT = 20;

export default function BookingManagePage() {
  const router = useRouter();
  const [bookings, setBookings]     = useState<Booking[]>([]);
  const [rooms, setRooms]           = useState<Room[]>([]);
  const [loading, setLoading]       = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]         = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);
  const [toast, setToast]           = useState('');
  const [toastErr, setToastErr]     = useState('');
  const [acting, setActing]         = useState<number | null>(null);
  const [rejModal, setRejModal]     = useState<Booking | null>(null);
  const [rejNote, setRejNote]       = useState('');

  const showToast = (msg: string, err = false) => {
    if (err) { setToastErr(msg); setToast(''); } else { setToast(msg); setToastErr(''); }
    setTimeout(() => { setToast(''); setToastErr(''); }, 3000);
  };

  useEffect(() => {
    api.get<{ data: Room[] }>('/room/rooms/all').then(r => setRooms(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search)       params.set('search', search);
      if (roomFilter)   params.set('roomId', roomFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (dateFrom)     params.set('dateFrom', dateFrom);
      if (dateTo)       params.set('dateTo', dateTo);
      const res = await api.get<{ data: Booking[]; pagination: { totalPages: number; total: number } }>(`/room/bookings?${params}`);
      setBookings(Array.isArray(res.data) ? res.data : []);
      setTotalPages(res.pagination?.totalPages ?? 1);
      setTotal(res.pagination?.total ?? 0);
    } catch (e: unknown) {
      showToast((e as Error).message || 'โหลดข้อมูลไม่สำเร็จ', true);
    } finally {
      setLoading(false);
    }
  }, [page, search, roomFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const applySearch = () => { setSearch(searchInput); setPage(1); };

  const clearFilters = () => {
    setSearchInput(''); setSearch('');
    setRoomFilter(''); setStatusFilter('');
    setDateFrom(''); setDateTo('');
    setPage(1);
  };

  const handleApprove = async (id: number) => {
    setActing(id);
    try {
      await api.put(`/room/bookings/${id}/approve`, {});
      showToast('อนุมัติสำเร็จ');
      load();
    } catch (e: unknown) { showToast((e as Error).message, true); }
    finally { setActing(null); }
  };

  const handleReject = async () => {
    if (!rejModal) return;
    setActing(rejModal.id);
    try {
      await api.put(`/room/bookings/${rejModal.id}/reject`, { note: rejNote });
      showToast('ปฏิเสธสำเร็จ');
      setRejModal(null); setRejNote('');
      load();
    } catch (e: unknown) { showToast((e as Error).message, true); }
    finally { setActing(null); }
  };

  const handleDelete = async (b: Booking) => {
    if (!confirm(`ลบการจอง "${b.title}" ของ ${b.user.name}?\nไม่สามารถย้อนกลับได้`)) return;
    setActing(b.id);
    try {
      await api.delete(`/room/bookings/${b.id}`);
      showToast('ลบสำเร็จ');
      load();
    } catch (e: unknown) { showToast((e as Error).message, true); }
    finally { setActing(null); }
  };

  const hasFilters = !!(search || roomFilter || statusFilter || dateFrom || dateTo);

  return (
    <div className="space-y-4">
      {/* Toast */}
      {(toast || toastErr) && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 ${toastErr ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {toastErr ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast || toastErr}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/room')} className="p-2 rounded-xl hover:bg-[#f5f8ff]">
          <ChevronLeft className="w-4 h-4" style={{ color: '#4a6080' }} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>จัดการการจองทั้งหมด</h1>
          <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>ค้นหา อนุมัติ ปฏิเสธ และลบการจองของทุก user</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 flex flex-wrap gap-3 items-end" style={{ border: '1px solid #dce6f9' }}>
        {/* Name search */}
        <div className="relative flex-1 min-w-[180px]">
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>ชื่อผู้จอง</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94a3b8' }} />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') applySearch(); }}
              placeholder="ค้นหาชื่อ..."
              className="pl-9 pr-8 py-2 text-sm rounded-xl w-full focus:outline-none"
              style={{ border: '1px solid #dce6f9' }}
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
              </button>
            )}
          </div>
        </div>

        {/* Room filter */}
        <div className="min-w-[140px]">
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>ห้อง</label>
          <select value={roomFilter} onChange={e => { setRoomFilter(e.target.value); setPage(1); }}
            className="input-field text-sm py-2 w-full">
            <option value="">ทั้งหมด</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        {/* Status filter */}
        <div className="min-w-[130px]">
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>สถานะ</label>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field text-sm py-2 w-full">
            <option value="">ทั้งหมด</option>
            <option value="pending">รออนุมัติ</option>
            <option value="approved">อนุมัติ</option>
            <option value="rejected">ปฏิเสธ</option>
            <option value="cancelled">ยกเลิก</option>
            <option value="completed">เสร็จสิ้น</option>
          </select>
        </div>

        {/* Date from */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>จากวันที่</label>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="input-field text-sm py-2" style={{ minWidth: 140 }} />
        </div>

        {/* Date to */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>ถึงวันที่</label>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="input-field text-sm py-2" style={{ minWidth: 140 }} />
        </div>

        <div className="flex gap-2 items-end">
          <button onClick={applySearch} className="btn-primary text-sm py-2 px-4">ค้นหา</button>
          {hasFilters && (
            <button onClick={clearFilters}
              className="text-sm px-3 py-2 rounded-xl"
              style={{ color: '#94a3b8', border: '1px solid #dce6f9' }}>
              ล้าง
            </button>
          )}
        </div>
      </div>

      {/* Summary + pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: '#4a6080' }}>
          พบ <span className="font-semibold" style={{ color: '#1a2744' }}>{total.toLocaleString()}</span> รายการ
          {hasFilters && <span className="ml-1 text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#e8f0fe', color: '#1d6ae5' }}>มีตัวกรอง</span>}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-[#f5f8ff] disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" style={{ color: '#4a6080' }} />
            </button>
            <span className="text-sm" style={{ color: '#4a6080' }}>หน้า {page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-[#f5f8ff] disabled:opacity-40">
              <ChevronRight className="w-4 h-4" style={{ color: '#4a6080' }} />
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #dce6f9' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3" style={{ color: '#94a3b8' }}>
            <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลด...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#f8faff', borderBottom: '1px solid #f0f4ff' }}>
                  {['ห้อง','หัวข้อ','ผู้จอง','วันที่','เวลา','สถานะ','จัดการ'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#94a3b8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: '#94a3b8' }}>
                      {hasFilters ? 'ไม่พบรายการที่ตรงกับเงื่อนไข' : 'ยังไม่มีการจอง'}
                    </td>
                  </tr>
                ) : bookings.map((b) => {
                  const sm = STATUS_META[b.status] ?? STATUS_META.pending;
                  const isActing = acting === b.id;
                  const lastApproval = b.approvals?.[0];
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid #f5f8ff' }} className="hover:bg-[#fafbff]">
                      <td className="px-4 py-3 text-xs font-medium whitespace-nowrap" style={{ color: '#1a2744' }}>{b.room.name}</td>
                      <td className="px-4 py-3 text-xs max-w-[180px]">
                        <p className="truncate font-medium" style={{ color: '#1a2744' }}>{b.title}</p>
                        {b.attendees && <p className="text-[11px] mt-0.5" style={{ color: '#94a3b8' }}>{b.attendees} คน</p>}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <p style={{ color: '#1a2744' }}>{b.user.name}</p>
                        {b.user.department && <p className="text-[11px] mt-0.5" style={{ color: '#94a3b8' }}>{b.user.department}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#4a6080' }}>{fmtDate(b.startTime)}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#4a6080' }}>{fmtTime(b.startTime)}-{fmtTime(b.endTime)} น.</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap" style={{ backgroundColor: sm.bg, color: sm.text }}>{sm.label}</span>
                        {lastApproval?.note && (
                          <p className="text-[11px] mt-0.5 max-w-[120px] truncate" style={{ color: '#94a3b8' }} title={lastApproval.note}>{lastApproval.note}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {b.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(b.id)}
                                disabled={isActing}
                                className="p-1.5 rounded-lg hover:bg-green-50 disabled:opacity-50 transition-colors"
                                title="อนุมัติ">
                                {isActing
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#0d9068' }} />
                                  : <Check className="w-3.5 h-3.5" style={{ color: '#0d9068' }} />}
                              </button>
                              <button
                                onClick={() => { setRejModal(b); setRejNote(''); }}
                                disabled={isActing}
                                className="p-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                                title="ปฏิเสธ">
                                <X className="w-3.5 h-3.5" style={{ color: '#dc2626' }} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(b)}
                            disabled={isActing}
                            className="p-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                            title="ลบ">
                            {isActing
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                              : <Trash2 className="w-3.5 h-3.5 text-red-400" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom pagination */}
      {totalPages > 1 && !loading && (
        <div className="flex justify-center items-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-sm disabled:opacity-40 hover:bg-[#f5f8ff] flex items-center gap-1"
            style={{ color: '#4a6080', border: '1px solid #dce6f9' }}>
            <ChevronLeft className="w-3.5 h-3.5" /> ก่อนหน้า
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 2, totalPages - 4));
            const p = start + i;
            if (p > totalPages) return null;
            return (
              <button key={p} onClick={() => setPage(p)}
                className="w-8 h-8 rounded-lg text-sm font-medium"
                style={p === page
                  ? { backgroundColor: '#1d6ae5', color: '#fff' }
                  : { color: '#4a6080', border: '1px solid #dce6f9' }}>
                {p}
              </button>
            );
          })}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg text-sm disabled:opacity-40 hover:bg-[#f5f8ff] flex items-center gap-1"
            style={{ color: '#4a6080', border: '1px solid #dce6f9' }}>
            ถัดไป <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Reject modal */}
      {rejModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setRejModal(null)} />
          <div className="relative w-full max-w-sm rounded-2xl shadow-xl z-10 bg-white" style={{ border: '1px solid #dce6f9' }}>
            <div className="flex items-start justify-between px-5 py-4" style={{ borderBottom: '1px solid #dce6f9' }}>
              <div>
                <h3 className="font-semibold" style={{ color: '#1a2744' }}>ปฏิเสธการจอง</h3>
                <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>{rejModal.title} — {rejModal.user.name}</p>
              </div>
              <button onClick={() => setRejModal(null)}><X className="w-4 h-4" style={{ color: '#94a3b8' }} /></button>
            </div>
            <div className="px-5 py-4">
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>เหตุผล (ไม่บังคับ)</label>
              <textarea
                className="input-field resize-none"
                rows={3}
                value={rejNote}
                onChange={e => setRejNote(e.target.value)}
                placeholder="ระบุเหตุผลการปฏิเสธ..."
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: '1px solid #dce6f9' }}>
              <button onClick={() => setRejModal(null)} className="btn-secondary text-sm">ยกเลิก</button>
              <button
                onClick={handleReject}
                disabled={acting === rejModal.id}
                className="text-sm px-4 py-2 rounded-xl flex items-center gap-1.5"
                style={{ backgroundColor: '#dc2626', color: '#fff' }}>
                {acting === rejModal.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                ยืนยันปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
