// ย่อรูปในเบราว์เซอร์ก่อนอัปโหลด — ตัดกึ่งกลางเป็นสี่เหลี่ยมจัตุรัส แล้วย่อเหลือ size×size
// ได้ไฟล์เล็ก (ส่วนใหญ่ < 100 KB) และเป็น JPEG/PNG เสมอ แม้ต้นฉบับจะเป็นชนิดอื่นที่เบราว์เซอร์เปิดได้
export function resizeSquareImage(file: File, size = 400, type: 'image/jpeg' | 'image/png' = 'image/jpeg'): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(img.width, img.height);
      const out = Math.min(size, s); // ไม่ขยายรูปเล็กให้ใหญ่ขึ้น
      const canvas = document.createElement('canvas');
      canvas.width = out; canvas.height = out;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); return reject(new Error('canvas')); }
      if (type === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, out, out); } // พื้นหลังโปร่งใส → ขาว
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, out, out);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL(type, 0.88));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('ไม่สามารถอ่านไฟล์รูปได้')); };
    img.src = url;
  });
}
