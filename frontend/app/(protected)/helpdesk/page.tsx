'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, X, Loader2, Check, AlertTriangle, Wrench,
  MapPin, Clock, User, Package, ChevronRight, ExternalLink,
} from 'lucide-react';
import { api, USER_KEY } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Reporter   { id: number; name: string; department?: string; position?: string }
interface Assignment { id: number; technicianId: number; technician: { id: number; name: string }; status: string; solution?: string; cost?: string; dueDate?: string; assignedAt: string; completedAt?: string }
interface Equipment  { id: number; code: string; name: string }
interface Ticket {
  id: number; ticketNo: string; type: string; location: string; urgency: string;
  title: string; description: string; image?: string; status: string;
  createdAt: string; updatedAt: string;
  reporter: Reporter; equipment?: Equipment | null;
  assignments: Assignment[];
}
interface KPI { pending: number; inProgress: number; critical: number; completedToday: number }
interface TechUser { id: number; name: string }

// ─── Metadata ─────────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pending:       { label: '⏳ รอรับเรื่อง', bg: '#eff6ff', text: '#1d6ae5', dot: '#3b82f6' },
  assigned:      { label: '👷 มอบหมายแล้ว', bg: '#fffbeb', text: '#b45309', dot: '#f59e0b' },
  in_progress:   { label: '🔧 กำลังซ่อม',  bg: '#f5f3ff', text: '#7c3aed', dot: '#8b5cf6' },
  waiting_parts: { label: '📦 รออะไหล่',   bg: '#fff7ed', text: '#c2410c', dot: '#f97316' },
  completed:     { label: '✅ เสร็จสิ้น',   bg: '#e6f9f0', text: '#0d9068', dot: '#10b981' },
  cancelled:     { label: '❌ ยกเลิก',      bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8' },
};
const URGENCY: Record<string, { label: string; bg: string; text: string }> = {
  critical: { label: 'วิกฤต',    bg: '#fef2f2', text: '#dc2626' },
  urgent:   { label: 'เร่งด่วน', bg: '#fffbeb', text: '#b45309' },
  normal:   { label: 'ปกติ',     bg: '#eff6ff', text: '#1d6ae5' },
};

const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const fmt = (d?: string) => { if (!d) return '-'; const dt = new Date(d); return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear() + 543} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`; };
const fmtDate = (d?: string) => { if (!d) return '-'; const dt = new Date(d); return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear() + 543}`; };

// ─── Modal: Assign ────────────────────────────────────────────────────────────

function AssignModal({ ticket, techs, onClose, onDone }: { ticket: Ticket; techs: TechUser[]; onClose: () => void; onDone: () => void }) {
  const [techId, setTechId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const handle = async () => {
    if (!techId) { setErr('กรุณาเลือกช่าง'); return; }
    setSaving(true); setErr('');
    try { await api.post(`/helpdesk/${ticket.id}/assign`, { technicianId: techId, dueDate: dueDate || undefined }); onDone(); }
    catch (e: unknown) { setErr((e as Error).message); setSaving(false); }
  };
  return (
    <Modal title="มอบหมายช่าง" onClose={() => !saving && onClose()}>
      <p className="text-sm mb-3" style={{ color: '#4a6080' }}>{ticket.ticketNo} — {ticket.title}</p>
      {err && <ErrBox msg={err} />}
      <ModalField label="ช่างผู้รับผิดชอบ *">
        <select className="input-field" value={techId} onChange={(e) => setTechId(e.target.value)}>
          <option value="">-- เลือกช่าง --</option>
          {techs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </ModalField>
      <ModalField label="กำหนดเสร็จ">
        <input type="date" className="input-field" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </ModalField>
      <ModalFooter onClose={() => !saving && onClose()} onSave={handle} saving={saving} saveLabel="มอบหมาย" />
    </Modal>
  );
}

// ─── Modal: Progress ─────────────────────────────────────────────────────────

function ProgressModal({ ticket, onClose, onDone }: { ticket: Ticket; onClose: () => void; onDone: () => void }) {
  const [status, setStatus] = useState<'in_progress' | 'waiting_parts'>('in_progress');
  const [solution, setSolution] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const handle = async () => {
    setSaving(true); setErr('');
    try { await api.put(`/helpdesk/${ticket.id}/progress`, { status, solution }); onDone(); }
    catch (e: unknown) { setErr((e as Error).message); setSaving(false); }
  };
  return (
    <Modal title="อัปเดตความคืบหน้า" onClose={() => !saving && onClose()}>
      {err && <ErrBox msg={err} />}
      <ModalField label="สถานะ">
        <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="in_progress">🔧 กำลังซ่อม</option>
          <option value="waiting_parts">📦 รออะไหล่</option>
        </select>
      </ModalField>
      <ModalField label="รายละเอียดการดำเนินการ">
        <textarea className="input-field resize-none" rows={3} value={solution} onChange={(e) => setSolution(e.target.value)} placeholder="บอกความคืบหน้า..." />
      </ModalField>
      <ModalFooter onClose={() => !saving && onClose()} onSave={handle} saving={saving} saveLabel="บันทึก" />
    </Modal>
  );
}

// ─── Modal: Complete ─────────────────────────────────────────────────────────

function CompleteModal({ ticket, onClose, onDone }: { ticket: Ticket; onClose: () => void; onDone: () => void }) {
  const [solution, setSolution] = useState('');
  const [cost, setCost] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const handle = async () => {
    if (!solution.trim()) { setErr('กรุณากรอกวิธีแก้ไข'); return; }
    setSaving(true); setErr('');
    try { await api.put(`/helpdesk/${ticket.id}/complete`, { solution, cost: cost ? Number(cost) : undefined }); onDone(); }
    catch (e: unknown) { setErr((e as Error).message); setSaving(false); }
  };
  return (
    <Modal title="ปิดงานซ่อม" onClose={() => !saving && onClose()}>
      {err && <ErrBox msg={err} />}
      <ModalField label="วิธีแก้ไข / สรุปการซ่อม *">
        <textarea className="input-field resize-none" rows={4} value={solution} onChange={(e) => setSolution(e.target.value)} placeholder="อธิบายสิ่งที่ทำ..." />
      </ModalField>
      <ModalField label="ค่าใช้จ่าย (บาท)">
        <input type="number" min="0" step="0.01" className="input-field" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" />
      </ModalField>
      <ModalFooter onClose={() => !saving && onClose()} onSave={handle} saving={saving} saveLabel="ปิดงาน" />
    </Modal>
  );
}

// ─── Shared UI Pieces ─────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl shadow-xl z-10 bg-white" style={{ border: '1px solid #dce6f9' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #dce6f9' }}>
          <h3 className="font-semibold" style={{ color: '#1a2744' }}>{title}</h3>
          <button onClick={onClose}><X className="w-4 h-4" style={{ color: '#4a6080' }} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">{children}</div>
      </div>
    </div>
  );
}
function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium mb-1" style={{ color: '#4a6080' }}>{label}</label>{children}</div>;
}
function ModalFooter({ onClose, onSave, saving, saveLabel }: { onClose: () => void; onSave: () => void; saving: boolean; saveLabel: string }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button onClick={onClose} disabled={saving} className="btn-secondary">ยกเลิก</button>
      <button onClick={onSave} disabled={saving} className="btn-primary flex items-center gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />} {saveLabel}
      </button>
    </div>
  );
}
function ErrBox({ msg }: { msg: string }) {
  return <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm"><AlertTriangle className="w-4 h-4 flex-shrink-0" />{msg}</div>;
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ ticket, isAdmin, userId, techs, onRefresh, onDeselect }: {
  ticket: Ticket; isAdmin: boolean; userId: number; techs: TechUser[]; onRefresh: () => void; onDeselect: () => void;
}) {
  const router = useRouter();
  const [assignOpen, setAssignOpen]     = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [cancelling, setCancelling]     = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [toast, setToast]               = useState('');
  const [toastErr, setToastErr]         = useState('');

  const showToast = (msg: string, err = false) => {
    if (err) { setToastErr(msg); setToast(''); } else { setToast(msg); setToastErr(''); }
    setTimeout(() => { setToast(''); setToastErr(''); }, 3000);
  };

  const done = (msg: string) => { showToast(msg); onRefresh(); };

  const handleCancel = async () => {
    if (!confirm('ยืนยันการยกเลิกใบแจ้งซ่อมนี้?')) return;
    setCancelling(true);
    try { await api.put(`/helpdesk/${ticket.id}/cancel`, {}); done('ยกเลิกสำเร็จ'); }
    catch (e: unknown) { showToast((e as Error).message, true); }
    finally { setCancelling(false); }
  };

  const handleDelete = async () => {
    if (!confirm('ยืนยันการลบใบแจ้งซ่อมนี้?')) return;
    setDeleting(true);
    try { await api.delete(`/helpdesk/${ticket.id}`); done('ลบสำเร็จ'); onDeselect(); }
    catch (e: unknown) { showToast((e as Error).message, true); }
    finally { setDeleting(false); }
  };

  const isReporter = ticket.reporter.id === userId;

  const sm = STATUS[ticket.status] ?? STATUS.pending;
  const um = URGENCY[ticket.urgency] ?? URGENCY.normal;
  const latestAssignment = ticket.assignments[0];
  const isTech = latestAssignment?.technicianId === userId;
  const canActAsTech = isTech || isAdmin;

  // Timeline steps
  const timeline = [
    { label: 'แจ้งซ่อม',     done: true,  date: ticket.createdAt },
    { label: 'มอบหมาย',      done: !!latestAssignment, date: latestAssignment?.assignedAt },
    { label: 'ดำเนินการ',    done: ['in_progress','waiting_parts','completed'].includes(ticket.status), date: undefined },
    { label: 'เสร็จสิ้น',   done: ticket.status === 'completed', date: latestAssignment?.completedAt },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toasts */}
      {(toast || toastErr) && (
        <div className={`fixed top-4 right-4 z-[110] px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 ${toastErr ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {toastErr ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast || toastErr}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4" style={{ borderBottom: '1px solid #dce6f9' }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-sm font-semibold" style={{ color: '#1d6ae5' }}>{ticket.ticketNo}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: um.bg, color: um.text }}>{um.label}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: sm.bg, color: sm.text }}>{sm.label}</span>
          </div>
          <h2 className="font-semibold text-base" style={{ color: '#1a2744' }}>{ticket.title}</h2>
        </div>
        <button onClick={onDeselect} className="p-1.5 rounded-lg hover:bg-[#f5f8ff]">
          <X className="w-4 h-4" style={{ color: '#94a3b8' }} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

        {/* Meta */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {[
            [<User className="w-3.5 h-3.5" key="u" />, 'ผู้แจ้ง', `${ticket.reporter.name}${ticket.reporter.department ? ` (${ticket.reporter.department})` : ''}`],
            [<MapPin className="w-3.5 h-3.5" key="m" />, 'สถานที่', ticket.location],
            [<Wrench className="w-3.5 h-3.5" key="w" />, 'ประเภท', ticket.type],
            [<Clock className="w-3.5 h-3.5" key="c" />, 'วันที่แจ้ง', fmt(ticket.createdAt)],
          ].map(([icon, label, val], i) => (
            <div key={i} className="flex gap-2 items-start col-span-2 sm:col-span-1">
              <span className="flex-shrink-0 mt-0.5" style={{ color: '#94a3b8' }}>{icon}</span>
              <div>
                <p className="text-xs" style={{ color: '#94a3b8' }}>{label as string}</p>
                <p className="text-xs font-medium" style={{ color: '#1a2744' }}>{val as string}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Equipment link */}
        {ticket.equipment && (
          <button onClick={() => router.push(`/equipment/${ticket.equipment!.id}`)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-left transition-colors hover:bg-[#f5f8ff]"
            style={{ border: '1px solid #dce6f9' }}>
            <Package className="w-4 h-4 flex-shrink-0" style={{ color: '#1d6ae5' }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs" style={{ color: '#94a3b8' }}>ครุภัณฑ์ที่เกี่ยวข้อง</p>
              <p className="text-xs font-medium truncate" style={{ color: '#1a2744' }}>{ticket.equipment.name} <span className="font-mono" style={{ color: '#1d6ae5' }}>({ticket.equipment.code})</span></p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#94a3b8' }} />
          </button>
        )}

        {/* Description */}
        <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: '#f5f8ff' }}>
          <p className="text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>รายละเอียดปัญหา</p>
          <p style={{ color: '#1a2744' }}>{ticket.description || '-'}</p>
        </div>

        {/* Image */}
        {ticket.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ticket.image} alt="ภาพประกอบ" className="w-full rounded-xl object-cover max-h-48" style={{ border: '1px solid #dce6f9' }} />
        )}

        {/* Assignment info */}
        {latestAssignment && (
          <div className="p-3 rounded-xl space-y-1 text-sm" style={{ backgroundColor: '#f8faff', border: '1px solid #dce6f9' }}>
            <p className="text-xs font-medium mb-2" style={{ color: '#4a6080' }}>ข้อมูลช่าง</p>
            <div className="flex justify-between">
              <span style={{ color: '#94a3b8' }}>ช่างที่รับผิดชอบ</span>
              <span className="font-medium" style={{ color: '#1a2744' }}>{latestAssignment.technician.name}</span>
            </div>
            {latestAssignment.dueDate && (
              <div className="flex justify-between">
                <span style={{ color: '#94a3b8' }}>กำหนดเสร็จ</span>
                <span style={{ color: '#1a2744' }}>{fmtDate(latestAssignment.dueDate)}</span>
              </div>
            )}
            {latestAssignment.solution && (
              <div className="mt-2">
                <p className="text-xs" style={{ color: '#94a3b8' }}>รายละเอียดการซ่อม</p>
                <p className="mt-0.5 text-xs" style={{ color: '#4a6080' }}>{latestAssignment.solution}</p>
              </div>
            )}
            {latestAssignment.cost && Number(latestAssignment.cost) > 0 && (
              <div className="flex justify-between">
                <span style={{ color: '#94a3b8' }}>ค่าใช้จ่าย</span>
                <span className="font-medium" style={{ color: '#1a2744' }}>{Number(latestAssignment.cost).toLocaleString('th-TH')} บาท</span>
              </div>
            )}
          </div>
        )}

        {/* Timeline */}
        <div>
          <p className="text-xs font-medium mb-3" style={{ color: '#94a3b8' }}>Timeline</p>
          <div className="space-y-0">
            {timeline.map((step, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-0.5 ${step.done ? 'bg-[#1d6ae5]' : 'bg-[#dce6f9]'}`} />
                  {i < timeline.length - 1 && <div className={`w-0.5 h-8 ${step.done ? 'bg-[#1d6ae5]' : 'bg-[#dce6f9]'}`} style={{ opacity: 0.4 }} />}
                </div>
                <div className="pb-2">
                  <p className="text-xs font-medium" style={{ color: step.done ? '#1a2744' : '#94a3b8' }}>{step.label}</p>
                  {step.date && <p className="text-[11px]" style={{ color: '#94a3b8' }}>{fmt(step.date)}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          {isAdmin && ticket.status === 'pending' && (
            <button onClick={() => setAssignOpen(true)} className="w-full btn-primary text-sm flex items-center justify-center gap-2">
              <User className="w-3.5 h-3.5" /> มอบหมายช่าง
            </button>
          )}
          {canActAsTech && ['assigned','in_progress'].includes(ticket.status) && (
            <button onClick={() => setProgressOpen(true)} className="w-full text-sm flex items-center justify-center gap-2 py-2 rounded-xl transition-colors"
              style={{ backgroundColor: '#f5f3ff', color: '#7c3aed', border: '1px solid #e9d5ff' }}>
              <Wrench className="w-3.5 h-3.5" /> อัปเดตความคืบหน้า
            </button>
          )}
          {canActAsTech && ['assigned','in_progress','waiting_parts'].includes(ticket.status) && (
            <button onClick={() => setCompleteOpen(true)} className="w-full text-sm flex items-center justify-center gap-2 py-2 rounded-xl transition-colors"
              style={{ backgroundColor: '#e6f9f0', color: '#0d9068', border: '1px solid #bbf7d0' }}>
              <Check className="w-3.5 h-3.5" /> ปิดงาน
            </button>
          )}
          {isAdmin && !['completed','cancelled'].includes(ticket.status) && (
            <button onClick={handleCancel} disabled={cancelling}
              className="w-full text-sm flex items-center justify-center gap-2 py-2 rounded-xl transition-colors"
              style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} ยกเลิก
            </button>
          )}
          {/* Delete — reporter (pending only) or admin */}
          {(isReporter && ticket.status === 'pending') || isAdmin ? (
            <button onClick={handleDelete} disabled={deleting}
              className="w-full text-sm flex items-center justify-center gap-2 py-2 rounded-xl transition-colors"
              style={{ backgroundColor: '#fff1f2', color: '#be123c', border: '1px solid #fda4af' }}>
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>🗑</span>} ลบรายการ
            </button>
          ) : null}
        </div>
      </div>

      {/* Modals */}
      {assignOpen   && <AssignModal  ticket={ticket} techs={techs} onClose={() => setAssignOpen(false)}   onDone={() => { setAssignOpen(false);   done('มอบหมายสำเร็จ'); }} />}
      {progressOpen && <ProgressModal ticket={ticket} onClose={() => setProgressOpen(false)} onDone={() => { setProgressOpen(false); done('อัปเดตสำเร็จ'); }} />}
      {completeOpen && <CompleteModal ticket={ticket} onClose={() => setCompleteOpen(false)} onDone={() => { setCompleteOpen(false); done('ปิดงานสำเร็จ'); }} />}
    </div>
  );
}

// ─── Ticket Card ──────────────────────────────────────────────────────────────

function TicketCard({ ticket, selected, onClick }: { ticket: Ticket; selected: boolean; onClick: () => void }) {
  const sm = STATUS[ticket.status] ?? STATUS.pending;
  const um = URGENCY[ticket.urgency] ?? URGENCY.normal;
  return (
    <button onClick={onClick} className="w-full text-left px-4 py-3 transition-colors"
      style={{ borderBottom: '1px solid #f5f8ff', backgroundColor: selected ? '#f0f4ff' : undefined }}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-mono text-[11px] font-semibold" style={{ color: '#1d6ae5' }}>{ticket.ticketNo}</span>
        <div className="flex gap-1 flex-shrink-0">
          {ticket.urgency !== 'normal' && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: um.bg, color: um.text }}>{um.label}</span>
          )}
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: sm.bg, color: sm.text }}>{sm.label}</span>
        </div>
      </div>
      <p className="text-sm font-medium line-clamp-1 mb-0.5" style={{ color: '#1a2744' }}>{ticket.title}</p>
      <div className="flex items-center gap-2 text-[11px]" style={{ color: '#94a3b8' }}>
        <MapPin className="w-3 h-3" /><span className="truncate">{ticket.location}</span>
        <span>·</span>
        <span>{ticket.reporter.name}</span>
      </div>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HelpdeskPage() {
  const router = useRouter();
  const [tickets, setTickets]   = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [kpi, setKpi]           = useState<KPI>({ pending: 0, inProgress: 0, critical: 0, completedToday: 0 });
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [statusF, setStatusF]   = useState('');
  const [urgencyF, setUrgencyF] = useState('');
  const [isAdmin, setAdmin]     = useState(false);
  const [userId, setUserId]     = useState(0);
  const [techs, setTechs]       = useState<TechUser[]>([]);
  const [toast, setToast]       = useState('');
  const [toastErr, setToastErr] = useState('');
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, err = false) => {
    if (err) { setToastErr(msg); setToast(''); } else { setToast(msg); setToastErr(''); }
    setTimeout(() => { setToast(''); setToastErr(''); }, 3000);
  };

  useEffect(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) { try { const u = JSON.parse(raw); setAdmin(!!u.isSuperAdmin || u.role === 'admin' || u.role === 'executive'); setUserId(u.id); } catch { /* */ } }
  }, []);

  const loadKPI = useCallback(() => {
    api.get<{ data: KPI }>('/helpdesk/kpi').then((r) => setKpi(r.data)).catch(() => {});
  }, []);

  const loadTechs = useCallback(() => {
    api.get<{ data: TechUser[] }>('/settings/users?role=staff&limit=100')
      .then((r) => setTechs(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: '60' });
      if (search)   p.set('search', search);
      if (statusF)  p.set('status', statusF);
      if (urgencyF) p.set('urgency', urgencyF);
      const res = await api.get<{ data: Ticket[] }>(`/helpdesk?${p}`);
      const arr = Array.isArray(res.data) ? res.data : [];
      setTickets(arr);
      // keep selected in sync
      setSelected((prev) => prev ? (arr.find((t) => t.id === prev.id) ?? null) : null);
    } catch { showToast('โหลดข้อมูลไม่สำเร็จ', true); }
    finally { setLoading(false); }
  }, [search, statusF, urgencyF]);

  useEffect(() => { loadKPI(); loadTechs(); }, [loadKPI, loadTechs]);
  useEffect(() => { loadTickets(); }, [loadTickets]);

  const handleSearchChange = (v: string) => {
    setSearch(v);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => {}, 400);
  };

  const refresh = () => { loadTickets(); loadKPI(); };

  const KPI_CARDS = [
    { label: 'รอรับเรื่อง',   value: kpi.pending,        bg: '#eff6ff', text: '#1d6ae5', key: 'pending' },
    { label: 'ดำเนินการ',     value: kpi.inProgress,     bg: '#f5f3ff', text: '#7c3aed', key: 'in_progress' },
    { label: 'วิกฤต',         value: kpi.critical,       bg: '#fef2f2', text: '#dc2626', key: '' },
    { label: 'เสร็จวันนี้',   value: kpi.completedToday, bg: '#e6f9f0', text: '#0d9068', key: 'completed' },
  ];

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Global toast */}
      {(toast || toastErr) && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 ${toastErr ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {toastErr ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast || toastErr}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>Helpdesk แจ้งซ่อม</h1>
          <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>จัดการการแจ้งซ่อมและบำรุงรักษา</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push('/helpdesk/pm')} className="btn-secondary text-sm flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5" /> PM บำรุงรักษา
          </button>
          <button onClick={() => router.push('/helpdesk/report')} className="btn-secondary text-sm">รายงาน</button>
          <button onClick={() => router.push('/helpdesk/new')} className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus className="w-3.5 h-3.5" /> แจ้งซ่อม
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPI_CARDS.map(({ label, value, bg, text, key }) => (
          <button key={label} onClick={() => key ? setStatusF(statusF === key ? '' : key) : null}
            className="bg-white rounded-xl p-3 text-center transition-all hover:shadow-sm"
            style={{ border: `1px solid ${statusF === key ? text : '#dce6f9'}` }}>
            <p className="text-2xl font-bold" style={{ color: text }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>{label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl flex-1 min-w-[160px] max-w-xs" style={{ backgroundColor: '#f5f8ff', border: '1px solid #dce6f9' }}>
          <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#94a3b8' }} />
          <input value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="ค้นหา ticket..." className="flex-1 bg-transparent text-sm outline-none placeholder-[#94a3b8]" style={{ color: '#1a2744' }} />
          {search && <button onClick={() => setSearch('')}><X className="w-3 h-3" style={{ color: '#94a3b8' }} /></button>}
        </div>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="input-field text-sm py-1.5 w-auto">
          <option value="">สถานะทั้งหมด</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={urgencyF} onChange={(e) => setUrgencyF(e.target.value)} className="input-field text-sm py-1.5 w-auto">
          <option value="">ความเร่งด่วนทั้งหมด</option>
          {Object.entries(URGENCY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* 2-column layout */}
      <div className="flex-1 flex gap-4 min-h-0" style={{ height: 'calc(100vh - 320px)' }}>
        {/* Left: ticket list */}
        <div className="bg-white rounded-xl overflow-hidden flex flex-col" style={{ border: '1px solid #dce6f9', width: selected ? '40%' : '100%', transition: 'width 0.2s' }}>
          <div className="px-4 py-2.5 text-xs font-semibold" style={{ backgroundColor: '#f8faff', borderBottom: '1px solid #f0f4ff', color: '#94a3b8' }}>
            {loading ? 'กำลังโหลด...' : `${tickets.length} รายการ`}
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2" style={{ color: '#94a3b8' }}>
                <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลด...
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2" style={{ color: '#94a3b8' }}>
                <Wrench className="w-10 h-10" style={{ opacity: 0.3 }} />
                <p className="text-sm">ไม่มีรายการแจ้งซ่อม</p>
              </div>
            ) : tickets.map((t) => (
              <TicketCard key={t.id} ticket={t} selected={selected?.id === t.id} onClick={() => setSelected(t)} />
            ))}
          </div>
        </div>

        {/* Right: detail panel */}
        {selected && (
          <div className="bg-white rounded-xl overflow-hidden flex flex-col flex-1" style={{ border: '1px solid #dce6f9' }}>
            <DetailPanel ticket={selected} isAdmin={isAdmin} userId={userId} techs={techs} onRefresh={refresh} onDeselect={() => setSelected(null)} />
          </div>
        )}

        {/* Empty state when no selection */}
        {!selected && (
          <div className="hidden md:flex flex-1 items-center justify-center rounded-xl" style={{ border: '2px dashed #dce6f9', color: '#94a3b8' }}>
            <div className="text-center">
              <Wrench className="w-12 h-12 mx-auto mb-2" style={{ opacity: 0.2 }} />
              <p className="text-sm">เลือก ticket เพื่อดูรายละเอียด</p>
              <ChevronRight className="w-4 h-4 mx-auto mt-1" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
