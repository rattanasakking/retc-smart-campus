import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RETC Smart Campus | วิทยาลัยเทคนิคร้อยเอ็ด',
  description: 'ระบบบริหารงานอัจฉริยะ วิทยาลัยเทคนิคร้อยเอ็ด',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;600;700&family=Kanit:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700&family=Taviraj:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
