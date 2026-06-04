'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  Link2, Eye, EyeOff, Send, Save, CheckCircle, AlertTriangle, Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Setting { key: string; value: string; label: string | null; group: string }

type Toast = { msg: string; ok: boolean };

export default function IntegrationsPage() {
  const [token, setToken]       = useState('');
  const [enabled, setEnabled]   = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [testing, setTesting]   = useState(false);
  const [toast, setToast]       = useState<Toast | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get<{ data: Setting[] }>('/settings/general');
      const map: Record<string, string> = {};
      res.data.forEach((s) => { map[s.key] = s.value; });
      setToken(map['line_notify_token'] ?? '');
      setEnabled(map['line_notify_enabled'] === 'true');
    } catch (e: unknown) {
      showToast((e as Error).message, false);
    } finally {
      setLoading(false);
    }
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
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!token) { showToast('กรุณากรอก LINE Notify Token ก่อน', false); return; }
    setTesting(true);
    try {
      await api.post('/settings/test-line', { token });
      showToast('ส่ง LINE Notify สำเร็จ ✅ ตรวจสอบใน LINE ของคุณ', true);
    } catch (e: unknown) {
      showToast((e as Error).message, false);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 gap-3 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลด...
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">LINE & Google</h1>
        <p className="text-xs text-gray-400 mt-0.5">ตั้งค่าการเชื่อมต่อบริการภายนอก</p>
      </div>

      {/* LINE Notify */}
      <div className="card space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-navy-600">
          <div className="w-9 h-9 bg-green-900/40 rounded-xl flex items-center justify-center">
            <Link2 className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-200">LINE Notify</h2>
            <p className="text-xs text-gray-500">แจ้งเตือนผ่าน LINE เมื่อมีเหตุการณ์สำคัญ</p>
          </div>
          {/* Toggle */}
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
               className="ml-2 text-blue-400 hover:underline">
              รับ Token ที่นี่ →
            </a>
          </label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="token จาก notify-bot.line.me"
              className="input-field pr-10"
            />
            <button
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-1.5">
            Token จะถูกเก็บในฐานข้อมูล ใช้สำหรับส่งแจ้งเตือนซ่อม, ของหาย-ของได้, และเหตุการณ์อื่นๆ
          </p>
        </div>

        {/* Test + Save buttons */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleTest}
            disabled={testing || !token}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-300
                       bg-green-900/30 border border-green-700/50 hover:bg-green-900/50
                       rounded-lg transition-colors disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            ทดสอบส่ง
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white
                       bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            บันทึก
          </button>
        </div>
      </div>

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
