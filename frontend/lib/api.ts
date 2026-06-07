const API_BASE = '/api'; // Next.js rewrite → http://localhost:3001/api

export const TOKEN_KEY = 'retc_token';
export const USER_KEY  = 'retc_user';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

async function request<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers, cache: 'no-store' });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.location.href = '/login';
    }
    throw new Error('กรุณาเข้าสู่ระบบใหม่');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'เกิดข้อผิดพลาด');
  return data;
}

export const api = {
  get:    <T = unknown>(endpoint: string)                   => request<T>(endpoint, { method: 'GET' }),
  post:   <T = unknown>(endpoint: string, body: unknown)    => request<T>(endpoint, { method: 'POST',   body: JSON.stringify(body) }),
  put:    <T = unknown>(endpoint: string, body: unknown)    => request<T>(endpoint, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: <T = unknown>(endpoint: string)                   => request<T>(endpoint, { method: 'DELETE' }),
};
