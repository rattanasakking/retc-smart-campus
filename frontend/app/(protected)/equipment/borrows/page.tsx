'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, Check, AlertTriangle, Eye, X } from 'lucide-react';
import { api, USER_KEY } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Borrow {
  id: number;
  borrowDate: string; dueDate: string; returnDate?: string;
  purpose: string; status: string; condition?: string; note?: string;
  equipment: { id: number; code: string; name: string; department: string };
  borrower:  { id: number; name: string; employeeId: string };
  approver?: { id: number; name: string };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  pending:  { label: 'รออนุมัติ', bg: '#fffbeb', text: '#b45309' },
  approved: { label: 'อนุมัติ',   bg: '#e6f9f0', text: '#0d9068' },
  rejected: { label: 'ปฏิเสธ',   bg: '#fef2f2', text: '#dc2626' },
  returned: { label: 'คืนแล้ว',   bg: '#f1f5f9', text: '#64748b' },
  overdue:  { label: 'เกินกำหนด', bg: '#fef2f2', text: '#dc2626' },
};

const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const fmt = (d?: string) => { if (!d) return '-'; const dt = new Date(d); return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear() + 543}`; };

// ─── Return Modal ─────────────────────────────────────────────────────────────

function ReturnModal({ borrow, onClose, onDone }: { borrow: Borrow; onClose: () => void; onDone: () => void }) {
  const [condition, setCondition] = useState('good');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handle = async () => {
    setSaving(true); setErr('');
    try {
      await api.put(`/equipment/borrows/${borrow.id}/return`, { condition, note });
      onDone();
    } catch (e: unknown) { setErr((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => !saving && onClose()} />
      <div className="relative w-full max-w-md rounded-2xl shadow-xl z-10 bg-white" style={{ border: '1px solid #dce6f9' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #dce6f9' }}>
          <h3 className="font-semibold" style={{ color: '#1a2744' }}>บันทึกการคืนครุภัณฑ์</h3>
          <button onClick={onClose}><X className="w-4 h-4" style={{ color: '#4a6080' }} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm" style={{ color: '#4a6080' }}>
            <span className="font-medium" style={{ color: '#1a2744' }}>{borrow.equipment.name}</span> — ผู้ยืม: {borrow.borrower.name}
          </p>
          {err && <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm"><AlertTriangle className="w-4 h-4" />{err}</div>}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#4a6080' }}>สภาพครุภัณฑ์ *</label>
            <select className="input-field" value={condition} onChange={(e) => setCondition(e.target.value)}>
              <option value="good">✅ ดี</option>
              <option value="fair">⚠️ พอใช้</option>
              <option value="damaged">🔧 ชำรุด</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#4a6080' }}>หมายเหตุ</label>
            <textarea className="input-field resize-none" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: '1px solid #dce6f9' }}>
          <button onClick={onClose} disabled={saving} className="btn-secondary">ยกเลิก</button>
          <button onClick={handle} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} บันทึกคืน
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BorrowsPage() {
  const router = useRouter();
  const [borrows, setBorrows]   = useState<Borrow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [statusF, setStatusF]   = useState('');
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [isAdmin, setAdmin]     = useState(false);
  const [returnBorrow, setReturn] = useState<Borrow | null>(null);
  const [toast, setToast]       = useState('');
  const [toastErr, setToastErr] = useState('');
  const LIMIT = 20;

  const showToast = (msg: string, err = false) => {
    if (err) { setToastErr(msg); setToast(''); } else { setToast(msg); setToastErr(''); }
    setTimeout(() => { setToast(''); setToastErr(''); }, 3000);
  };

  useEffect(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) { try { const u = JSON.parse(raw); setAdmin(!!u.isSuperAdmin || u.role === 'admin' || u.role === 'executive'); } catch { /* */ } }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (statusF) params.set('status', statusF);
      const res = await api.get<{ data: Borrow[]; pagination: { total: number } }>(`/equipment/borrows?${params}`);
      setBorrows(res.data ?? []);
      setTotal(res.pagination?.total ?? 0);
    } catch { showToast('โหลดข้อมูลไม่สำเร็จ', true); }
    finally { setLoading(false); }
  }, [page, statusF]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: number) => {
    try { await api.put(`/equipment/borrows/${id}/approve`, {}); showToast('อนุมัติสำเร็จ'); load(); }
    catch (e: unknown) { showToast((e as Error).message, true); }
  };
  const reject = async (id: number) => {
    try { await api.put(`/equipment/borrows/${id}/reject`, {}); showToast('ปฏิเสธสำเร็จ'); load(); }
    catch (e: unknown) { showToast((e as Error).message, true); }
  };

  const totalPages = Math.ceil(total / LIMIT);

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/equipment')} className="p-2 rounded-xl hover:bg-[#f5f8ff] transition-colors">
            <ChevronLeft className="w-4 h-4" style={{ color: '#4a6080' }} />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>รายการยืม-คืนครุภัณฑ์</h1>
            <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>จัดการการยืมและการคืนครุภัณฑ์</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['', 'pending', 'approved', 'rejected', 'returned', 'overdue'] as const).map((s) => {
          const m = s ? STATUS_META[s] : null;
          return (
            <button key={s} onClick={() => { setStatusF(s); setPage(1); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={statusF === s
                ? { backgroundColor: '#2979ff', color: '#fff' }
                : { backgroundColor: '#f5f8ff', color: '#4a6080', border: '1px solid #dce6f9' }}>
              {m ? m.label : 'ทั้งหมด'}
            </button>
          );
        })}
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
                  {['ครุภัณฑ์', 'ผู้ยืม', 'วันที่ยืม', 'กำหนดคืน', 'สถานะ', 'จัดการ'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#94a3b8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {borrows.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: '#94a3b8' }}>ไม่มีรายการยืม</td></tr>
                ) : borrows.map((b) => {
                  const sm = STATUS_META[b.status] ?? STATUS_META.pending;
                  const overdue = b.status === 'approved' && new Date(b.dueDate) < new Date();
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid #f5f8ff' }} className="hover:bg-[#fafbff]">
                      <td className="px-4 py-3">
                        <p className="font-medium text-xs" style={{ color: '#1a2744' }}>{b.equipment.name}</p>
                        <p className="text-xs font-mono" style={{ color: '#1d6ae5' }}>{b.equipment.code}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs" style={{ color: '#1a2744' }}>{b.borrower.name}</p>
                        <p className="text-xs" style={{ color: '#94a3b8' }}>{b.borrower.employeeId}</p>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{fmt(b.borrowDate)}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: overdue ? '#dc2626' : '#4a6080', fontWeight: overdue ? 600 : 400 }}>
                        {fmt(b.dueDate)}{overdue && ' ⚠️'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: sm.bg, color: sm.text }}>{sm.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => router.push(`/equipment/${b.equipment.id}`)}
                            className="p-1.5 rounded hover:bg-[#e8f0fe] transition-colors" title="ดูครุภัณฑ์">
                            <Eye className="w-3.5 h-3.5" style={{ color: '#1d6ae5' }} />
                          </button>
                          {isAdmin && b.status === 'pending' && <>
                            <button onClick={() => approve(b.id)}
                              className="px-2 py-1 rounded text-xs transition-colors" style={{ backgroundColor: '#e6f9f0', color: '#0d9068' }}>อนุมัติ</button>
                            <button onClick={() => reject(b.id)}
                              className="px-2 py-1 rounded text-xs transition-colors" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>ปฏิเสธ</button>
                          </>}
                          {(isAdmin || true) && ['approved', 'overdue'].includes(b.status) && (
                            <button onClick={() => setReturn(b)}
                              className="px-2 py-1 rounded text-xs transition-colors" style={{ backgroundColor: '#e8f0fe', color: '#1d6ae5' }}>บันทึกคืน</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid #f0f4ff' }}>
            <span className="text-xs" style={{ color: '#94a3b8' }}>ทั้งหมด {total} รายการ</span>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className="w-7 h-7 rounded text-xs"
                  style={p === page ? { backgroundColor: '#1d6ae5', color: '#fff' } : { backgroundColor: '#f5f8ff', color: '#4a6080' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Return Modal */}
      {returnBorrow && (
        <ReturnModal
          borrow={returnBorrow}
          onClose={() => setReturn(null)}
          onDone={() => { setReturn(null); showToast('บันทึกการคืนสำเร็จ'); load(); }}
        />
      )}
    </div>
  );
}
