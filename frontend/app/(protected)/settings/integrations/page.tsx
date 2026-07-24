'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  Link2, Eye, EyeOff, Send, Save, CheckCircle, AlertTriangle, Loader2, Mail, ChevronDown,
} from 'lucide-react';
import { api } from '@/lib/api';

type Toast = { msg: string; ok: boolean };

// ─── Email settings ────────────────────────────────────────────────────────────

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
  email_provider: '',
  email_from: '',
  resend_api_key: '',
  smtp_host: 'smtp.gmail.com',
  smtp_port: '587',
  smtp_user: '',
  smtp_pass: '',
};

function EmailSection({ showToast }: { showToast: (msg: string, ok: boolean) => void }) {
  const [cfg, setCfg]         = useState<EmailSettings>(EMAIL_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo]   = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showKey, setShowKey]   = useState(false);

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
        email_provider: cfg.email_provider,
        email_from:     cfg.email_from,
        resend_api_key: cfg.resend_api_key,
        smtp_host:      cfg.smtp_host,
        smtp_port:      cfg.smtp_port,
        smtp_user:      cfg.smtp_user,
        smtp_pass:      cfg.smtp_pass,
      });
      showToast('บันทึกการตั้งค่า Email สำเร็จ', true);
    } catch (e: unknown) {
      showToast((e as Error).message, false);
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    if (!testTo) { showToast('กรุณาระบุอีเมลทดสอบ', false); return; }
    setTesting(true);
    try {
      await api.post('/settings/test-email', {
        to: testTo,
        provider:       cfg.email_provider,
        resend_api_key: cfg.resend_api_key,
        email_from:     cfg.email_from,
        smtp_host:      cfg.smtp_host,
        smtp_port:      cfg.smtp_port,
        smtp_user:      cfg.smtp_user,
        smtp_pass:      cfg.smtp_pass,
      });
      showToast('ส่ง Email ทดสอบสำเร็จ ✅ ตรวจสอบใน Inbox ของคุณ', true);
    } catch (e: unknown) {
      showToast((e as Error).message, false);
    } finally { setTesting(false); }
  };

  const inp = 'w-full bg-navy-800 border border-navy-600 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600';

  if (loading) return (
    <div className="card flex items-center justify-center py-10 gap-2 text-gray-500">
      <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลด...
    </div>
  );

  return (
    <div className="card space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-navy-600">
        <div className="w-9 h-9 bg-blue-900/40 rounded-xl flex items-center justify-center">
          <Mail className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-200">Email</h2>
          <p className="text-xs text-gray-500">ส่งการแจ้งเตือนผ่านอีเมลเมื่อมีกิจกรรมสำคัญ</p>
        </div>
      </div>

      {/* Provider selector */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-2">Email Provider</label>
        <div className="flex gap-2">
          {[
            { v: 'resend', label: 'Resend', sub: 'API key เดียว · ง่าย · ฟรี 3,000/เดือน' },
            { v: 'smtp',   label: 'SMTP',   sub: 'Gmail, Outlook, หรือ mail server ของตัวเอง' },
          ].map(({ v, label, sub }) => (
            <button
              key={v}
              onClick={() => set('email_provider', v as EmailSettings['email_provider'])}
              className={`flex-1 text-left px-3 py-2.5 rounded-xl border transition-colors text-sm ${
                cfg.email_provider === v
                  ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                  : 'border-navy-600 bg-navy-800 text-gray-400 hover:border-navy-500'
              }`}
            >
              <p className="font-semibold">{label}</p>
              <p className="text-xs opacity-70 mt-0.5">{sub}</p>
            </button>
          ))}
          <button
            onClick={() => set('email_provider', '')}
            className={`px-3 py-2.5 rounded-xl border transition-colors text-sm ${
              cfg.email_provider === ''
                ? 'border-red-500 bg-red-900/20 text-red-400'
                : 'border-navy-600 bg-navy-800 text-gray-500 hover:border-navy-500'
            }`}
          >
            ปิด
          </button>
        </div>
      </div>

      {cfg.email_provider !== '' && (
        <>
          {/* Resend fields */}
          {cfg.email_provider === 'resend' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Resend API Key
                  <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer"
                    className="ml-2 text-blue-400 hover:underline">รับ Key ที่นี่ →</a>
                </label>
                <div className="relative">
                  <input type={showKey ? 'text' : 'password'} value={cfg.resend_api_key}
                    onChange={(e) => set('resend_api_key', e.target.value)}
                    placeholder="re_xxxxxxxxxxxxxxxxxxxx"
                    className={`${inp} pr-10`} />
                  <button onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-1">สมัครฟรีที่ resend.com · ฟรี 3,000 อีเมล/เดือน · 100 อีเมล/วัน</p>
              </div>
            </div>
          )}

          {/* SMTP fields */}
          {cfg.email_provider === 'smtp' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">SMTP Host</label>
                  <input type="text" value={cfg.smtp_host}
                    onChange={(e) => set('smtp_host', e.target.value)}
                    placeholder="smtp.gmail.com" className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Port</label>
                  <div className="relative">
                    <input type="number" value={cfg.smtp_port}
                      onChange={(e) => set('smtp_port', e.target.value)}
                      placeholder="587" className={`${inp} pr-8`} />
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">587 (TLS) หรือ 465 (SSL)</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Username / Email</label>
                <input type="email" value={cfg.smtp_user}
                  onChange={(e) => set('smtp_user', e.target.value)}
                  placeholder="your@gmail.com" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Password
                  {cfg.smtp_host.includes('gmail') && (
                    <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer"
                      className="ml-2 text-blue-400 hover:underline">Gmail: ใช้ App Password →</a>
                  )}
                </label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={cfg.smtp_pass}
                    onChange={(e) => set('smtp_pass', e.target.value)}
                    placeholder="password หรือ app password"
                    className={`${inp} pr-10`} />
                  <button onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* From address (shared) */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">ชื่อผู้ส่ง (From)</label>
            <input type="text" value={cfg.email_from}
              onChange={(e) => set('email_from', e.target.value)}
              placeholder={cfg.email_provider === 'resend' ? 'Smart Campus <noreply@yourdomain.com>' : cfg.smtp_user}
              className={inp} />
            {cfg.email_provider === 'resend' && (
              <p className="text-xs text-gray-600 mt-1">ต้องใช้โดเมนที่ verify แล้ว หรือ onboarding@resend.dev สำหรับทดสอบ</p>
            )}
          </div>

          {/* Test */}
          <div className="pt-1 border-t border-navy-600">
            <p className="text-xs font-medium text-gray-400 mb-2">ทดสอบส่ง Email</p>
            <div className="flex gap-2">
              <input type="email" value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="อีเมลทดสอบ..."
                className={`${inp} flex-1`} />
              <button
                onClick={handleTest}
                disabled={testing || !testTo}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-300
                           bg-blue-900/30 border border-blue-700/50 hover:bg-blue-900/50
                           rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap">
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                ทดสอบ
              </button>
            </div>
          </div>
        </>
      )}

      {/* Save */}
      <div className="flex justify-end pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white
                     bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          บันทึก
        </button>
      </div>
    </div>
  );
}

// ─── Secret input (dark) ──────────────────────────────────────────────────────

function SecretInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const inp = 'w-full bg-navy-800 border border-navy-600 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600';
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`${inp} pr-10`} />
      <button onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function ReadonlyUrl({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full bg-navy-900 border border-navy-700 text-gray-400 rounded-lg px-3 py-2 text-xs select-all break-all">
      {children}
    </div>
  );
}

// ─── LINE section (Login + Messaging Bot) ─────────────────────────────────────

function LineSection({ showToast }: { showToast: (msg: string, ok: boolean) => void }) {
  const [channelId, setChannelId]       = useState('');   // line_channel_id (Login)
  const [loginSecret, setLoginSecret]   = useState('');   // line_channel_secret (Login)
  const [msgToken, setMsgToken]         = useState('');   // line_messaging_token (Bot)
  const [msgSecret, setMsgSecret]       = useState('');   // line_messaging_secret (Bot)
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);

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
    } catch (e: unknown) {
      showToast((e as Error).message, false);
    } finally { setSaving(false); }
  };

  const inp = 'w-full bg-navy-800 border border-navy-600 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600';

  if (loading) return (
    <div className="card flex items-center justify-center py-10 gap-2 text-gray-500">
      <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลด...
    </div>
  );

  return (
    <div className="card space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-navy-600">
        <div className="w-9 h-9 bg-green-900/40 rounded-xl flex items-center justify-center">
          <Link2 className="w-4 h-4 text-green-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-200">LINE</h2>
          <p className="text-xs text-gray-500">เข้าสู่ระบบด้วย LINE + Bot อนุมัติ/แจ้งเตือน (โควตา 300/เดือน แผนฟรี)</p>
        </div>
      </div>

      <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl px-4 py-2.5 text-xs text-amber-300">
        ⚠️ <strong>LINE Notify ปิดบริการถาวรแล้ว</strong> (มี.ค. 2568) — ระบบใช้ Messaging API แทน และแนะนำ Telegram (ฟรีไม่จำกัด) เป็นช่องทางหลัก
      </div>

      {/* LINE Login */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-300 flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded bg-green-900/50 text-green-400 text-[10px]">Login</span>
          เข้าสู่ระบบด้วย LINE
        </p>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Channel ID</label>
          <input type="text" value={channelId} onChange={(e) => setChannelId(e.target.value)}
            placeholder="1234567890" className={inp} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Channel Secret</label>
          <SecretInput value={loginSecret} onChange={setLoginSecret} placeholder="LINE Login channel secret" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Callback URL (ลงทะเบียนใน LINE Developers)</label>
          <ReadonlyUrl>{origin}/api/auth/line/callback</ReadonlyUrl>
        </div>
      </div>

      {/* LINE Messaging API (Bot) */}
      <div className="pt-4 border-t border-navy-600 space-y-3">
        <p className="text-xs font-semibold text-gray-300 flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-400 text-[10px]">Messaging API</span>
          LINE Bot — อนุมัติ/ปฏิเสธ + แจ้งเตือนผ่าน LINE
        </p>
        <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl px-4 py-3 text-xs text-blue-300 space-y-1">
          <p className="font-medium">วิธีตั้งค่า LINE Bot:</p>
          <ol className="list-decimal pl-4 space-y-0.5 text-blue-400">
            <li>สร้าง Messaging API channel ที่ <a href="https://developers.line.biz/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">developers.line.biz</a></li>
            <li>คัดลอก <strong>Channel Access Token</strong> และ <strong>Channel Secret</strong> มาใส่ด้านล่าง</li>
            <li>ตั้ง Webhook URL (ด้านล่าง) ใน Developer Console แล้วเปิด <strong>Use webhooks</strong></li>
          </ol>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Channel Access Token</label>
          <SecretInput value={msgToken} onChange={setMsgToken} placeholder="Channel Access Token (Long-lived)" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Channel Secret</label>
          <SecretInput value={msgSecret} onChange={setMsgSecret} placeholder="Messaging API channel secret" />
          <p className="text-xs text-gray-600 mt-1">ใช้ verify ว่า webhook request มาจาก LINE จริง</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Webhook URL (ตั้งใน LINE Developers Console)</label>
          <ReadonlyUrl>{origin}/api/webhook/line</ReadonlyUrl>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-1">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white
                     bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          บันทึก
        </button>
      </div>
    </div>
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
    } catch (e: unknown) {
      showToast((e as Error).message, false);
    } finally { setSaving(false); }
  };

  const inp = 'w-full bg-navy-800 border border-navy-600 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600';

  if (loading) return (
    <div className="card flex items-center justify-center py-10 gap-2 text-gray-500">
      <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลด...
    </div>
  );

  return (
    <div className="card space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-navy-600">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(66,133,244,0.15)' }}>
          <span className="text-sm font-bold" style={{ color: '#4285f4' }}>G</span>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-200">Google OAuth</h2>
          <p className="text-xs text-gray-500">เข้าสู่ระบบด้วยบัญชี Google</p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Client ID</label>
        <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)}
          placeholder="xxxx.apps.googleusercontent.com" className={inp} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Client Secret</label>
        <SecretInput value={clientSecret} onChange={setClientSecret} placeholder="Google client secret" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Callback URL (ลงทะเบียนใน Google Cloud Console)</label>
        <ReadonlyUrl>{origin}/api/auth/google/callback</ReadonlyUrl>
      </div>

      <div className="flex justify-end pt-1">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white
                     bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          บันทึก
        </button>
      </div>
    </div>
  );
}

// ─── Telegram section ──────────────────────────────────────────────────────────

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

  const inp = 'w-full bg-navy-800 border border-navy-600 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600';

  if (loading) return (
    <div className="card flex items-center justify-center py-10 gap-2 text-gray-500">
      <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลด...
    </div>
  );

  return (
    <div className="card space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-navy-600">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(34,158,217,0.2)' }}>
          <Send className="w-4 h-4" style={{ color: '#229ED9' }} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-200">Telegram <span className="text-[10px] text-green-400 font-normal">(ฟรี ไม่จำกัด)</span></h2>
          <p className="text-xs text-gray-500">แจ้งเตือนผ่าน Telegram — ไม่มีโควตาเหมือน LINE</p>
        </div>
      </div>

      <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl px-4 py-3 text-xs text-blue-300 space-y-1">
        <p className="font-medium">วิธีตั้งค่า:</p>
        <ol className="list-decimal pl-4 space-y-0.5 text-blue-400">
          <li>เปิด Telegram แชทกับ <strong>@BotFather</strong> → พิมพ์ <code className="bg-blue-900/50 px-1 rounded">/newbot</code> → ตั้งชื่อ → ได้ Bot Token</li>
          <li>วาง Token ด้านล่าง แล้วกด <strong>บันทึก</strong></li>
          <li>กด <strong>ผูก Webhook</strong> 1 ครั้ง</li>
          <li>ผู้ใช้ไปที่ โปรไฟล์ → เชื่อมต่อ Telegram → กด START</li>
        </ol>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Bot Token (จาก @BotFather)</label>
        <div className="relative">
          <input type={show ? 'text' : 'password'} value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="123456789:ABCdef..." className={`${inp} pr-10`} />
          <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-1">หรือจะตั้งเป็น env <code className="bg-navy-700 px-1 rounded">TELEGRAM_BOT_TOKEN</code> ใน Plesk ก็ได้ (จะมีความสำคัญเหนือค่าที่นี่)</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} บันทึก
        </button>
        <button onClick={handleSetup} disabled={setting}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          style={{ color: '#229ED9', backgroundColor: 'rgba(34,158,217,0.15)', border: '1px solid rgba(34,158,217,0.4)' }}>
          {setting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} ผูก Webhook
        </button>
        {botInfo && <span className="text-xs text-green-400">บอท: {botInfo} · webhook พร้อม</span>}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">การเชื่อมต่อภายนอก</h1>
        <p className="text-xs text-gray-400 mt-0.5">ตั้งค่า LINE, Telegram, Google และ Email — เข้าสู่ระบบและส่งการแจ้งเตือน</p>
      </div>

      <LineSection showToast={showToast} />
      <TelegramSection showToast={showToast} />
      <GoogleSection showToast={showToast} />
      <EmailSection showToast={showToast} />

      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium
          ${toast.ok ? 'bg-green-900/90 border-green-700 text-green-200' : 'bg-red-900/90 border-red-700 text-red-200'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
