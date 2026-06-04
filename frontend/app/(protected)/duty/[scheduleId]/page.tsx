'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ChevronLeft, Camera, X, Check, AlertTriangle, Loader2,
  UserCheck, UserX, CalendarCheck,
} from 'lucide-react';
import { api, USER_KEY } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Schedule {
  id:             number;
  semester:       string;
  dutyDate:       string;
  departmentName: string;
  note:           string | null;
  createdBy:      string;
}

interface DutyLog {
  id:           number;
  scheduleId:   number;
  teacherId:    number;
  status:       string;
  photo:        string | null;
  note:         string | null;
  recordedById: number | null;
}

interface Teacher {
  id:         number;
  name:       string;
  employeeId: string;
  nickname:   string | null;
  position:   string | null;
  avatar:     string | null;
  log:        DutyLog | null;
}

// ─── Log Modal ────────────────────────────────────────────────────────────────

interface LogModalProps {
  teacher: Teacher;
  scheduleId: number;
  isAdminAction: boolean;
  onClose: () => void;
  onSaved: (teacherId: number, log: DutyLog) => void;
  showToast: (msg: string, isErr?: boolean) => void;
}

function LogModal({ teacher, scheduleId, isAdminAction, onClose, onSaved, showToast }: LogModalProps) {
  const [status, setStatus]   = useState<'PRESENT' | 'ABSENT'>(
    (teacher.log?.status as 'PRESENT' | 'ABSENT') ?? 'PRESENT'
  );
  const [note, setNote]       = useState(teacher.log?.note ?? '');
  const [photoFile, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(teacher.log?.photo ?? null);
  const [saving, setSaving]   = useState(false);
  const fileRef               = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setPhoto(file);
    const r = new FileReader();
    r.onload = (e) => setPreview(e.target?.result as string);
    r.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        scheduleId,
        status,
        note: note.trim() || null,
      };
      if (photoFile && preview && status === 'PRESENT') {
        body.photo         = preview;
        body.photoFileName = photoFile.name;
      }

      let log: DutyLog;
      if (isAdminAction) {
        const res = await api.post<{ data: DutyLog[] }>('/duty/logs/batch', [
          { ...body, teacherId: teacher.id },
        ]);
        log = res.data[0];
      } else {
        const res = await api.post<{ data: DutyLog }>('/duty/logs', body);
        log = res.data;
      }

      onSaved(teacher.id, log);
      onClose();
    } catch (e: unknown) {
      showToast((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-sm rounded-2xl shadow-xl z-10"
        style={{ backgroundColor: '#ffffff', border: '1px solid #dce6f9' }}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f4ff' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: '#2979ff' }}>
              {teacher.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#1a2744' }}>{teacher.name}</p>
              <p className="text-xs" style={{ color: '#4a6080' }}>บันทึกการเวร</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#f5f8ff]">
            <X className="w-4 h-4" style={{ color: '#4a6080' }} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Status toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setStatus('PRESENT')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={
                status === 'PRESENT'
                  ? { backgroundColor: '#e6f9f0', color: '#0d9068', border: '2px solid #0d9068' }
                  : { backgroundColor: '#f5f8ff', color: '#4a6080', border: '1px solid #dce6f9' }
              }
            >
              <UserCheck className="w-4 h-4" /> มาเวร
            </button>
            <button
              onClick={() => setStatus('ABSENT')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={
                status === 'ABSENT'
                  ? { backgroundColor: '#fef2f2', color: '#dc2626', border: '2px solid #dc2626' }
                  : { backgroundColor: '#f5f8ff', color: '#4a6080', border: '1px solid #dce6f9' }
              }
            >
              <UserX className="w-4 h-4" /> ไม่มาเวร
            </button>
          </div>

          {/* Photo (PRESENT only) */}
          {status === 'PRESENT' && (
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>รูปหลักฐาน (ไม่บังคับ)</p>
              {preview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="preview" className="w-full h-40 object-cover rounded-xl" />
                  <button
                    onClick={() => { setPreview(null); setPhoto(null); }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-colors hover:bg-[#f5f8ff]"
                  style={{ borderColor: '#dce6f9' }}
                >
                  <Camera className="w-5 h-5" style={{ color: '#94a3b8' }} />
                  <span className="text-xs" style={{ color: '#4a6080' }}>
                    <span style={{ color: '#1d6ae5' }}>อัปโหลดรูป</span> หรือถ่ายจากกล้อง
                  </span>
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>
              {status === 'ABSENT' ? 'เหตุผล *' : 'หมายเหตุ (ไม่บังคับ)'}
            </label>
            <textarea
              className="input-field resize-none"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={status === 'ABSENT' ? 'กรุณาระบุเหตุผลที่ไม่มาเวร' : 'หมายเหตุเพิ่มเติม...'}
            />
          </div>
        </div>

        <div className="px-5 py-3 flex justify-end gap-2" style={{ borderTop: '1px solid #f0f4ff' }}>
          <button onClick={onClose} className="btn-secondary text-sm">ยกเลิก</button>
          <button
            onClick={handleSubmit}
            disabled={saving || (status === 'ABSENT' && !note.trim())}
            className="btn-primary text-sm flex items-center gap-2"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ScheduleDetailPage() {
  const router                        = useRouter();
  const { scheduleId }                = useParams<{ scheduleId: string }>();
  const [schedule, setSchedule]       = useState<Schedule | null>(null);
  const [teachers, setTeachers]       = useState<Teacher[]>([]);
  const [loading, setLoading]         = useState(true);
  const [logModal, setLogModal]       = useState<Teacher | null>(null);
  const [isAdmin, setIsAdmin]         = useState(false);
  const [currentUserId, setCurrentId] = useState<number | null>(null);
  const [toast, setToast]             = useState('');
  const [toastErr, setToastErr]       = useState('');

  const showToast = (msg: string, isErr = false) => {
    if (isErr) { setToastErr(msg); setToast(''); } else { setToast(msg); setToastErr(''); }
    setTimeout(() => { setToast(''); setToastErr(''); }, 3000);
  };

  useEffect(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      try {
        const u = JSON.parse(raw);
        setIsAdmin(!!u.isSuperAdmin || u.role === 'admin');
        setCurrentId(u.id);
      } catch { /* ignore */ }
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: { schedule: Schedule; teachers: Teacher[] } }>(
        `/duty/schedules/${scheduleId}/teachers`
      );
      setSchedule(res.data.schedule);
      setTeachers(res.data.teachers);
    } catch (e: unknown) {
      showToast((e as Error).message, true);
    } finally {
      setLoading(false);
    }
  }, [scheduleId]);

  useEffect(() => { load(); }, [load]);

  const handleLogSaved = (teacherId: number, log: DutyLog) => {
    setTeachers((prev) =>
      prev.map((t) => t.id === teacherId ? { ...t, log } : t)
    );
    showToast('บันทึกสำเร็จ');
  };

  const MONTH_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const fmtDate = (d: string) => {
    const dt = new Date(d);
    return `${dt.getDate()} ${MONTH_SHORT[dt.getMonth()]} ${dt.getFullYear() + 543}`;
  };

  const POS: Record<string, string> = {
    teacher: 'ครู/อาจารย์', specialist: 'ผู้เชี่ยวชาญ', officer: 'เจ้าหน้าที่',
    work_unit_chief: 'หัวหน้างาน', department_chief: 'หัวหน้าแผนก',
  };

  const presentCount = teachers.filter((t) => t.log?.status === 'PRESENT').length;
  const loggedCount  = teachers.filter((t) => t.log).length;

  // ครูที่จะแสดง: admin = ทุกคน, teacher = ตัวเองเท่านั้น
  const visibleTeachers = isAdmin
    ? teachers
    : teachers.filter((t) => t.id === currentUserId);

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Toast */}
      {(toast || toastErr) && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 ${toastErr ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {toastErr ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast || toastErr}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/duty')}
          className="p-2 rounded-xl hover:bg-[#f5f8ff] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" style={{ color: '#4a6080' }} />
        </button>
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-5 h-5" style={{ color: '#1d6ae5' }} />
          <div>
            <h1 className="text-lg font-bold leading-tight" style={{ color: '#1a2744' }}>
              {loading ? 'กำลังโหลด...' : `เวร ${schedule ? fmtDate(schedule.dutyDate) : ''}`}
            </h1>
            {schedule && (
              <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>
                {schedule.departmentName} · ภาค {schedule.semester}
              </p>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3" style={{ color: '#94a3b8' }}>
          <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลด...
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'ครูทั้งหมด', value: teachers.length, color: '#1d6ae5', bg: '#e8f0fe' },
              { label: 'มาเวร',      value: presentCount,     color: '#0d9068', bg: '#e6f9f0' },
              { label: 'บันทึกแล้ว', value: loggedCount,      color: '#b45309', bg: '#fffbeb' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className="bg-white rounded-xl p-3 text-center" style={{ border: '1px solid #dce6f9' }}>
                <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Teachers table */}
          <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #dce6f9' }}>
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid #f0f4ff' }}
            >
              <p className="text-sm font-semibold" style={{ color: '#1a2744' }}>
                รายชื่อครู{!isAdmin && ' (ของคุณ)'}
              </p>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#f8faff', borderBottom: '1px solid #f0f4ff' }}>
                  {['', 'ชื่อ', 'สถานะ', 'หลักฐาน', ''].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: '#94a3b8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm" style={{ color: '#94a3b8' }}>
                      {isAdmin ? 'ไม่พบครูในแผนกนี้' : 'คุณไม่ได้อยู่ในตารางเวรนี้'}
                    </td>
                  </tr>
                ) : (
                  visibleTeachers.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f5f8ff' }} className="hover:bg-[#fafbff] transition-colors">
                      {/* Avatar */}
                      <td className="pl-4 py-2.5 w-10">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#2979ff' }}>
                          {t.name.charAt(0)}
                        </div>
                      </td>
                      {/* Name */}
                      <td className="px-3 py-2.5">
                        <p className="text-sm font-medium" style={{ color: '#1a2744' }}>{t.name}</p>
                        <p className="text-xs" style={{ color: '#94a3b8' }}>
                          {POS[t.position ?? ''] ?? t.position ?? ''} · {t.employeeId}
                        </p>
                      </td>
                      {/* Status */}
                      <td className="px-3 py-2.5">
                        {t.log ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                            style={
                              t.log.status === 'PRESENT'
                                ? { backgroundColor: '#e6f9f0', color: '#0d9068' }
                                : { backgroundColor: '#fef2f2', color: '#dc2626' }
                            }
                          >
                            {t.log.status === 'PRESENT' ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                            {t.log.status === 'PRESENT' ? 'มา' : 'ไม่มา'}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: '#94a3b8' }}>ยังไม่บันทึก</span>
                        )}
                      </td>
                      {/* Photo */}
                      <td className="px-3 py-2.5">
                        {t.log?.photo ? (
                          <a href={t.log.photo} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={t.log.photo}
                              alt="evidence"
                              className="w-10 h-10 object-cover rounded-lg hover:opacity-80 transition-opacity"
                            />
                          </a>
                        ) : t.log?.note ? (
                          <p className="text-xs max-w-[120px] truncate" style={{ color: '#4a6080' }} title={t.log.note}>
                            {t.log.note}
                          </p>
                        ) : (
                          <span className="text-xs" style={{ color: '#e2e8f0' }}>—</span>
                        )}
                      </td>
                      {/* Action */}
                      <td className="pr-4 py-2.5">
                        {(isAdmin || t.id === currentUserId) && (
                          <button
                            onClick={() => setLogModal(t)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                            style={
                              t.log
                                ? { backgroundColor: '#f5f8ff', color: '#4a6080' }
                                : { backgroundColor: '#e8f0fe', color: '#1d6ae5' }
                            }
                          >
                            {t.log ? 'แก้ไข' : isAdmin ? 'บันทึกแทน' : 'บันทึก'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Log Modal */}
      {logModal && schedule && (
        <LogModal
          teacher={logModal}
          scheduleId={schedule.id}
          isAdminAction={isAdmin && logModal.id !== currentUserId}
          onClose={() => setLogModal(null)}
          onSaved={handleLogSaved}
          showToast={showToast}
        />
      )}
    </div>
  );
}
