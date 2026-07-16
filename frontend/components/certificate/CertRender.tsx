'use client';
import { useEffect, useState } from 'react';

export interface CertTextCfg { show: boolean; x: number; y: number; fontSize: number; color: string; font: string; }
export interface CertQrCfg   { show: boolean; x: number; y: number; size: number; }
export interface CertSigCfg  { show: boolean; url: string; x: number; y: number; size: number; name: string; position: string; }
export interface CertTextSettings {
  name: CertTextCfg; pos: CertTextCfg; awd: CertTextCfg; cert: CertTextCfg; qr: CertQrCfg;
  signatures?: CertSigCfg[];
}
export interface CertValues { name: string; pos: string; awd: string; cert: string; }

export function qrUrl(text: string, size: number) {
  return `https://quickchart.io/qr?text=${encodeURIComponent(text)}&size=${Math.round(size)}`;
}
export function qrFallbackUrl(text: string, size: number) {
  return `https://chart.googleapis.com/chart?chs=${Math.round(size)}x${Math.round(size)}&cht=qr&chl=${encodeURIComponent(text)}`;
}

interface Props {
  templateUrl: string;
  ts: CertTextSettings;
  values: CertValues;
  verifyUrl?: string;
  className?: string;
}

const KEYS: (keyof CertValues)[] = ['name', 'pos', 'awd', 'cert'];

// ใช้ container-query units (cqw) เพื่อให้ข้อความ/QR ปรับขนาดตามความกว้างของกล่องอัตโนมัติ
// ทั้งบนหน้าจอและตอนพิมพ์ โดยไม่ต้องพึ่ง JavaScript scaling
export default function CertRender({ templateUrl, ts, values, verifyUrl, className = '' }: Props) {
  const [base, setBase] = useState({ w: 1122, h: 793 });

  useEffect(() => {
    if (!templateUrl) return;
    const img = new window.Image();
    img.onload = () => {
      if (!img.width) return;
      const ratio = img.height / img.width;
      if (ratio < 1) setBase({ w: 1122, h: Math.round(1122 * ratio) });
      else           setBase({ w: Math.round(1122 / ratio), h: 1122 });
    };
    img.src = templateUrl;
  }, [templateUrl]);

  const cqw = (px: number) => `${(px / base.w) * 100}cqw`;
  const isPlaceholder = values.name === '(เว้นว่างรอระบุชื่อ)';

  return (
    <div
      className={className}
      style={{
        position: 'relative', width: '100%', aspectRatio: `${base.w} / ${base.h}`,
        containerType: 'inline-size', backgroundColor: '#fff', overflow: 'hidden',
      } as React.CSSProperties}
    >
      {/* ใช้ <img> แทน CSS background เพื่อให้พื้นหลังแสดงตอนพิมพ์ PDF */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={templateUrl} alt="" aria-hidden
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', zIndex: 0 }} />

      {KEYS.map((k) => {
        const cfg = ts[k];
        const val = values[k];
        if (!cfg?.show || !val) return null;
        const ph = k === 'name' && isPlaceholder;
        return (
          <div key={k} style={{
            position: 'absolute', left: `${cfg.x}%`, top: `${cfg.y}%`, zIndex: 2,
            transform: 'translate(-50%, -50%)', whiteSpace: 'nowrap', lineHeight: 1.2,
            fontSize: cqw(cfg.fontSize), color: ph ? '#cbd5e1' : cfg.color,
            fontFamily: `'${cfg.font}', sans-serif`, fontWeight: ph ? 400 : 700,
          }}>
            {val}
          </div>
        );
      })}

      {(ts.signatures ?? []).map((sig, i) => (
        (sig.show && sig.url) ? (
          <div key={i} style={{
            position: 'absolute', left: `${sig.x}%`, top: `${sig.y}%`,
            transform: 'translate(-50%, -50%)', textAlign: 'center', zIndex: 3, width: cqw(sig.size),
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sig.url} alt="" style={{ width: '100%', display: 'block', margin: '0 auto' }} />
            {sig.name && <div style={{ fontSize: cqw(sig.size * 0.15), fontWeight: 700, color: '#1a2744', fontFamily: "'Sarabun',sans-serif", marginTop: '0.4cqw', whiteSpace: 'nowrap' }}>{sig.name}</div>}
            {sig.position && <div style={{ fontSize: cqw(sig.size * 0.13), color: '#1a2744', fontFamily: "'Sarabun',sans-serif", whiteSpace: 'nowrap' }}>{sig.position}</div>}
          </div>
        ) : null
      ))}

      {ts.qr?.show && values.cert && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrUrl(verifyUrl || values.cert, ts.qr.size)}
          onError={(e) => { const t = e.currentTarget; t.onerror = null; t.src = qrFallbackUrl(verifyUrl || values.cert, ts.qr.size); }}
          alt="QR"
          style={{
            position: 'absolute', left: `${ts.qr.x}%`, top: `${ts.qr.y}%`,
            width: cqw(ts.qr.size), height: cqw(ts.qr.size), transform: 'translate(-50%, -50%)',
            zIndex: 10, background: '#fff', padding: '0.4cqw',
          }}
        />
      )}
    </div>
  );
}

export const DEFAULT_TS: CertTextSettings = {
  name: { show: true,  x: 50, y: 45, fontSize: 30, color: '#000000', font: 'Prompt' },
  pos:  { show: false, x: 50, y: 55, fontSize: 22, color: '#000000', font: 'Prompt' },
  awd:  { show: false, x: 50, y: 65, fontSize: 25, color: '#000000', font: 'Prompt' },
  cert: { show: false, x: 85, y: 10, fontSize: 15, color: '#000000', font: 'Prompt' },
  qr:   { show: true,  x: 85, y: 80, size: 100 },
  signatures: [
    { show: false, url: '', x: 25, y: 82, size: 140, name: '', position: '' },
    { show: false, url: '', x: 50, y: 82, size: 140, name: '', position: '' },
    { show: false, url: '', x: 75, y: 82, size: 140, name: '', position: '' },
  ],
};

export const CERT_FONTS = ['Prompt', 'Sarabun', 'Kanit', 'Taviraj', 'Chakra Petch'];
