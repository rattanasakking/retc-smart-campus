'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ChevronLeft, Pencil, QrCode, Loader2, Check, AlertTriangle,
  Package, Wrench, ArrowLeftRight, ClipboardCheck, X, Plus,
} from 'lucide-react';
import { api, USER_KEY } from '@/lib/api';
import ThaiDatePicker from '@/components/ui/ThaiDatePicker';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category  { id: number; name: string }
interface UserBrief { id: number; name: string; employeeId?: string }

interface Borrow {
  id: number; borrowDate: string; dueDate: string; returnDate?: string;
  purpose: string; status: string; condition?: string; note?: string;
  borrower: UserBrief; approver?: UserBrief;
}
interface Inspection {
  id: number; inspectDate: string; condition: string; note?: string;
  inspector: UserBrief;
}
interface RepairTicket {
  id: number; ticketNo: string; createdAt: string; title: string;
  urgency: string; status: string;
  reporter: UserBrief;
  assignments: { technician: UserBrief; status: string }[];
}
interface Equipment {
  id: number; code: string; name: string; brand?: string; model?: string;
  serialNumber?: string; department: string; room?: string; status: string;
  price?: string; acquiredDate?: string; source?: string; image?: string; note?: string;
  category: Category | null;
  borrows: Borrow[]; inspections: Inspection[]; repairTickets: RepairTicket[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; bg: string; text: string }> = {
  active:   { label: '✅ ใช้งาน',   bg: '#e6f9f0', text: '#0d9068' },
  damaged:  { label: '🔧 ซ่อม',     bg: '#fffbeb', text: '#b45309' },
  disposed: { label: '🗑 จำหน่าย',  bg: '#f1f5f9', text: '#64748b' },
  borrowed: { label: '📦 ยืมออก',   bg: '#e8f0fe', text: '#1d6ae5' },
};
const BORROW_STATUS: Record<string, { label: string; bg: string; text: string }> = {
  pending:  { label: 'รออนุมัติ', bg: '#fffbeb', text: '#b45309' },
  approved: { label: 'อนุมัติ',   bg: '#e6f9f0', text: '#0d9068' },
  rejected: { label: 'ปฏิเสธ',   bg: '#fef2f2', text: '#dc2626' },
  returned: { label: 'คืนแล้ว',   bg: '#f1f5f9', text: '#64748b' },
  overdue:  { label: 'เกินกำหนด', bg: '#fef2f2', text: '#dc2626' },
};
const CONDITION: Record<string, string> = {
  good: '✅ ดี', fair: '⚠️ พอใช้', damaged: '🔧 ชำรุด', disposed: '🗑 จำหน่าย',
};
const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const fmt = (d?: string) => { if (!d) return '-'; const dt = new Date(d); return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear() + 543}`; };
const fmtMoney = (v?: string) => v ? Number(v).toLocaleString('th-TH') + ' บาท' : '-';

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EquipmentDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [eq, setEq]         = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<'repair' | 'borrow' | 'inspect'>('borrow');
  const [isAdmin, setAdmin]   = useState(false);
  const [userId, setUserId]   = useState(0);

  // Borrow modal
  const [borrowOpen, setBorrowOpen]   = useState(false);
  const [borrowForm, setBorrowForm]   = useState({ purpose: '', borrowDate: '', dueDate: '', note: '' });
  const [borrowSaving, setBorrowSave] = useState(false);

  // Inspect modal
  const [inspOpen, setInspOpen]   = useState(false);
  const [inspForm, setInspForm]   = useState({ inspectDate: '', condition: 'good', note: '' });
  const [inspSaving, setInspSave] = useState(false);

  // Toast
  const [toast, setToast]       = useState('');
  const [toastErr, setToastErr] = useState('');
  const showToast = (msg: string, err = false) => {
    if (err) { setToastErr(msg); setToast(''); } else { setToast(msg); setToastErr(''); }
    setTimeout(() => { setToast(''); setToastErr(''); }, 3500);
  };

  useEffect(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      try {
        const u = JSON.parse(raw);
        setAdmin(!!u.isSuperAdmin || u.role === 'admin' || u.role === 'executive');
        setUserId(u.id);
      } catch { /* */ }
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: Equipment }>(`/equipment/${id}`);
      setEq(res.data);
    } catch { showToast('โหลดข้อมูลไม่สำเร็จ', true); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };

  const handleBorrow = async () => {
    if (!borrowForm.purpose || !borrowForm.borrowDate || !borrowForm.dueDate) {
      showToast('กรุณากรอกข้อมูลให้ครบ', true); return;
    }
    setBorrowSave(true);
    try {
      await api.post('/equipment/borrows', { equipmentId: id, ...borrowForm });
      showToast('ส่งคำขอยืมสำเร็จ');
      setBorrowOpen(false);
      setBorrowForm({ purpose: '', borrowDate: '', dueDate: '', note: '' });
      load();
    } catch (e: unknown) { showToast((e as Error).message, true); }
    finally { setBorrowSave(false); }
  };

  const handleInspect = async () => {
    if (!inspForm.inspectDate || !inspForm.condition) {
      showToast('กรุณากรอกข้อมูลให้ครบ', true); return;
    }
    setInspSave(true);
    try {
      await api.post('/equipment/inspections', { equipmentId: id, ...inspForm });
      showToast('บันทึกการตรวจสอบสำเร็จ');
      setInspOpen(false);
      setInspForm({ inspectDate: '', condition: 'good', note: '' });
      load();
    } catch (e: unknown) { showToast((e as Error).message, true); }
    finally { setInspSave(false); }
  };

  const handleApprove = async (borrowId: number) => {
    try { await api.put(`/equipment/borrows/${borrowId}/approve`, {}); showToast('อนุมัติสำเร็จ'); load(); }
    catch (e: unknown) { showToast((e as Error).message, true); }
  };
  const handleReject = async (borrowId: number) => {
    try { await api.put(`/equipment/borrows/${borrowId}/reject`, {}); showToast('ปฏิเสธสำเร็จ'); load(); }
    catch (e: unknown) { showToast((e as Error).message, true); }
  };
  const handleReturn = async (borrowId: number) => {
    try { await api.put(`/equipment/borrows/${borrowId}/return`, { condition: 'good' }); showToast('บันทึกคืนสำเร็จ'); load(); }
    catch (e: unknown) { showToast((e as Error).message, true); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3" style={{ color: '#94a3b8' }}>
      <Loader2 className="w-6 h-6 animate-spin" /> กำลังโหลด...
    </div>
  );
  if (!eq) return <div className="text-center py-20" style={{ color: '#94a3b8' }}>ไม่พบครุภัณฑ์</div>;

  const statusMeta = STATUS[eq.status] ?? STATUS.active;

  return (
    <div className="space-y-4 max-w-4xl">
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
            <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>{eq.name}</h1>
            <p className="text-xs" style={{ color: '#4a6080' }}>{eq.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button onClick={() => router.push(`/equipment/${id}/edit`)} className="btn-secondary flex items-center gap-1.5 text-sm">
              <Pencil className="w-3.5 h-3.5" /> แก้ไข
            </button>
          )}
          <button onClick={() => router.push(`/equipment/${id}/qr`)} className="btn-primary flex items-center gap-1.5 text-sm">
            <QrCode className="w-3.5 h-3.5" /> QR Code
          </button>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #dce6f9' }}>
        <div className="flex flex-col md:flex-row gap-0">
          {/* Image */}
          <div className="md:w-56 flex-shrink-0 bg-[#f5f8ff] flex items-center justify-center p-6 min-h-[180px]" style={{ borderRight: '1px solid #dce6f9' }}>
            {eq.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={eq.image} alt={eq.name} className="max-h-40 object-contain rounded-lg" />
            ) : (
              <Package className="w-16 h-16" style={{ color: '#dce6f9' }} />
            )}
          </div>
          {/* Details */}
          <div className="flex-1 p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
              {[
                ['หมวดหมู่',    eq.category?.name ?? '-'],
                ['ยี่ห้อ',       eq.brand  ?? '-'],
                ['รุ่น',         eq.model  ?? '-'],
                ['ซีเรียล',      eq.serialNumber ?? '-'],
                ['แผนก/งาน',    eq.department],
                ['ห้อง/ที่ตั้ง', eq.room ?? '-'],
                ['ราคา',         fmtMoney(eq.price)],
                ['วันที่ซื้อ',   fmt(eq.acquiredDate)],
                ['แหล่งที่มา',   eq.source ?? '-'],
              ].map(([label, val]) => (
                <div key={label} className="flex gap-2">
                  <span className="w-24 flex-shrink-0 text-xs font-medium" style={{ color: '#94a3b8' }}>{label}</span>
                  <span style={{ color: '#1a2744' }}>{val}</span>
                </div>
              ))}
              <div className="flex gap-2 items-center">
                <span className="w-24 flex-shrink-0 text-xs font-medium" style={{ color: '#94a3b8' }}>สถานะ</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: statusMeta.bg, color: statusMeta.text }}>
                  {statusMeta.label}
                </span>
              </div>
            </div>
            {eq.note && <p className="mt-3 text-xs p-3 rounded-lg" style={{ backgroundColor: '#f5f8ff', color: '#4a6080' }}>{eq.note}</p>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #dce6f9' }}>
        {/* Tab bar */}
        <div className="flex" style={{ borderBottom: '1px solid #dce6f9' }}>
          {([
            { key: 'repair',  icon: Wrench,          label: 'ประวัติซ่อม',    count: eq.repairTickets.length },
            { key: 'borrow',  icon: ArrowLeftRight,   label: 'ยืม-คืน',        count: eq.borrows.length },
            { key: 'inspect', icon: ClipboardCheck,   label: 'ตรวจสอบสภาพ',   count: eq.inspections.length },
          ] as const).map(({ key, icon: Icon, label, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className="flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              style={tab === key
                ? { color: '#1d6ae5', borderBottom: '2px solid #1d6ae5', marginBottom: -1, backgroundColor: '#f8faff' }
                : { color: '#4a6080' }}>
              <Icon className="w-3.5 h-3.5" />
              {label}
              <span className="px-1.5 py-0.5 rounded-full text-[11px]"
                style={tab === key ? { backgroundColor: '#e8f0fe', color: '#1d6ae5' } : { backgroundColor: '#f1f5f9', color: '#94a3b8' }}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Tab: Repairs ── */}
        {tab === 'repair' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#f8faff', borderBottom: '1px solid #f0f4ff' }}>
                  {['วันที่', 'หมายเลข', 'ปัญหา', 'ผู้แจ้ง', 'ช่าง', 'สถานะ'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#94a3b8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {eq.repairTickets.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: '#94a3b8' }}>ไม่มีประวัติซ่อม</td></tr>
                ) : eq.repairTickets.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f5f8ff' }} className="hover:bg-[#fafbff]">
                    <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{fmt(r.createdAt)}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: '#1d6ae5' }}>{r.ticketNo}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate" style={{ color: '#1a2744' }}>{r.title}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{r.reporter.name}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{r.assignments[0]?.technician.name ?? '-'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Tab: Borrows ── */}
        {tab === 'borrow' && (
          <div>
            <div className="px-4 py-3 flex justify-end" style={{ borderBottom: '1px solid #f0f4ff' }}>
              {eq.status === 'active' && (
                <button onClick={() => { setBorrowOpen(true); setBorrowForm({ purpose: '', borrowDate: today(), dueDate: '', note: '' }); }}
                  className="btn-primary flex items-center gap-1.5 text-sm">
                  <Plus className="w-3.5 h-3.5" /> ขอยืม
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#f8faff', borderBottom: '1px solid #f0f4ff' }}>
                    {['วันที่ยืม', 'กำหนดคืน', 'ผู้ยืม', 'วัตถุประสงค์', 'สถานะ', isAdmin ? 'จัดการ' : ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#94a3b8' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {eq.borrows.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: '#94a3b8' }}>ไม่มีประวัติยืม</td></tr>
                  ) : eq.borrows.map((b) => {
                    const bm = BORROW_STATUS[b.status] ?? BORROW_STATUS.pending;
                    const overdue = b.status === 'approved' && new Date(b.dueDate) < new Date();
                    return (
                      <tr key={b.id} style={{ borderBottom: '1px solid #f5f8ff' }} className="hover:bg-[#fafbff]">
                        <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{fmt(b.borrowDate)}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: overdue ? '#dc2626' : '#4a6080' }}>
                          {fmt(b.dueDate)}{overdue && ' ⚠️'}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: '#1a2744' }}>{b.borrower.name}</td>
                        <td className="px-4 py-3 text-xs max-w-[180px] truncate" style={{ color: '#4a6080' }}>{b.purpose}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: bm.bg, color: bm.text }}>{bm.label}</span>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {b.status === 'pending' && <>
                                <button onClick={() => handleApprove(b.id)} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: '#e6f9f0', color: '#0d9068' }}>อนุมัติ</button>
                                <button onClick={() => handleReject(b.id)}  className="px-2 py-1 rounded text-xs" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>ปฏิเสธ</button>
                              </>}
                              {['approved','overdue'].includes(b.status) && (
                                <button onClick={() => handleReturn(b.id)} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: '#e8f0fe', color: '#1d6ae5' }}>บันทึกคืน</button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab: Inspections ── */}
        {tab === 'inspect' && (
          <div>
            <div className="px-4 py-3 flex justify-end" style={{ borderBottom: '1px solid #f0f4ff' }}>
              <button onClick={() => { setInspOpen(true); setInspForm({ inspectDate: today(), condition: 'good', note: '' }); }}
                className="btn-primary flex items-center gap-1.5 text-sm">
                <Plus className="w-3.5 h-3.5" /> บันทึกตรวจสอบ
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#f8faff', borderBottom: '1px solid #f0f4ff' }}>
                    {['วันที่', 'ผู้ตรวจ', 'สภาพ', 'หมายเหตุ'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#94a3b8' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {eq.inspections.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-sm" style={{ color: '#94a3b8' }}>ไม่มีประวัติตรวจสอบ</td></tr>
                  ) : eq.inspections.map((ins) => (
                    <tr key={ins.id} style={{ borderBottom: '1px solid #f5f8ff' }} className="hover:bg-[#fafbff]">
                      <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{fmt(ins.inspectDate)}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#1a2744' }}>{ins.inspector.name}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{CONDITION[ins.condition] ?? ins.condition}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{ins.note ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Borrow Modal ── */}
      {borrowOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => !borrowSaving && setBorrowOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl shadow-xl z-10 bg-white" style={{ border: '1px solid #dce6f9' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #dce6f9' }}>
              <h3 className="font-semibold" style={{ color: '#1a2744' }}>ขอยืมครุภัณฑ์</h3>
              <button onClick={() => setBorrowOpen(false)}><X className="w-4 h-4" style={{ color: '#4a6080' }} /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {[
                { label: 'วัตถุประสงค์ *', key: 'purpose', type: 'text', placeholder: 'ระบุวัตถุประสงค์' },
                { label: 'วันที่ยืม *', key: 'borrowDate', type: 'date' },
                { label: 'กำหนดคืน *',  key: 'dueDate',   type: 'date' },
                { label: 'หมายเหตุ',     key: 'note',      type: 'text', placeholder: 'หมายเหตุเพิ่มเติม' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#4a6080' }}>{label}</label>
                  <input type={type} placeholder={placeholder} className="input-field"
                    value={(borrowForm as Record<string, string>)[key]}
                    onChange={(e) => setBorrowForm((f) => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: '1px solid #dce6f9' }}>
              <button onClick={() => setBorrowOpen(false)} disabled={borrowSaving} className="btn-secondary">ยกเลิก</button>
              <button onClick={handleBorrow} disabled={borrowSaving} className="btn-primary flex items-center gap-2">
                {borrowSaving && <Loader2 className="w-4 h-4 animate-spin" />} ส่งคำขอ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Inspect Modal ── */}
      {inspOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => !inspSaving && setInspOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl shadow-xl z-10 bg-white" style={{ border: '1px solid #dce6f9' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #dce6f9' }}>
              <h3 className="font-semibold" style={{ color: '#1a2744' }}>บันทึกตรวจสอบสภาพ</h3>
              <button onClick={() => setInspOpen(false)}><X className="w-4 h-4" style={{ color: '#4a6080' }} /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#4a6080' }}>วันที่ตรวจสอบ *</label>
                <ThaiDatePicker value={inspForm.inspectDate} onChange={v => setInspForm(f => ({ ...f, inspectDate: v }))} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#4a6080' }}>สภาพ *</label>
                <select className="input-field" value={inspForm.condition}
                  onChange={(e) => setInspForm((f) => ({ ...f, condition: e.target.value }))}>
                  {Object.entries(CONDITION).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#4a6080' }}>หมายเหตุ</label>
                <textarea className="input-field resize-none" rows={3} value={inspForm.note}
                  onChange={(e) => setInspForm((f) => ({ ...f, note: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: '1px solid #dce6f9' }}>
              <button onClick={() => setInspOpen(false)} disabled={inspSaving} className="btn-secondary">ยกเลิก</button>
              <button onClick={handleInspect} disabled={inspSaving} className="btn-primary flex items-center gap-2">
                {inspSaving && <Loader2 className="w-4 h-4 animate-spin" />} บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
