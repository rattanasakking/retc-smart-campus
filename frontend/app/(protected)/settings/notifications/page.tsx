'use client';
import { useEffect, useState } from 'react';
import { Bell, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

type Channel = 'line' | 'telegram' | 'email';
type ChannelRow = Record<Channel, boolean>;
type Matrix = Record<string, ChannelRow>;

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
  const [globals, setGlobals]   = useState<ChannelRow>({ line: true, telegram: true, email: true });
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
      })
      .catch(() => showToast('โหลดข้อมูลล้มเหลว', true))
      .finally(() => setLoading(false));
  }, []);

  const cellOn = (module: string, ch: Channel) => matrix[module]?.[ch] !== false; // default true

  const toggleCell = (module: string, ch: Channel) =>
    setMatrix((prev) => {
      const ex = prev[module];
      const row: ChannelRow = {
        line:     ex?.line     !== false,
        telegram: ex?.telegram !== false,
        email:    ex?.email    !== false,
      };
      return { ...prev, [module]: { ...row, [ch]: !row[ch] } };
    });

  const toggleGlobal = (ch: Channel) => setGlobals((p) => ({ ...p, [ch]: !p[ch] }));

  const save = async () => {
    setSaving(true);
    try {
      const payload: Matrix = {};
      for (const { key } of MODULE_META) {
        payload[key] = { line: cellOn(key, 'line'), telegram: cellOn(key, 'telegram'), email: cellOn(key, 'email') };
      }
      await Promise.all([
        api.put('/settings/notifications', payload),
        api.put('/settings/general', {
          notify_channel_line:     String(globals.line),
          notify_channel_telegram: String(globals.telegram),
          notify_channel_email:    String(globals.email),
        }),
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
        กำหนดได้ว่าแต่ละโมดูลจะส่งการแจ้งเตือนผ่านช่องทางไหนบ้าง · สวิตช์บนหัวคอลัมน์ = เปิด/ปิดทั้งช่องทางสำหรับทุกโมดูล ·
        🔔 การแจ้งเตือนในระบบ (กระดิ่ง) เปิดตลอด ฟรี
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
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#94a3b8' }}>โมดูล</th>
                {CHANNEL_META.map(({ key, label, icon, color }) => (
                  <th key={key} className="px-3 py-3 text-center">
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
              {MODULE_META.map(({ key, label, icon }) => (
                <tr key={key} style={{ borderBottom: '1px solid #f5f8ff' }} className="hover:bg-[#fafbff] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{icon}</span>
                      <span className="text-sm font-medium" style={{ color: '#1a2744' }}>{label}</span>
                    </div>
                  </td>
                  {CHANNEL_META.map(({ key: ch }) => {
                    const on = cellOn(key, ch);
                    const globalOff = !globals[ch];
                    return (
                      <td key={ch} className="px-3 py-3 text-center">
                        <div className="flex justify-center">
                          <Toggle on={on && !globalOff} disabled={globalOff} onClick={() => toggleCell(key, ch)} />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs" style={{ color: '#94a3b8' }}>
        หมายเหตุ: หากปิดสวิตช์บนหัวคอลัมน์ ช่องทางนั้นจะไม่ส่งเลยทุกโมดูล (คอลัมน์จะจางลง) ·
        ผู้ใช้แต่ละคนยังปิดรับการแจ้งเตือนส่วนตัวได้จากหน้าโปรไฟล์
      </p>
    </div>
  );
}
