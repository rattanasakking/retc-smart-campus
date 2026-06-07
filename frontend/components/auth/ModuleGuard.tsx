'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, TOKEN_KEY } from '@/lib/api';

const CACHE_KEY = 'retc_modules_cache';
const CACHE_TTL = 5 * 60 * 1000;

function getCached(): string[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { m, t } = JSON.parse(raw);
    if (Date.now() - t > CACHE_TTL) { localStorage.removeItem(CACHE_KEY); return null; }
    return m as string[];
  } catch { return null; }
}

function setCache(m: string[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ m, t: Date.now() }));
}

export function clearModuleCache() {
  localStorage.removeItem(CACHE_KEY);
}

interface Props { module: string; children: React.ReactNode }

export default function ModuleGuard({ module, children }: Props) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      router.replace('/login');
      return;
    }
    const cached = getCached();
    if (cached) {
      if (cached.includes(module)) { setAllowed(true); }
      else { router.replace('/dashboard'); }
      return;
    }
    api.get<any>('/auth/my-modules')
      .then((r) => {
        const modules: string[] = r.data?.modules ?? [];
        setCache(modules);
        if (modules.includes(module)) { setAllowed(true); }
        else { router.replace('/dashboard'); }
      })
      .catch(() => router.replace('/dashboard'));
  }, [module]);

  if (allowed === null) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 rounded-full animate-spin"
          style={{ borderColor: '#e8f0fe', borderTopColor: '#1d6ae5' }} />
      </div>
    );
  }
  return <>{children}</>;
}
