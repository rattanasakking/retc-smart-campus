'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import MobileNav from '@/components/layout/MobileNav';
import { TOKEN_KEY } from '@/lib/api';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) router.replace('/login');
    else setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f5f8ff' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
               style={{ borderColor: '#1d6ae5', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: '#4a6080' }}>กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#f5f8ff' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden"
             onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — always visible on desktop, drawer on mobile */}
      <div className={[
        'fixed md:relative z-40 h-full transition-transform duration-200 ease-out md:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onHamburger={() => setSidebarOpen(true)} />
        {/* Extra bottom padding on mobile for bottom nav */}
        <main className="flex-1 overflow-y-auto p-4 md:p-5 pb-20 md:pb-5">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav />
    </div>
  );
}
