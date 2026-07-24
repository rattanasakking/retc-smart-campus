'use client';
import { useEffect, useState } from 'react';
import { Bell, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface NotifySettings { [module: string]: boolean }
interface Channels { line: boolean; telegram: boolean; email: boolean }

const MODULE_META: { key: string; label: string; icon: string; desc: string }[] = [
  { key: 'DUTY',         label: 'เวรรับนักเรียน',    icon: '🎓', desc: 'แจ้งเมื่อมีการบันทึกเวร/ขาดเวร' },
  { key: 'WORK_LOG',     label: 'บันทึกปฏิบัติงาน', icon: '📋', desc: 'แจ้งเมื่อมีการส่ง/อนุมัติรายงาน' },
  { key: 'EQUIPMENT',    label: 'ยืมครุภัณฑ์',       icon: '🖥️', desc: 'แจ้งเมื่อมีคำขอยืม/คืนครุภัณฑ์' },
  { key: 'HELPDESK',     label: 'แจ้งซ่อม',          icon: '🔧', desc: 'แจ้งเมื่อมีการแจ้งซ่อมใหม่' },
  { key: 'ROOM_BOOKING', label: 'จองห้องประชุม',     icon: '🏫', desc: 'แจ้งเมื่อมีการอนุมัติ/ปฏิเสธการจอง' },
  { key: 'LOST_FOUND',   label: 'ของหาย-ของได้',     icon: '🔍', desc: 'แจ้งเมื่อมีการรายงานของหาย/ของได้' },
  { key: 'PERSONNEL',    label: 'บุคลากร',           icon: '👤', desc: 'แจ้งเมื่อมีการเปลี่ยนแปลงข้อมูลบุคลากร' },
  { key: 'LEAVE',        label: 'การลา',             icon: '📅', desc: 'แจ้งเมื่อมีคำขอลาใหม่หรืออัปเดตสถานะ' },
];

const CHANNEL_META: { key: keyof Channels; label: string; icon: string; color: string; desc: string }[] = [
  { key: 'line',     label: 'LINE',     icon: '🟢', color: '#06c755', desc: 'ส่งผ่าน LINE Bot (Push/Flex) — มีโควตา 300 ข้อความ/เดือน แผนฟรี' },
  { key: 'telegram', label: 'Telegram', icon: '🔵', color: '#229ED9', desc: 'ส่งผ่าน Telegram — ฟรี ไม่จำกัด (แนะนำเป็นช่องทางหลัก)' },
  { key: 'email',    label: 'Email',    icon: '📧', color: '#1d6ae5', desc: 'ส่งผ่านอีเมล — ต้องตั้งค่า Email provider ที่หน้าการเชื่อมต่อภายนอก' },
];

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${on ? 'bg-green-500' : 'bg-gray-300'}`}
      role="switch"
      aria-checked={on}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

export default function NotificationsPage() {
  const [settings, setSettings] = useState<NotifySettings>({});
  const [channels, setChannels] = useState<Channels>({ line: true, telegram: true, email: true });
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
      api.get<{ data: NotifySettings }>('/settings/notifications'),
      api.get<{ data: Record<string, string> }>('/settings/general'),
    ])
      .then(([mods, gen]) => {
        setSettings(mods.data ?? {});
        const m = gen.data ?? {};
        setChannels({
          line:     m['notify_channel_line']     !== 'false',
          telegram: m['notify_channel_telegram'] !== 'false',
          email:    m['notify_channel_email']    !== 'false',
        });
      })
      .catch(() => showToast('โหลดข้อมูลล้มเหลว', true))
      .finally(() => setLoading(false));
  }, []);

  const toggleModule  = (key: string) => setSettings((p) => ({ ...p, [key]: !p[key] }));
  const toggleChannel = (key: keyof Channels) => setChannels((p) => ({ ...p, [key]: !p[key] }));

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all([
        api.put('/settings/notifications', settings),
        api.put('/settings/general', {
          notify_channel_line:     String(channels.line),
          notify_channel_telegram: String(channels.telegram),
          notify_channel_email:    String(channels.email),
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
        <button
          onClick={save}
          disabled={saving || loading}
          className="btn-primary flex items-center gap-1.5 text-sm py-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          บันทึก
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl py-12 text-center text-sm" style={{ border: '1px solid #dce6f9', color: '#94a3b8' }}>
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
          กำลังโหลด...
        </div>
      ) : (
        <>
          {/* ── ช่องทางการแจ้งเตือน ─────────────────────────── */}
          <div>
            <div className="mb-2">
              <p className="text-sm font-semibold" style={{ color: '#1a2744' }}>ช่องทางการแจ้งเตือน</p>
              <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>เปิด/ปิดแต่ละช่องทางสำหรับทั้งระบบ — 🔔 การแจ้งเตือนในระบบ (กระดิ่ง) เปิดตลอด ฟรี</p>
            </div>
            <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #dce6f9' }}>
              <div className="divide-y" style={{ borderColor: '#f0f4ff' }}>
                {CHANNEL_META.map(({ key, label, icon, color, desc }) => (
                  <div key={key} className="flex items-center justify-between px-5 py-4 hover:bg-[#fafbff] transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{icon}</span>
                      <div>
                        <p className="text-sm font-semibold" style={{ color }}>{label}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{desc}</p>
                      </div>
                    </div>
                    <Toggle on={channels[key]} onClick={() => toggleChannel(key)} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── รายโมดูล (เฉพาะ LINE) ────────────────────────── */}
          <div>
            <div className="mb-2">
              <p className="text-sm font-semibold" style={{ color: '#1a2744' }}>การแจ้งเตือน LINE รายโมดูล</p>
              <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                เลือกว่าจะให้ส่ง LINE โมดูลไหนบ้าง {!channels.line && <span style={{ color: '#dc2626' }}>(ปิดช่องทาง LINE อยู่ — จะไม่ส่งทุกโมดูล)</span>}
              </p>
            </div>
            <div className={`bg-white rounded-xl overflow-hidden transition-opacity ${channels.line ? '' : 'opacity-50'}`} style={{ border: '1px solid #dce6f9' }}>
              <div className="divide-y" style={{ borderColor: '#f0f4ff' }}>
                {MODULE_META.map(({ key, label, icon, desc }) => {
                  const enabled = settings[key] !== false; // default true
                  return (
                    <div key={key} className="flex items-center justify-between px-5 py-4 hover:bg-[#fafbff] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{icon}</span>
                        <div>
                          <p className="text-sm font-medium" style={{ color: '#1a2744' }}>{label}</p>
                          <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{desc}</p>
                        </div>
                      </div>
                      <Toggle on={enabled} onClick={() => toggleModule(key)} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      <p className="text-xs" style={{ color: '#94a3b8' }}>
        หมายเหตุ: ผู้ใช้แต่ละคนสามารถปิดรับการแจ้งเตือนส่วนตัวได้จากหน้าโปรไฟล์ของตนเอง
      </p>
    </div>
  );
}
