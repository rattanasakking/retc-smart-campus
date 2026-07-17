'use client';
import { useEffect } from 'react';

// ตั้ง favicon จากโลโก้ที่อัปโหลดในระบบ (ตั้งค่าระบบ → โลโก้)
// สำคัญ: ต้อง "เพิ่ม" link ใหม่เท่านั้น ห้ามลบ/แก้ <link> ที่ Next เป็นเจ้าของ
// (ถ้าไปลบของ Next จะทำให้เกิด client-side exception ตอนเปลี่ยนหน้า)
export default function FaviconSetter() {
  useEffect(() => {
    const added: HTMLLinkElement[] = [];
    fetch('/api/settings/logo')
      .then((r) => r.json())
      .then((j) => {
        const url: string | null = j?.data?.logo_url ?? null;
        if (!url) return;
        // ลบเฉพาะ link ที่คอมโพเนนต์นี้เคยเพิ่มไว้เอง (ไม่ยุ่งกับของ Next)
        document.querySelectorAll('link[data-app-favicon]').forEach((el) => el.remove());
        for (const rel of ['icon', 'apple-touch-icon']) {
          const link = document.createElement('link');
          link.rel = rel;
          link.href = url;
          link.setAttribute('data-app-favicon', '');
          document.head.appendChild(link);
          added.push(link);
        }
      })
      .catch(() => { /* ใช้ไอคอนเริ่มต้น app/icon.svg */ });
    return () => { added.forEach((l) => l.remove()); };
  }, []);
  return null;
}
