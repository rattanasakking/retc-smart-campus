'use client';
import { useRouter } from 'next/navigation';
import { QrCode } from 'lucide-react';

export default function ScanPage() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
           style={{ backgroundColor: '#eff4ff' }}>
        <QrCode className="w-10 h-10 text-[#1d6ae5]" />
      </div>
      <h1 className="text-xl font-bold text-[#1a2744]">สแกน QR Code</h1>
      <p className="text-sm text-[#4a6080] text-center max-w-xs">
        ใช้ฟีเจอร์นี้เพื่อสแกน QR Code ของครุภัณฑ์เพื่อดูข้อมูลหรือแจ้งซ่อม
      </p>
      <button onClick={() => router.push('/equipment')} className="btn-primary mt-2">
        ไปที่ครุภัณฑ์
      </button>
    </div>
  );
}
