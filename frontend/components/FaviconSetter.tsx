'use client';
import { useEffect } from 'react';

// ตั้ง favicon จากโลโก้ที่อัปโหลดในระบบ (ตั้งค่าระบบ → โลโก้)
// ถ้ายังไม่ได้อัปโหลดโลโก้ จะใช้ไอคอนเริ่มต้น (app/icon.svg) แทน
export default function FaviconSetter() {
  useEffect(() => {
    fetch('/api/settings/logo')
      .then((r) => r.json())
      .then((j) => {
        const url: string | null = j?.data?.logo_url ?? null;
        if (!url) return;
        // ลบ icon links เดิม (รวมไอคอน SVG เริ่มต้นของ Next) แล้วใส่โลโก้แทน
        document.querySelectorAll("link[rel~='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']")
          .forEach((el) => el.parentNode?.removeChild(el));
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = url;
        document.head.appendChild(link);

        const apple = document.createElement('link');
        apple.rel = 'apple-touch-icon';
        apple.href = url;
        document.head.appendChild(apple);
      })
      .catch(() => { /* ใช้ไอคอนเริ่มต้น */ });
  }, []);
  return null;
}
