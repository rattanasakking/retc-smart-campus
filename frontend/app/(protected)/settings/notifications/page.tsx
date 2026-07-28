'use client';
import { Fragment, useEffect, useState } from 'react';
import { Bell, Check, AlertTriangle, Loader2, ChevronRight, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';

type Channel = 'line' | 'telegram' | 'email';
type ChannelRow = Record<Channel, boolean>;
type Matrix = Record<string, ChannelRow>;

const CHANNELS: Channel[] = ['line', 'telegram', 'email'];

const MODULE_META: { key: string; label: string; icon: string }[] = [
  { key: 'DUTY',         label: 'เวรรับนักเรียน',    icon: '🎓' },
  { key: 'WORK_LOG',     label: 'บันทึกปฏิบัติงาน', icon: '📋' },
  { key: 'EQUIPMENT',    label: 'ยืมครุภัณฑ์',       icon: '🖥️' },
  { key: 'HELPDESK',     label: 'แจ้งซ่อม',          icon: '🔧' },
  { key: 'ROOM_BOOKING', label: 'จองห้องประชุม',     icon: '🏫' },
  { key: 'LOST_FOUND',   label: 'ของหาย-ของได้',     icon: '🔍' },
  { key: 'PERSONNEL',    label: 'บุคลากร',           icon: '👤' },
  { key: 'LEAVE',        label: 'การลา',             icon: '📅' },
];

const CHANNEL_META: { key: Channel; label: string; icon: string; color: string }[] = [
  { key: 'line',     label: 'LINE',     icon: '🟢', color: '#06c755' },
  { key: 'telegram', label: 'Telegram', icon: '🔵', color: '#229ED9' },
  { key: 'email',    label: 'Email',    icon: '📧', color: '#1d6ae5' },
];

// เหตุการณ์แจ้งเตือนย่อยของแต่ละโมดูล (แจ้งใคร)
const MODULE_EVENTS: Record<string, { id: string; label: string; to: string }[]> = {
  ROOM_BOOKING: [
    { id: 'room.new',          label: 'มีการจองใหม่ (รออนุมัติ)', to: 'แจ้งแอดมิน/ผู้ดูแลระบบจอง' },
    { id: 'room.manager',      label: 'มีการจองห้องที่ดูแล',       to: 'แจ้งผู้ดูแลห้อง' },
    { id: 'room.table',        label: 'คำร้องขอจัดโต๊ะ',           to: 'แจ้งหัวหน้างานอาคารสถานที่' },
    { id: 'room.status_staff', label: 'มีการเปลี่ยนสถานะการจอง',   to: 'แจ้งผู้ดูแล + แอดมิน' },
    { id: 'room.status_user',  label: 'ผลอนุมัติ / ปฏิเสธ',        to: 'แจ้งผู้จอง' },
  ],
  LEAVE: [
    { id: 'leave.request', label: 'มีคำขอลาใหม่',      to: 'แจ้งหัวหน้า/ผู้อนุมัติ (เฉพาะ LINE)' },
    { id: 'leave.status',  label: 'ผลอนุมัติการลา',    to: 'แจ้งผู้ขอลา (เฉพาะ LINE)' },
  ],
  WORK_LOG: [
    { id: 'worklog.submit', label: 'ส่งบันทึกให้ตรวจ',  to: 'แจ้งหัวหน้า/ผู้ตรวจ (เฉพาะ LINE)' },
    { id: 'worklog.status', label: 'ผลอนุมัติบันทึก',   to: 'แจ้งผู้บันทึก (เฉพาะ LINE)' },
  ],
  HELPDESK: [
    { id: 'helpdesk.new', label: 'มีการแจ้งซ่อมใหม่', to: 'แจ้งแอดมิน (Telegram/Email/กระดิ่ง)' },
  ],
  LOST_FOUND: [
    { id: 'lostfound.new', label: 'มีรายการของหาย/ของได้ใหม่', to: 'แจ้งแอดมิน (Telegram/Email/กระดิ่ง)' },
  ],
};

const emptyRow = (): ChannelRow => ({ line: true, telegram: true, email: true });
const rowFrom = (m: Record<string, string>, prefix: string): ChannelRow => ({
  line:     m[`${prefix}line`]     !== 'false',
  telegram: m[`${prefix}telegram`] !== 'false',
  email:    m[`${prefix}email`]    !== 'false',
});

function Toggle({ on, disabled, onClick, size = 'md' }: { on: boolean; disabled?: boolean; onClick: () => void; size?: 'sm' | 'md' }) {
  const w = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11';
  const knob = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const travel = size === 'sm' ? 'translate-x-4' : 'translate-x-5';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex ${w} flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'} ${on ? 'bg-green-500' : 'bg-gray-300'}`}
      role="switch"
      aria-checked={on}
    >
      <span className={`pointer-events-none inline-block ${knob} transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${on ? travel : 'translate-x-0'}`} />
    </button>
  );
}

export default function NotificationsPage() {
  const [matrix, setMatrix]     = useState<Matrix>({});
  const [globals, setGlobals]   = useState<ChannelRow>(emptyRow);
  const [eventCh, setEventCh]   = useState<Record<string, ChannelRow>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState('');
  const [toastErr, setToastErr] = useState('');

  const showToast = (msg: string, err = false) => {
    if (err) { setToastErr(msg); setToast(''); } else { setToast(msg); setToastErr(''); }
    setTimeout(() => { setToast(''); setToastErr(''); }, 3000);
  };

  useEffect(() => {
    Promise.all([
      api.get<{ data: Matrix }>('/settings/notifications'),
      api.get<{ data: Record<string, string> }>('/settings/general'),
    ])
      .then(([mods, gen]) => {
        setMatrix(mods.data ?? {});
        const m = gen.data ?? {};
        setGlobals({
          line:     m['notify_channel_line']     !== 'false',
          telegram: m['notify_channel_telegram'] !== 'false',
          email:    m['notify_channel_email']    !== 'false',
        });
        const ev: Record<string, ChannelRow> = {};
        for (const list of Object.values(MODULE_EVENTS))
          for (const e of list) ev[e.id] = rowFrom(m, `notify_evt_${e.id}_`);
        setEventCh(ev);
      })
      .catch(() => showToast('โหลดข้อมูลล้มเหลว', true))
      .finally(() => setLoading(false));
  }, []);

  const cellOn    = (module: string, ch: Channel) => matrix[module]?.[ch] !== false;
  const eventOn   = (id: string, ch: Channel) => eventCh[id]?.[ch] !== false;

  const toggleCell = (module: string, ch: Channel) =>
    setMatrix((prev) => {
      const ex = prev[module];
      const row: ChannelRow = { line: ex?.line !== false, telegram: ex?.telegram !== false, email: ex?.email !== false };
      return { ...prev, [module]: { ...row, [ch]: !row[ch] } };
    });

  const toggleEvent = (id: string, ch: Channel) =>
    setEventCh((prev) => {
      const ex = prev[id];
      const row: ChannelRow = { line: ex?.line !== false, telegram: ex?.telegram !== false, email: ex?.email !== false };
      return { ...prev, [id]: { ...row, [ch]: !row[ch] } };
    });

  const toggleGlobal = (ch: Channel) => setGlobals((p) => ({ ...p, [ch]: !p[ch] }));
  const toggleExpand = (module: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module); else next.add(module);
      return next;
    });

  const save = async () => {
    setSaving(true);
    try {
      const payload: Matrix = {};
      for (const { key } of MODULE_META)
        payload[key] = { line: cellOn(key, 'line'), telegram: cellOn(key, 'telegram'), email: cellOn(key, 'email') };

      const gen: Record<string, string> = {
        notify_channel_line:     String(globals.line),
        notify_channel_telegram: String(globals.telegram),
        notify_channel_email:    String(globals.email),
      };
      for (const list of Object.values(MODULE_EVENTS))
        for (const e of list)
          for (const ch of CHANNELS) gen[`notify_evt_${e.id}_${ch}`] = String(eventOn(e.id, ch));

      await Promise.all([
        api.put('/settings/notifications', payload),
        api.put('/settings/general', gen),
      ]);
      showToast('บันทึกการตั้งค่าสำเร็จ');
    } catch (e: unknown) {
      showToast((e as Error).message ?? 'เกิดข้อผิดพลาด', true);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {(toast || toastErr) && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 ${toastErr ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {toastErr ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast || toastErr}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Bell className="w-5 h-5" style={{ color: '#1d6ae5' }} />
          <h1 className="text-lg font-bold" style={{ color: '#1a2744' }}>การแจ้งเตือน</h1>
        </div>
        <button onClick={save} disabled={saving || loading} className="btn-primary flex items-center gap-1.5 text-sm py-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          บันทึก
        </button>
      </div>

      <div className="rounded-xl px-4 py-3 text-xs" style={{ backgroundColor: '#f0f4ff', color: '#4a6080' }}>
        เลือกช่องทางของแต่ละโมดูล (สวิตช์หัวคอลัมน์ = เปิด/ปิดทั้งช่องทาง) · กด <ChevronRight className="w-3 h-3 inline -mt-0.5" /> เพื่อกำหนด
        <strong> รายเหตุการณ์</strong> ว่าจะแจ้ง <strong>ใคร</strong> ผ่าน <strong>ช่องทางไหน</strong> · 🔔 กระดิ่งในระบบ เปิดตลอด ฟรี
      </div>

      {loading ? (
        <div className="bg-white rounded-xl py-12 text-center text-sm" style={{ border: '1px solid #dce6f9', color: '#94a3b8' }}>
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> กำลังโหลด...
        </div>
      ) : (
        <div className="bg-white rounded-xl overflow-x-auto" style={{ border: '1px solid #dce6f9' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #dce6f9', backgroundColor: '#f8faff' }}>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#94a3b8' }}>โมดูล / เหตุการณ์</th>
                {CHANNEL_META.map(({ key, label, icon, color }) => (
                  <th key={key} className="px-3 py-3 text-center" style={{ minWidth: 92 }}>
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-xs font-semibold flex items-center gap-1" style={{ color }}>
                        <span>{icon}</span> {label}
                      </span>
                      <Toggle size="sm" on={globals[key]} onClick={() => toggleGlobal(key)} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULE_META.map(({ key, label, icon }) => {
                const evList = MODULE_EVENTS[key] ?? [];
                const isOpen = expanded.has(key);
                return (
                  <Fragment key={key}>
                    {/* module row */}
                    <tr style={{ borderBottom: isOpen ? 'none' : '1px solid #f5f8ff' }} className="hover:bg-[#fafbff] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {evList.length > 0 ? (
                            <button onClick={() => toggleExpand(key)} className="p-0.5 rounded hover:bg-[#e8f0fe]" style={{ color: '#4a6080' }}>
                              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          ) : <span className="w-5 inline-block" />}
                          <span className="text-xl">{icon}</span>
                          <span className="text-sm font-medium" style={{ color: '#1a2744' }}>{label}</span>
                        </div>
                      </td>
                      {CHANNEL_META.map(({ key: ch }) => {
                        const globalOff = !globals[ch];
                        return (
                          <td key={ch} className="px-3 py-3 text-center">
                            <div className="flex justify-center">
                              <Toggle on={cellOn(key, ch) && !globalOff} disabled={globalOff} onClick={() => toggleCell(key, ch)} />
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* event sub-rows */}
                    {isOpen && evList.map((e, i) => (
                      <tr key={e.id} style={{ borderBottom: i === evList.length - 1 ? '1px solid #f5f8ff' : 'none', backgroundColor: '#fafbff' }}>
                        <td className="pl-12 pr-4 py-2">
                          <p className="text-xs font-medium" style={{ color: '#1a2744' }}>{e.label}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: '#94a3b8' }}>{e.to}</p>
                        </td>
                        {CHANNEL_META.map(({ key: ch }) => {
                          const disabled = !globals[ch] || !cellOn(key, ch);
                          return (
                            <td key={ch} className="px-3 py-2 text-center">
                              <div className="flex justify-center">
                                <Toggle size="sm" on={eventOn(e.id, ch) && !disabled} disabled={disabled} onClick={() => toggleEvent(e.id, ch)} />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs" style={{ color: '#94a3b8' }}>
        หมายเหตุ: เหตุการณ์จะส่งทางช่องทางหนึ่งได้ก็ต่อเมื่อเปิดครบทั้ง <strong>ช่องทางทั้งระบบ → ช่องทางของโมดูล → ช่องทางของเหตุการณ์</strong> ·
        สวิตช์ที่จางคือช่องทางของโมดูลนั้นถูกปิดไว้ · ผู้ใช้แต่ละคนยังปิดรับส่วนตัวได้จากหน้าโปรไฟล์
      </p>
    </div>
  );
}
