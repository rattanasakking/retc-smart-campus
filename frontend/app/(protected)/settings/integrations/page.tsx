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

// ─── LINE Notify section ───────────────────────────────────────────────────────

function LineSection({ showToast }: { showToast: (msg: string, ok: boolean) => void }) {
  const [token, setToken]         = useState('');
  const [enabled, setEnabled]     = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [testing, setTesting]     = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get<{ data: Record<string, string> }>('/settings/general');
      const map = res.data ?? {};
      setToken(map['line_notify_token'] ?? '');
      setEnabled(map['line_notify_enabled'] === 'true');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings/general', {
        line_notify_token:   token,
        line_notify_enabled: String(enabled),
      });
      showToast('บันทึกการตั้งค่า LINE Notify สำเร็จ', true);
    } catch (e: unknown) {
      showToast((e as Error).message, false);
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    if (!token) { showToast('กรุณากรอก LINE Notify Token ก่อน', false); return; }
    setTesting(true);
    try {
      await api.post('/settings/test-line', { token });
      showToast('ส่ง LINE Notify สำเร็จ ✅ ตรวจสอบใน LINE ของคุณ', true);
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
      <div className="flex items-center gap-3 pb-4 border-b border-navy-600">
        <div className="w-9 h-9 bg-green-900/40 rounded-xl flex items-center justify-center">
          <Link2 className="w-4 h-4 text-green-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-200">LINE Notify</h2>
          <p className="text-xs text-gray-500">แจ้งเตือนผ่าน LINE เมื่อมีเหตุการณ์สำคัญ</p>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-green-600' : 'bg-navy-600'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">
          LINE Notify Token
          <a href="https://notify-bot.line.me/my/" target="_blank" rel="noopener noreferrer"
             className="ml-2 text-blue-400 hover:underline">รับ Token ที่นี่ →</a>
        </label>
        <div className="relative">
          <input type={showToken ? 'text' : 'password'} value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="token จาก notify-bot.line.me"
            className={`${inp} pr-10`} />
          <button onClick={() => setShowToken(!showToken)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
            {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button onClick={handleTest} disabled={testing || !token}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-300
                     bg-green-900/30 border border-green-700/50 hover:bg-green-900/50
                     rounded-lg transition-colors disabled:opacity-50">
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          ทดสอบส่ง
        </button>
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
        <p className="text-xs text-gray-400 mt-0.5">ตั้งค่า LINE และ Email สำหรับส่งการแจ้งเตือน</p>
      </div>

      <LineSection showToast={showToast} />
      <EmailSection showToast={showToast} />

      {/* Google — coming soon */}
      <div className="card opacity-60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-navy-700 rounded-xl flex items-center justify-center">
            <span className="text-sm">G</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-300">Google OAuth</h2>
            <p className="text-xs text-gray-500">เร็วๆ นี้ — Phase 2</p>
          </div>
          <span className="ml-auto text-xs bg-navy-700 text-gray-500 px-2 py-0.5 rounded-full">เร็วๆ นี้</span>
        </div>
      </div>

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
