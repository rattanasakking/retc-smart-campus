'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  Link2, Eye, EyeOff, Send, Save, Check, AlertTriangle, Loader2, Mail,
} from 'lucide-react';
import { api } from '@/lib/api';

type Toast = { msg: string; ok: boolean };

// ─── Shared light-theme UI ────────────────────────────────────────────────────

function SectionCard({ icon, iconBg, title, badge, subtitle, children }: {
  icon: React.ReactNode; iconBg: string; title: string;
  badge?: React.ReactNode; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-3 pb-3" style={{ borderBottom: '1px solid #f0f4ff' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconBg }}>
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#1a2744' }}>
            {title}{badge}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium mb-1.5" style={{ color: '#4a6080' }}>{children}</label>;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>{children}</p>;
}

function SecretInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="input-field pr-10" />
      <button type="button" onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity">
        {show ? <EyeOff className="w-4 h-4" style={{ color: '#4a6080' }} /> : <Eye className="w-4 h-4" style={{ color: '#4a6080' }} />}
      </button>
    </div>
  );
}

function ReadonlyUrl({ children }: { children: React.ReactNode }) {
  return (
    <div className="input-field cursor-text text-xs select-all break-all" style={{ backgroundColor: '#f5f8ff', color: '#4a6080' }}>
      {children}
    </div>
  );
}

function SubLabel({ color, bg, tag, children }: { color: string; bg: string; tag: string; children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold flex items-center gap-2" style={{ color: '#1a2744' }}>
      <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: bg, color }}>{tag}</span>
      {children}
    </p>
  );
}

function SaveBtn({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={saving} className="btn-primary flex items-center gap-2">
      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} บันทึก
    </button>
  );
}

const InfoBox = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs rounded-xl px-4 py-3 space-y-1" style={{ backgroundColor: '#f0f4ff', color: '#4a6080' }}>
    {children}
  </div>
);

// ─── LINE section (Login + Messaging Bot) ─────────────────────────────────────

function LineSection({ showToast }: { showToast: (msg: string, ok: boolean) => void }) {
  const [channelId, setChannelId]     = useState('');   // line_channel_id (Login)
  const [loginSecret, setLoginSecret] = useState('');   // line_channel_secret (Login)
  const [msgToken, setMsgToken]       = useState('');   // line_messaging_token (Bot)
  const [msgSecret, setMsgSecret]     = useState('');   // line_messaging_secret (Bot)
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.retc.ac.th';

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get<{ data: Record<string, string> }>('/settings/general');
      const map = res.data ?? {};
      setChannelId(map['line_channel_id'] ?? '');
      setLoginSecret(map['line_channel_secret'] ?? '');
      setMsgToken(map['line_messaging_token'] ?? '');
      setMsgSecret(map['line_messaging_secret'] ?? '');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings/general', {
        line_channel_id:       channelId,
        line_channel_secret:   loginSecret,
        line_messaging_token:  msgToken,
        line_messaging_secret: msgSecret,
      });
      showToast('บันทึกการตั้งค่า LINE สำเร็จ', true);
    } catch (e: unknown) { showToast((e as Error).message, false); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingCard />;

  return (
    <SectionCard
      icon={<Link2 className="w-4 h-4" style={{ color: '#06c755' }} />} iconBg="#e6f9f0"
      title="LINE" subtitle="เข้าสู่ระบบด้วย LINE + Bot อนุมัติ/แจ้งเตือน (โควตา 300/เดือน แผนฟรี)"
    >
      <div className="text-xs rounded-xl px-4 py-2.5" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#b45309' }}>
        ⚠️ <strong>LINE Notify ปิดบริการถาวรแล้ว</strong> (มี.ค. 2568) — ระบบใช้ Messaging API แทน และแนะนำ Telegram (ฟรีไม่จำกัด) เป็นช่องทางหลัก
      </div>

      {/* LINE Login */}
      <div className="space-y-3">
        <SubLabel color="#0d9068" bg="#e6f9f0" tag="Login">เข้าสู่ระบบด้วย LINE</SubLabel>
        <div>
          <Label>Channel ID</Label>
          <input type="text" value={channelId} onChange={(e) => setChannelId(e.target.value)}
            placeholder="1234567890" className="input-field" />
        </div>
        <div>
          <Label>Channel Secret</Label>
          <SecretInput value={loginSecret} onChange={setLoginSecret} placeholder="LINE Login channel secret" />
        </div>
        <div>
          <Label>Callback URL (ลงทะเบียนใน LINE Developers)</Label>
          <ReadonlyUrl>{origin}/api/auth/line/callback</ReadonlyUrl>
        </div>
      </div>

      {/* LINE Messaging API */}
      <div className="pt-4 space-y-3" style={{ borderTop: '1px solid #f0f4ff' }}>
        <SubLabel color="#1d6ae5" bg="#e8f0fe" tag="Messaging API">LINE Bot — อนุมัติ/ปฏิเสธ + แจ้งเตือนผ่าน LINE</SubLabel>
        <InfoBox>
          <p className="font-medium" style={{ color: '#1a2744' }}>วิธีตั้งค่า LINE Bot:</p>
          <ol className="list-decimal pl-4 space-y-0.5">
            <li>สร้าง Messaging API channel ที่ <a href="https://developers.line.biz/" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#1d6ae5' }}>developers.line.biz</a></li>
            <li>คัดลอก <strong>Channel Access Token</strong> และ <strong>Channel Secret</strong> มาใส่ด้านล่าง</li>
            <li>ตั้ง Webhook URL (ด้านล่าง) ใน Developer Console แล้วเปิด <strong>Use webhooks</strong></li>
          </ol>
        </InfoBox>
        <div>
          <Label>Channel Access Token</Label>
          <SecretInput value={msgToken} onChange={setMsgToken} placeholder="Channel Access Token (Long-lived)" />
        </div>
        <div>
          <Label>Channel Secret</Label>
          <SecretInput value={msgSecret} onChange={setMsgSecret} placeholder="Messaging API channel secret" />
          <Hint>ใช้ verify ว่า webhook request มาจาก LINE จริง</Hint>
        </div>
        <div>
          <Label>Webhook URL (ตั้งใน LINE Developers Console)</Label>
          <ReadonlyUrl>{origin}/api/webhook/line</ReadonlyUrl>
        </div>
      </div>

      <div className="flex justify-end pt-1"><SaveBtn saving={saving} onClick={handleSave} /></div>
    </SectionCard>
  );
}

// ─── Telegram section ─────────────────────────────────────────────────────────

function TelegramSection({ showToast }: { showToast: (msg: string, ok: boolean) => void }) {
  const [token, setToken]     = useState('');
  const [show, setShow]       = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [setting, setSetting] = useState(false);
  const [botInfo, setBotInfo] = useState('');

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get<{ data: Record<string, string> }>('/settings/general');
      setToken(res.data?.['telegram_bot_token'] ?? '');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings/general', { telegram_bot_token: token });
      showToast('บันทึก Telegram bot token สำเร็จ', true);
    } catch (e: unknown) { showToast((e as Error).message, false); }
    finally { setSaving(false); }
  };

  const handleSetup = async () => {
    setSetting(true); setBotInfo('');
    try {
      const r = await api.get<{ bot_username?: string; result?: { ok?: boolean }; error?: string }>('/webhook/telegram/setup');
      if (r?.result?.ok) {
        setBotInfo(r.bot_username ? `@${r.bot_username}` : 'สำเร็จ');
        showToast('ผูก Webhook Telegram สำเร็จ ✅', true);
      } else {
        showToast(r?.error ?? 'ผูก webhook ไม่สำเร็จ', false);
      }
    } catch (e: unknown) { showToast((e as Error).message || 'ผูก webhook ไม่สำเร็จ', false); }
    finally { setSetting(false); }
  };

  if (loading) return <LoadingCard />;

  return (
    <SectionCard
      icon={<Send className="w-4 h-4" style={{ color: '#229ED9' }} />} iconBg="rgba(34,158,217,0.12)"
      title="Telegram" badge={<span className="text-[10px] font-normal" style={{ color: '#0d9068' }}>(ฟรี ไม่จำกัด)</span>}
      subtitle="แจ้งเตือนผ่าน Telegram — ไม่มีโควตาเหมือน LINE"
    >
      <InfoBox>
        <p className="font-medium" style={{ color: '#1a2744' }}>วิธีตั้งค่า:</p>
        <ol className="list-decimal pl-4 space-y-0.5">
          <li>เปิด Telegram แชทกับ <strong>@BotFather</strong> → พิมพ์ <code className="px-1 rounded" style={{ backgroundColor: '#e2e8f5' }}>/newbot</code> → ตั้งชื่อ → ได้ Bot Token</li>
          <li>วาง Token ด้านล่าง แล้วกด <strong>บันทึก</strong></li>
          <li>กด <strong>ผูก Webhook</strong> 1 ครั้ง</li>
          <li>ผู้ใช้ไปที่ โปรไฟล์ → เชื่อมต่อ Telegram → กด START</li>
        </ol>
      </InfoBox>

      <div>
        <Label>Bot Token (จาก @BotFather)</Label>
        <div className="relative">
          <input type={show ? 'text' : 'password'} value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="123456789:ABCdef..." className="input-field pr-10" />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity">
            {show ? <EyeOff className="w-4 h-4" style={{ color: '#4a6080' }} /> : <Eye className="w-4 h-4" style={{ color: '#4a6080' }} />}
          </button>
        </div>
        <Hint>หรือจะตั้งเป็น env <code className="px-1 rounded" style={{ backgroundColor: '#eef2fb' }}>TELEGRAM_BOT_TOKEN</code> ใน Plesk ก็ได้ (จะมีความสำคัญเหนือค่าที่นี่)</Hint>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <SaveBtn saving={saving} onClick={handleSave} />
        <button onClick={handleSetup} disabled={setting}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          style={{ color: '#229ED9', backgroundColor: 'rgba(34,158,217,0.1)', border: '1px solid rgba(34,158,217,0.35)' }}>
          {setting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} ผูก Webhook
        </button>
        {botInfo && <span className="text-xs font-medium" style={{ color: '#0d9068' }}>บอท: {botInfo} · webhook พร้อม</span>}
      </div>
    </SectionCard>
  );
}

// ─── Google OAuth section ─────────────────────────────────────────────────────

function GoogleSection({ showToast }: { showToast: (msg: string, ok: boolean) => void }) {
  const [clientId, setClientId]         = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.retc.ac.th';

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get<{ data: Record<string, string> }>('/settings/general');
      const map = res.data ?? {};
      setClientId(map['google_client_id'] ?? '');
      setClientSecret(map['google_client_secret'] ?? '');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings/general', {
        google_client_id:     clientId,
        google_client_secret: clientSecret,
      });
      showToast('บันทึกการตั้งค่า Google สำเร็จ', true);
    } catch (e: unknown) { showToast((e as Error).message, false); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingCard />;

  return (
    <SectionCard
      icon={<span className="text-sm font-bold" style={{ color: '#4285f4' }}>G</span>} iconBg="#eef3fe"
      title="Google OAuth" subtitle="เข้าสู่ระบบด้วยบัญชี Google"
    >
      <div>
        <Label>Client ID</Label>
        <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)}
          placeholder="xxxx.apps.googleusercontent.com" className="input-field" />
      </div>
      <div>
        <Label>Client Secret</Label>
        <SecretInput value={clientSecret} onChange={setClientSecret} placeholder="Google client secret" />
      </div>
      <div>
        <Label>Callback URL (ลงทะเบียนใน Google Cloud Console)</Label>
        <ReadonlyUrl>{origin}/api/auth/google/callback</ReadonlyUrl>
      </div>
      <div className="flex justify-end pt-1"><SaveBtn saving={saving} onClick={handleSave} /></div>
    </SectionCard>
  );
}

// ─── Email section ────────────────────────────────────────────────────────────

interface EmailSettings {
  email_provider: 'resend' | 'smtp' | '';
  email_from: string;
  resend_api_key: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
}

const EMAIL_DEFAULTS: EmailSettings = {
  email_provider: '', email_from: '', resend_api_key: '',
  smtp_host: 'smtp.gmail.com', smtp_port: '587', smtp_user: '', smtp_pass: '',
};

function EmailSection({ showToast }: { showToast: (msg: string, ok: boolean) => void }) {
  const [cfg, setCfg]         = useState<EmailSettings>(EMAIL_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo]   = useState('');

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get<{ data: Record<string, string> }>('/settings/general');
      const m   = res.data ?? {};
      setCfg({
        email_provider: (m['email_provider'] as EmailSettings['email_provider']) ?? '',
        email_from:     m['email_from']     ?? '',
        resend_api_key: m['resend_api_key'] ?? '',
        smtp_host:      m['smtp_host']      ?? 'smtp.gmail.com',
        smtp_port:      m['smtp_port']      ?? '587',
        smtp_user:      m['smtp_user']      ?? '',
        smtp_pass:      m['smtp_pass']      ?? '',
      });
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const set = (k: keyof EmailSettings, v: string) => setCfg((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings/general', {
        email_provider: cfg.email_provider, email_from: cfg.email_from,
        resend_api_key: cfg.resend_api_key, smtp_host: cfg.smtp_host,
        smtp_port: cfg.smtp_port, smtp_user: cfg.smtp_user, smtp_pass: cfg.smtp_pass,
      });
      showToast('บันทึกการตั้งค่า Email สำเร็จ', true);
    } catch (e: unknown) { showToast((e as Error).message, false); }
    finally { setSaving(false); }
  };

  const handleTest = async () => {
    if (!testTo) { showToast('กรุณาระบุอีเมลทดสอบ', false); return; }
    setTesting(true);
    try {
      await api.post('/settings/test-email', {
        to: testTo, provider: cfg.email_provider, resend_api_key: cfg.resend_api_key,
        email_from: cfg.email_from, smtp_host: cfg.smtp_host, smtp_port: cfg.smtp_port,
        smtp_user: cfg.smtp_user, smtp_pass: cfg.smtp_pass,
      });
      showToast('ส่ง Email ทดสอบสำเร็จ ✅ ตรวจสอบใน Inbox ของคุณ', true);
    } catch (e: unknown) { showToast((e as Error).message, false); }
    finally { setTesting(false); }
  };

  if (loading) return <LoadingCard />;

  const providerBtn = (v: EmailSettings['email_provider'], sel: boolean) =>
    sel ? { borderColor: '#1d6ae5', backgroundColor: '#e8f0fe', color: '#1d6ae5' }
        : { borderColor: '#dce6f9', backgroundColor: '#fafbff', color: '#4a6080' };

  return (
    <SectionCard
      icon={<Mail className="w-4 h-4" style={{ color: '#1d6ae5' }} />} iconBg="#e8f0fe"
      title="Email" subtitle="ส่งการแจ้งเตือนผ่านอีเมลเมื่อมีกิจกรรมสำคัญ"
    >
      {/* Provider selector */}
      <div>
        <Label>Email Provider</Label>
        <div className="flex gap-2">
          {[
            { v: 'resend' as const, label: 'Resend', sub: 'API key เดียว · ฟรี 3,000/เดือน' },
            { v: 'smtp' as const,   label: 'SMTP',   sub: 'Gmail, Outlook หรือ mail server' },
          ].map(({ v, label, sub }) => (
            <button key={v} onClick={() => set('email_provider', v)}
              className="flex-1 text-left px-3 py-2.5 rounded-xl border text-sm transition-colors"
              style={providerBtn(v, cfg.email_provider === v)}>
              <p className="font-semibold">{label}</p>
              <p className="text-xs opacity-70 mt-0.5">{sub}</p>
            </button>
          ))}
          <button onClick={() => set('email_provider', '')}
            className="px-4 py-2.5 rounded-xl border text-sm transition-colors"
            style={cfg.email_provider === ''
              ? { borderColor: '#ef4444', backgroundColor: '#fef2f2', color: '#dc2626' }
              : { borderColor: '#dce6f9', backgroundColor: '#fafbff', color: '#94a3b8' }}>
            ปิด
          </button>
        </div>
      </div>

      {cfg.email_provider === 'resend' && (
        <div>
          <Label>
            Resend API Key
            <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer"
              className="ml-2 underline" style={{ color: '#1d6ae5' }}>รับ Key ที่นี่ →</a>
          </Label>
          <SecretInput value={cfg.resend_api_key} onChange={(v) => set('resend_api_key', v)} placeholder="re_xxxxxxxxxxxxxxxxxxxx" />
          <Hint>สมัครฟรีที่ resend.com · ฟรี 3,000 อีเมล/เดือน · 100 อีเมล/วัน</Hint>
        </div>
      )}

      {cfg.email_provider === 'smtp' && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>SMTP Host</Label>
              <input type="text" value={cfg.smtp_host} onChange={(e) => set('smtp_host', e.target.value)} placeholder="smtp.gmail.com" className="input-field" />
            </div>
            <div>
              <Label>Port</Label>
              <input type="number" value={cfg.smtp_port} onChange={(e) => set('smtp_port', e.target.value)} placeholder="587" className="input-field" />
              <Hint>587 (TLS) / 465 (SSL)</Hint>
            </div>
          </div>
          <div>
            <Label>Username / Email</Label>
            <input type="email" value={cfg.smtp_user} onChange={(e) => set('smtp_user', e.target.value)} placeholder="your@gmail.com" className="input-field" />
          </div>
          <div>
            <Label>
              Password
              {cfg.smtp_host.includes('gmail') && (
                <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer"
                  className="ml-2 underline" style={{ color: '#1d6ae5' }}>Gmail: ใช้ App Password →</a>
              )}
            </Label>
            <SecretInput value={cfg.smtp_pass} onChange={(v) => set('smtp_pass', v)} placeholder="password หรือ app password" />
          </div>
        </>
      )}

      {cfg.email_provider !== '' && (
        <>
          <div>
            <Label>ชื่อผู้ส่ง (From)</Label>
            <input type="text" value={cfg.email_from} onChange={(e) => set('email_from', e.target.value)}
              placeholder={cfg.email_provider === 'resend' ? 'Smart Campus <noreply@yourdomain.com>' : cfg.smtp_user} className="input-field" />
            {cfg.email_provider === 'resend' && <Hint>ต้องใช้โดเมนที่ verify แล้ว หรือ onboarding@resend.dev สำหรับทดสอบ</Hint>}
          </div>

          <div className="pt-3" style={{ borderTop: '1px solid #f0f4ff' }}>
            <Label>ทดสอบส่ง Email</Label>
            <div className="flex gap-2">
              <input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)}
                placeholder="อีเมลทดสอบ..." className="input-field flex-1" />
              <button onClick={handleTest} disabled={testing || !testTo}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                style={{ backgroundColor: '#e8f0fe', color: '#1d6ae5' }}>
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} ทดสอบ
              </button>
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end pt-1"><SaveBtn saving={saving} onClick={handleSave} /></div>
    </SectionCard>
  );
}

function LoadingCard() {
  return (
    <div className="card flex items-center justify-center py-10 gap-2" style={{ color: '#94a3b8' }}>
      <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลด...
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>การเชื่อมต่อภายนอก</h1>
        <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>ตั้งค่า LINE, Telegram, Google และ Email — เข้าสู่ระบบและส่งการแจ้งเตือน</p>
      </div>

      <LineSection showToast={showToast} />
      <TelegramSection showToast={showToast} />
      <GoogleSection showToast={showToast} />
      <EmailSection showToast={showToast} />

      {toast && (
        <div
          className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 ${
            toast.ok
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-600'
          }`}
        >
          {toast.ok ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
