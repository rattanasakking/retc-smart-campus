'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TOKEN_KEY, USER_KEY } from '@/lib/api';

const ERROR_MESSAGES: Record<string, string> = {
  inactive:     'บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
  not_found:    'ไม่พบบัญชีผู้ใช้ในระบบ กรุณาติดต่อผู้ดูแลระบบ',
  server_error: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง',
};

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  // Handle OAuth redirect: ?token=JWT or ?error=CODE
  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const token     = params.get('token');
    const errorCode = params.get('error');

    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      // Fetch user data to populate USER_KEY
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) localStorage.setItem(USER_KEY, JSON.stringify(data.data));
        })
        .catch(() => {})
        .finally(() => router.push('/dashboard'));
      return;
    }

    if (errorCode) {
      setErrorMsg(ERROR_MESSAGES[errorCode] ?? 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem(TOKEN_KEY, data.data.token);
        localStorage.setItem(USER_KEY,  JSON.stringify(data.data.user));
        router.push('/dashboard');
      } else {
        setErrorMsg(data.message || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    } catch {
      setErrorMsg('ไม่สามารถเชื่อมต่อกับระบบได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-[#0a1628] flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-800/10 rounded-full blur-3xl" />
      </div>

      <div className="relative bg-navy-800 border border-navy-600 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/50">
            <span className="text-white text-xl font-bold tracking-wide">RETC</span>
          </div>
          <h1 className="text-xl font-bold text-white">วิทยาลัยเทคนิคร้อยเอ็ด</h1>
          <p className="text-gray-400 mt-1 text-sm">ระบบบริหารงานอัจฉริยะ Smart Campus</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMsg && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">อีเมล</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="กรอกอีเมล"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">รหัสผ่าน</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="กรอกรหัสผ่าน"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                กำลังเข้าสู่ระบบ...
              </span>
            ) : (
              'เข้าสู่ระบบ'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-navy-600" />
          <span className="text-gray-500 text-xs">หรือเข้าสู่ระบบด้วย</span>
          <div className="flex-1 h-px bg-navy-600" />
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3">
          {/* LINE */}
          <a
            href="/api/auth/line"
            className="flex items-center justify-center gap-3 w-full py-2.5 px-4 rounded-lg font-medium text-sm text-white transition-opacity hover:opacity-90 active:opacity-80"
            style={{ backgroundColor: '#06C755' }}
          >
            {/* LINE icon */}
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current flex-shrink-0">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
            เข้าสู่ระบบด้วย LINE
          </a>

          {/* Google */}
          <a
            href="/api/auth/google"
            className="flex items-center justify-center gap-3 w-full py-2.5 px-4 rounded-lg font-medium text-sm text-white border border-white/20 transition-colors hover:bg-white/5 active:bg-white/10"
          >
            {/* Google icon */}
            <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            เข้าสู่ระบบด้วย Google
          </a>
        </div>

        <p className="text-center text-gray-600 text-xs mt-8">
          วิทยาลัยเทคนิคร้อยเอ็ด © {new Date().getFullYear() + 543}
        </p>
      </div>
    </div>
  );
}
