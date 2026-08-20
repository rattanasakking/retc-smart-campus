// สร้าง PDF รายงานการปฏิบัติงานแบบแบ่งหน้าเอง (วาดลง canvas ด้วยฟอนต์ Sarabun แล้วใส่ jsPDF)
// ไม่ต้องพึ่ง html2canvas — ตัวอักษรไทยไม่เพี้ยนเพราะ canvas ใช้เว็บฟอนต์ที่โหลดไว้แล้ว

const MONTHS_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.getDate()} ${MONTHS_SHORT[dt.getMonth()]} ${dt.getFullYear() + 543}`;
}

export interface WlLog {
  id: number; logDate: string; title: string; detail: string | null;
  workType: { name: string; color: string; category: string } | null;
}
export interface WlUser {
  name: string; position: string | null; nationalId: string | null;
  division: { name: string } | null;
  workUnit: { name: string } | null;
  deptGroup: { name: string } | null;
  personnelType: { name: string } | null;
}
export interface WlData { user: WlUser; logs: WlLog[]; month: number; year: number }

interface Meta { schoolName: string; logoUrl: string; posLabel: (p: string | null | undefined) => string }

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function downloadWorklogPdf(data: WlData, meta: Meta) {
  const { jsPDF } = await import('jspdf');
  try { await (document as Document & { fonts?: FontFaceSet }).fonts?.ready; } catch { /* ignore */ }

  // A4 portrait
  const S = 2;                                   // scale เพื่อความคมชัด
  const pxPerMm = 3.7795 * S;
  const W = Math.round(210 * pxPerMm);           // ~1587
  const H = Math.round(297 * pxPerMm);           // ~2245
  const M = Math.round(15 * pxPerMm);            // ขอบ 15mm
  const CW = W - 2 * M;                           // ความกว้างพื้นที่เนื้อหา

  const NAVY = '#1a2744', SLATE = '#4a6080', GREY = '#94a3b8', LINE = '#c8d8f0';
  const font = (size: number, weight = 400) => `${weight} ${size}px Sarabun, 'Noto Sans Thai', sans-serif`;

  const logo = await loadImage(meta.logoUrl);

  // คอลัมน์: # | วันที่ | ประเภทงาน | หัวข้อ/รายละเอียด
  const cols = [0.06, 0.16, 0.24, 0.54].map((f) => f * CW);
  const colX = [M, M + cols[0], M + cols[0] + cols[1], M + cols[0] + cols[1] + cols[2]];
  const PAD = 8 * S;
  const lh = (size: number) => Math.round(size * 1.4);

  const pages: string[] = [];
  let canvas!: HTMLCanvasElement, ctx!: CanvasRenderingContext2D, y = 0;

  const startPage = () => {
    canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = 'top';
    y = M;
  };
  const endPage = () => pages.push(canvas.toDataURL('image/jpeg', 0.92));

  // ตัดข้อความเป็นบรรทัดแบบทีละอักษร (รองรับภาษาไทยที่ไม่มีเว้นวรรค)
  const wrap = (text: string, maxW: number, f: string): string[] => {
    if (!text) return [''];
    ctx.font = f;
    const lines: string[] = [];
    let cur = '';
    for (const ch of text) {
      if (ch === '\n') { lines.push(cur); cur = ''; continue; }
      const test = cur + ch;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = ch; }
      else cur = test;
    }
    lines.push(cur);
    return lines;
  };

  const FS = { school: 30, title: 36, sub: 26, info: 25, th: 23, td: 23, small: 20 };
  const FOOenter = 90 * S;   // เผื่อพื้นที่ท้ายหน้า

  // ── หัวกระดาษ (หน้าแรก) ──
  const drawDocHeader = () => {
    let tx = M;
    if (logo) {
      const size = 60 * S;
      ctx.drawImage(logo, M, y, size, size);
      tx = M + size + 12 * S;
    }
    const cx = (tx + (W - M)) / 2;
    ctx.textAlign = 'center';
    let ty = y;
    if (meta.schoolName) {
      ctx.fillStyle = NAVY; ctx.font = font(FS.school, 700);
      ctx.fillText(meta.schoolName, cx, ty); ty += lh(FS.school);
    }
    ctx.fillStyle = NAVY; ctx.font = font(FS.title, 700);
    ctx.fillText('แบบรายงานการปฏิบัติงานประจำเดือน', cx, ty); ty += lh(FS.title);
    ctx.fillStyle = SLATE; ctx.font = font(FS.sub, 400);
    ctx.fillText(`เดือน ${MONTHS_TH[data.month - 1]} พ.ศ. ${data.year}`, cx, ty); ty += lh(FS.sub);
    ctx.textAlign = 'left';
    y = Math.max(ty, y + (logo ? 60 * S : 0)) + 10 * S;
    ctx.strokeStyle = NAVY; ctx.lineWidth = 2 * S;
    ctx.beginPath(); ctx.moveTo(M, y); ctx.lineTo(W - M, y); ctx.stroke();
    y += 18 * S;
  };

  // ── ข้อมูลผู้รายงาน (2 คอลัมน์) ──
  const drawUserInfo = () => {
    const rows: [string, string][] = [
      ['ชื่อ-สกุล', data.user.name || '—'],
      ['เลขบัตรประชาชน', data.user.nationalId ?? '—'],
      ['ตำแหน่ง', meta.posLabel(data.user.position) || '—'],
      ['ประเภทบุคลากร', data.user.personnelType?.name ?? '—'],
    ];
    if (data.user.division)  rows.push(['ฝ่าย', data.user.division.name]);
    if (data.user.workUnit)  rows.push(['งาน', data.user.workUnit.name]);
    if (data.user.deptGroup) rows.push(['แผนก', data.user.deptGroup.name]);

    const colW = CW / 2;
    const labelW = 34 * S * 3.2;
    ctx.font = font(FS.info, 400);
    for (let i = 0; i < rows.length; i += 2) {
      const rowY = y;
      for (let c = 0; c < 2 && i + c < rows.length; c++) {
        const [label, value] = rows[i + c];
        const x = M + c * colW;
        ctx.fillStyle = SLATE; ctx.font = font(FS.info, 600);
        ctx.fillText(label, x, rowY);
        ctx.fillStyle = NAVY; ctx.font = font(FS.info, 400);
        ctx.fillText(`: ${value}`, x + labelW, rowY);
      }
      y = rowY + lh(FS.info);
    }
    y += 12 * S;
  };

  // ── หัวตาราง ──
  const headers = ['#', 'วันที่', 'ประเภทงาน', 'หัวข้อ/รายละเอียด'];
  const drawTableHead = () => {
    const rowH = lh(FS.th) + PAD;
    ctx.fillStyle = NAVY; ctx.fillRect(M, y, CW, rowH);
    ctx.fillStyle = '#ffffff'; ctx.font = font(FS.th, 600);
    ctx.textAlign = 'left';
    headers.forEach((h, i) => ctx.fillText(h, colX[i] + PAD, y + PAD / 2 + 2 * S));
    // เส้นแบ่งคอลัมน์บนหัว
    ctx.strokeStyle = LINE; ctx.lineWidth = 1 * S;
    ctx.strokeRect(M, y, CW, rowH);
    y += rowH;
  };

  // ── วัดความสูงแถว ──
  const measureRow = (l: WlLog) => {
    const typeLines = l.workType ? (1 + wrap(l.workType.name, cols[2] - 2 * PAD, font(FS.td, 500)).length) : 1;
    const titleLines = wrap(l.title, cols[3] - 2 * PAD, font(FS.td, 500)).length
      + (l.detail ? wrap(l.detail, cols[3] - 2 * PAD, font(FS.small, 400)).length : 0);
    const maxLines = Math.max(typeLines, titleLines, 1);
    return maxLines * lh(FS.td) + PAD;
  };

  const drawRow = (l: WlLog, idx: number, rowH: number) => {
    // zebra
    if (idx % 2 === 1) { ctx.fillStyle = '#f8faff'; ctx.fillRect(M, y, CW, rowH); }
    ctx.strokeStyle = '#dce6f9'; ctx.lineWidth = 1 * S;
    ctx.strokeRect(M, y, CW, rowH);
    // เส้นแบ่งคอลัมน์
    for (let i = 1; i < colX.length; i++) { ctx.beginPath(); ctx.moveTo(colX[i], y); ctx.lineTo(colX[i], y + rowH); ctx.stroke(); }

    const top = y + PAD / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = GREY; ctx.font = font(FS.small, 400);
    ctx.fillText(String(idx + 1), colX[0] + cols[0] / 2, top);

    ctx.textAlign = 'left';
    ctx.fillStyle = SLATE; ctx.font = font(FS.td, 400);
    ctx.fillText(fmtDate(l.logDate), colX[1] + PAD, top);

    // ประเภทงาน
    let ty = top;
    if (l.workType) {
      ctx.fillStyle = GREY; ctx.font = font(FS.small, 400);
      ctx.fillText(l.workType.category, colX[2] + PAD, ty); ty += lh(FS.small);
      ctx.fillStyle = l.workType.color || NAVY; ctx.font = font(FS.td, 600);
      for (const ln of wrap(l.workType.name, cols[2] - 2 * PAD, font(FS.td, 600))) { ctx.fillText(ln, colX[2] + PAD, ty); ty += lh(FS.td); }
    }

    // หัวข้อ + รายละเอียด
    let yy = top;
    ctx.fillStyle = NAVY; ctx.font = font(FS.td, 500);
    for (const ln of wrap(l.title, cols[3] - 2 * PAD, font(FS.td, 500))) { ctx.fillText(ln, colX[3] + PAD, yy); yy += lh(FS.td); }
    if (l.detail) {
      ctx.fillStyle = GREY; ctx.font = font(FS.small, 400);
      for (const ln of wrap(l.detail, cols[3] - 2 * PAD, font(FS.small, 400))) { ctx.fillText(ln, colX[3] + PAD, yy); yy += lh(FS.small); }
    }
    y += rowH;
  };

  // ── ช่องลายเซ็น ──
  const drawSignatures = () => {
    const need = 150 * S;
    if (y + need > H - M) { endPage(); startPage(); }
    y += 30 * S;
    const boxW = CW / 3;
    const titles = ['ผู้รายงาน', 'หัวหน้างาน / ผู้ตรวจ', 'ผู้บริหาร / ผู้อนุมัติ'];
    const names = [data.user.name, '(......................................................)', '(......................................................)'];
    const positions = [meta.posLabel(data.user.position), 'ตำแหน่ง ..............................', 'ตำแหน่ง ..............................'];
    ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      const cx = M + boxW * i + boxW / 2;
      let sy = y;
      ctx.fillStyle = SLATE; ctx.font = font(FS.small, 600);
      ctx.fillText(titles[i], cx, sy); sy += lh(FS.small) + 46 * S;
      ctx.strokeStyle = NAVY; ctx.lineWidth = 1 * S;
      ctx.beginPath(); ctx.moveTo(cx - boxW / 2 + 20 * S, sy); ctx.lineTo(cx + boxW / 2 - 20 * S, sy); ctx.stroke();
      sy += 6 * S;
      ctx.fillStyle = NAVY; ctx.font = font(FS.small, 500);
      ctx.fillText(names[i] || '(......................................................)', cx, sy); sy += lh(FS.small);
      ctx.fillStyle = GREY; ctx.font = font(FS.small, 400);
      ctx.fillText(positions[i] || 'ตำแหน่ง ..............................', cx, sy); sy += lh(FS.small);
      ctx.fillText('วันที่ ...... / ...... / ......', cx, sy);
    }
    ctx.textAlign = 'left';
    y += need;
  };

  // ── สร้างเอกสาร ──
  startPage();
  drawDocHeader();
  drawUserInfo();
  drawTableHead();
  data.logs.forEach((l, idx) => {
    const rowH = measureRow(l);
    if (y + rowH > H - FOOenter) { endPage(); startPage(); drawTableHead(); }
    drawRow(l, idx, rowH);
  });
  drawSignatures();

  // footer หน้าสุดท้าย
  ctx.textAlign = 'center';
  ctx.fillStyle = GREY; ctx.font = font(FS.small, 400);
  ctx.fillText(`พิมพ์เมื่อวันที่ ${fmtDate(new Date().toISOString())} — ระบบ Smart Campus ${meta.schoolName}`, W / 2, H - M - lh(FS.small));
  ctx.textAlign = 'left';
  endPage();

  // ── ประกอบ PDF ──
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  pages.forEach((dataUrl, i) => {
    if (i > 0) pdf.addPage();
    pdf.addImage(dataUrl, 'JPEG', 0, 0, 210, 297);
  });
  const fname = `รายงานปฏิบัติงาน_${data.user.name}_${MONTHS_TH[data.month - 1]}${data.year}.pdf`;
  pdf.save(fname);
}
