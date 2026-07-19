import type { CertTextSettings, CertValues } from '@/components/certificate/CertRender';

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('load image failed: ' + src));
    img.src = src;
  });
}

const TEXT_KEYS: (keyof CertValues)[] = ['name', 'pos', 'awd', 'cert'];

// เรนเดอร์เกียรติบัตรลง canvas (ความละเอียดสูง) — ใช้ต่อได้ทั้ง PNG และ PDF
async function renderCertCanvas(
  templateUrl: string, ts: CertTextSettings, values: CertValues, verifyUrl: string,
): Promise<{ canvas: HTMLCanvasElement; w: number; h: number }> {
  const tpl = await loadImg(templateUrl);

  // base coordinate เดียวกับที่ CertRender ใช้ (fontSize/QR อ้างอิงจากฐานนี้)
  const ratio = tpl.naturalHeight / tpl.naturalWidth;
  let w = 1122, h = 793;
  if (ratio < 1) { w = 1122; h = Math.round(1122 * ratio); }
  else           { h = 1122; w = Math.round(1122 / ratio); }

  const DPR = 2; // เพิ่มความคมชัด
  const canvas = document.createElement('canvas');
  canvas.width = w * DPR;
  canvas.height = h * DPR;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas ไม่รองรับ');
  ctx.scale(DPR, DPR);

  ctx.drawImage(tpl, 0, 0, w, h);

  // โหลดฟอนต์ก่อนวาดข้อความ
  try {
    const fonts = new Set<string>(['Sarabun']);
    TEXT_KEYS.forEach((k) => fonts.add(ts[k].font));
    await Promise.all(Array.from(fonts).map((f) => (document as unknown as { fonts: FontFaceSet }).fonts.load(`bold 40px '${f}'`)));
    await (document as unknown as { fonts: FontFaceSet }).fonts.ready;
  } catch { /* ใช้ฟอนต์สำรอง */ }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const k of TEXT_KEYS) {
    const cfg = ts[k];
    const val = values[k];
    if (!cfg.show || !val) continue;
    ctx.font = `bold ${cfg.fontSize}px '${cfg.font}', sans-serif`;
    ctx.fillStyle = cfg.color;
    ctx.fillText(val, (cfg.x / 100) * w, (cfg.y / 100) * h);
  }

  // ลายเซ็น
  for (const sig of (ts.signatures ?? [])) {
    if (!sig.show || !sig.url) continue;
    try {
      const img = await loadImg(sig.url);
      const iw = sig.size;
      const ih = img.naturalWidth ? iw * (img.naturalHeight / img.naturalWidth) : iw * 0.5;
      const nameH = sig.name ? sig.size * 0.15 * 1.35 : 0;
      const posH  = sig.position ? sig.size * 0.13 * 1.35 : 0;
      const blockH = ih + nameH + posH;
      const cx = (sig.x / 100) * w;
      const top = (sig.y / 100) * h - blockH / 2;
      ctx.drawImage(img, cx - iw / 2, top, iw, ih);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#1a2744';
      let ty = top + ih;
      if (sig.name) { ctx.font = `bold ${sig.size * 0.15}px 'Sarabun', sans-serif`; ctx.fillText(sig.name, cx, ty); ty += nameH; }
      if (sig.position) { ctx.font = `${sig.size * 0.13}px 'Sarabun', sans-serif`; ctx.fillText(sig.position, cx, ty); }
    } catch { /* ข้ามลายเซ็นถ้าโหลดไม่ได้ */ }
  }

  if (ts.qr.show && values.cert) {
    try {
      const qr = await loadImg(`/api/certificate/qr?text=${encodeURIComponent(verifyUrl || values.cert)}&size=${Math.round(ts.qr.size * DPR)}`);
      const s = ts.qr.size;
      const qx = (ts.qr.x / 100) * w - s / 2;
      const qy = (ts.qr.y / 100) * h - s / 2;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(qx, qy, s, s);
      ctx.drawImage(qr, qx, qy, s, s);
    } catch { /* ข้าม QR ถ้าโหลดไม่ได้ */ }
  }

  return { canvas, w, h };
}

// เรนเดอร์เป็น PNG Blob
export async function certToPngBlob(
  templateUrl: string, ts: CertTextSettings, values: CertValues, verifyUrl: string,
): Promise<Blob> {
  const { canvas } = await renderCertCanvas(templateUrl, ts, values, verifyUrl);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('สร้างรูปภาพไม่สำเร็จ'))), 'image/png', 0.95));
}

export interface CertPdfInput {
  templateUrl: string; ts: CertTextSettings; values: CertValues; verifyUrl: string;
}

// รวมเกียรติบัตรหลายใบเป็นไฟล์ PDF เดียว แล้วดาวน์โหลด (แต่ละใบ = 1 หน้า ขนาดพอดีเกียรติบัตร)
export async function downloadCertsPdf(filename: string, inputs: CertPdfInput[]): Promise<void> {
  if (inputs.length === 0) return;
  const { jsPDF } = await import('jspdf');
  let pdf: import('jspdf').jsPDF | null = null;
  for (const inp of inputs) {
    const { canvas, w, h } = await renderCertCanvas(inp.templateUrl, inp.ts, inp.values, inp.verifyUrl);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const orientation = w >= h ? 'l' : 'p';
    if (!pdf) pdf = new jsPDF({ orientation, unit: 'px', format: [w, h], compress: true });
    else pdf.addPage([w, h], orientation);
    pdf.addImage(dataUrl, 'JPEG', 0, 0, w, h);
  }
  pdf!.save(filename.replace(/[\\/:*?"<>|]+/g, '_') + '.pdf');
}

export async function downloadCertImage(
  filename: string, templateUrl: string, ts: CertTextSettings, values: CertValues, verifyUrl: string,
): Promise<void> {
  const blob = await certToPngBlob(templateUrl, ts, values, verifyUrl);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/[\\/:*?"<>|]+/g, '_') + '.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
